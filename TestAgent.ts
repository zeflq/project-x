/**
 * Multi-agent server on top of the pi coding-agent SDK.
 *
 * - One shared ModelRuntime (API keys / auth loaded once)
 * - AgentManager: registry of live sessions, keyed by agentId
 * - Each agent = its own AgentSession (own system prompt, tools, cwd, history)
 * - Per-agent prompt queue (a session handles one prompt at a time),
 *   but different agents run in parallel
 * - One WebSocket per browser tab, multiplexed by agentId
 * - Idle agents are disposed after a TTL
 *
 *   npm i ws @earendil-works/pi-ai @earendil-works/pi-coding-agent
 */
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { getModel } from "@earendil-works/pi-ai/compat";
import {
	createAgentSession,
	createExtensionRuntime,
	ModelRuntime,
	type ResourceLoader,
	SessionManager,
	SettingsManager,
} from "@earendil-works/pi-coding-agent";

// ---------------------------------------------------------------------------
// 1. Agent definitions ("roles"). The frontend picks one of these by type.
// ---------------------------------------------------------------------------
type AgentType = "coder" | "reviewer" | "planner";

interface AgentDefinition {
	systemPrompt: string;
	tools: string[];
	provider: string;
	modelId: string;
	thinkingLevel: "off" | "low" | "medium" | "high";
}

const DEFINITIONS: Record<AgentType, AgentDefinition> = {
	coder: {
		systemPrompt: "You are a coding agent. Make minimal, correct changes.",
		tools: ["read", "bash", "edit", "write"],
		provider: "anthropic",
		modelId: "claude-sonnet-4-5",
		thinkingLevel: "low",
	},
	reviewer: {
		systemPrompt: "You review code. Read only, never modify files.",
		tools: ["read"],
		provider: "anthropic",
		modelId: "claude-sonnet-4-5",
		thinkingLevel: "off",
	},
	planner: {
		systemPrompt: "You break tasks into steps. Be concise.",
		tools: ["read"],
		provider: "anthropic",
		modelId: "claude-sonnet-4-5",
		thinkingLevel: "medium",
	},
};

const ROOT = process.env.AGENT_ROOT ?? "/tmp/agents";
const IDLE_TTL_MS = 30 * 60_000;

// ---------------------------------------------------------------------------
// 2. Shared runtime (created once per process)
// ---------------------------------------------------------------------------
const modelRuntime = await ModelRuntime.create({
	authPath: path.join(ROOT, "auth.json"),
	modelsPath: path.join(ROOT, "models.json"),
});
if (process.env.ANTHROPIC_API_KEY) {
	await modelRuntime.setRuntimeApiKey("anthropic", process.env.ANTHROPIC_API_KEY);
}

function makeResourceLoader(systemPrompt: string): ResourceLoader {
	return {
		getExtensions: () => ({ extensions: [], errors: [], runtime: createExtensionRuntime() }),
		getSkills: () => ({ skills: [], diagnostics: [] }),
		getPrompts: () => ({ prompts: [], diagnostics: [] }),
		getThemes: () => ({ themes: [], diagnostics: [] }),
		getAgentsFiles: () => ({ agentsFiles: [] }),
		getSystemPrompt: () => systemPrompt,
		getSystemPromptSource: () => undefined,
		getAppendSystemPrompt: () => [],
		getAppendSystemPromptSources: () => [],
		extendResources: () => {},
		reload: async () => {},
	};
}

// ---------------------------------------------------------------------------
// 3. AgentManager
// ---------------------------------------------------------------------------
type Session = Awaited<ReturnType<typeof createAgentSession>>["session"];

interface ManagedAgent {
	id: string;
	ownerId: string;
	type: AgentType;
	session: Session;
	queue: Promise<void>; // serialises prompts for this agent
	busy: boolean;
	listeners: Set<(event: unknown) => void>;
	unsubscribe: () => void;
	lastUsed: number;
}

class AgentManager {
	private agents = new Map<string, ManagedAgent>();

	constructor() {
		setInterval(() => this.reapIdle(), 60_000).unref();
	}

	async create(ownerId: string, type: AgentType): Promise<ManagedAgent> {
		const def = DEFINITIONS[type];
		if (!def) throw new Error(`Unknown agent type: ${type}`);

		const id = randomUUID();
		// Isolated working dir per agent. Agents of the same user that must
		// share files could use a per-user dir instead.
		const cwd = path.join(ROOT, "work", ownerId, id);
		const agentDir = path.join(ROOT, "agent", id);
		mkdirSync(cwd, { recursive: true });
		mkdirSync(agentDir, { recursive: true });

		const model = getModel(def.provider as any, def.modelId as any);
		if (!model) throw new Error(`Model not found: ${def.modelId}`);

		const { session } = await createAgentSession({
			cwd,
			agentDir,
			model,
			thinkingLevel: def.thinkingLevel,
			modelRuntime,
			resourceLoader: makeResourceLoader(def.systemPrompt),
			tools: def.tools,
			sessionManager: SessionManager.inMemory(cwd),
			settingsManager: SettingsManager.inMemory({
				compaction: { enabled: true },
				retry: { enabled: true, maxRetries: 2 },
			}),
		});

		const agent: ManagedAgent = {
			id,
			ownerId,
			type,
			session,
			queue: Promise.resolve(),
			busy: false,
			listeners: new Set(),
			unsubscribe: () => {},
			lastUsed: Date.now(),
		};

		// One SDK subscription per agent, fanned out to every connected tab.
		const unsub = session.subscribe((event) => {
			for (const l of agent.listeners) l(event);
		});
		agent.unsubscribe = typeof unsub === "function" ? unsub : () => {};

		this.agents.set(id, agent);
		return agent;
	}

	get(id: string, ownerId: string): ManagedAgent {
		const a = this.agents.get(id);
		if (!a || a.ownerId !== ownerId) throw new Error("Agent not found");
		return a;
	}

	list(ownerId: string) {
		return [...this.agents.values()]
			.filter((a) => a.ownerId === ownerId)
			.map((a) => ({ id: a.id, type: a.type, busy: a.busy }));
	}

	/** Queue a prompt; resolves when this agent finishes it. */
	prompt(agent: ManagedAgent, text: string): Promise<void> {
		agent.lastUsed = Date.now();
		const run = agent.queue.then(async () => {
			agent.busy = true;
			try {
				await agent.session.prompt(text);
			} finally {
				agent.busy = false;
				agent.lastUsed = Date.now();
			}
		});
		agent.queue = run.catch(() => {}); // keep the chain alive after errors
		return run;
	}

	abort(agent: ManagedAgent) {
		// Check the SDK for the exact cancel method name on AgentSession.
		(agent.session as any).abort?.();
	}

	dispose(id: string) {
		const a = this.agents.get(id);
		if (!a) return;
		a.unsubscribe();
		a.session.dispose();
		this.agents.delete(id);
	}

	private reapIdle() {
		const now = Date.now();
		for (const a of this.agents.values()) {
			if (!a.busy && a.listeners.size === 0 && now - a.lastUsed > IDLE_TTL_MS) {
				this.dispose(a.id);
			}
		}
	}
}

const manager = new AgentManager();

// ---------------------------------------------------------------------------
// 4. WebSocket protocol (one socket, many agents)
//
// client -> server
//   { op: "create",  reqId, agentType }
//   { op: "list",    reqId }
//   { op: "attach",  reqId, agentId }       start receiving its events
//   { op: "prompt",  reqId, agentId, text }
//   { op: "abort",   reqId, agentId }
//   { op: "dispose", reqId, agentId }
//
// server -> client
//   { type: "reply", reqId, ok, data?, error? }
//   { type: "event", agentId, event }        raw SDK event, tagged
//   { type: "done",  agentId }               prompt finished
// ---------------------------------------------------------------------------
const wss = new WebSocketServer({ port: Number(process.env.PORT ?? 8787) });

wss.on("connection", (ws: WebSocket, req) => {
	// Replace with real auth (cookie / JWT). ownerId scopes all agents.
	const ownerId = new URL(req.url ?? "/", "http://x").searchParams.get("user") ?? "anon";
	const attached = new Map<string, (e: unknown) => void>();

	const send = (msg: object) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(msg));

	const attach = (agent: ManagedAgent) => {
		if (attached.has(agent.id)) return;
		const l = (event: unknown) => send({ type: "event", agentId: agent.id, event });
		agent.listeners.add(l);
		attached.set(agent.id, l);
	};

	ws.on("message", async (raw) => {
		let msg: any;
		try {
			msg = JSON.parse(String(raw));
		} catch {
			return;
		}
		const reply = (data?: unknown) => send({ type: "reply", reqId: msg.reqId, ok: true, data });
		const fail = (e: unknown) =>
			send({ type: "reply", reqId: msg.reqId, ok: false, error: String((e as Error)?.message ?? e) });

		try {
			switch (msg.op) {
				case "create": {
					const a = await manager.create(ownerId, msg.agentType);
					attach(a);
					return reply({ id: a.id, type: a.type });
				}
				case "list":
					return reply(manager.list(ownerId));
				case "attach":
					attach(manager.get(msg.agentId, ownerId));
					return reply();
				case "prompt": {
					const a = manager.get(msg.agentId, ownerId);
					attach(a);
					reply({ queued: a.busy });
					// Not awaited by the socket loop: other agents keep streaming.
					manager
						.prompt(a, msg.text)
						.then(() => send({ type: "done", agentId: a.id }))
						.catch((e) => send({ type: "event", agentId: a.id, event: { type: "error", message: String(e) } }));
					return;
				}
				case "abort":
					manager.abort(manager.get(msg.agentId, ownerId));
					return reply();
				case "dispose":
					manager.get(msg.agentId, ownerId);
					manager.dispose(msg.agentId);
					return reply();
				default:
					return fail(`Unknown op: ${msg.op}`);
			}
		} catch (e) {
			fail(e);
		}
	});

	ws.on("close", () => {
		// Detach only; agents keep running and can be re-attached on reconnect.
		for (const [id, l] of attached) {
			try {
				manager.get(id, ownerId).listeners.delete(l);
			} catch {}
		}
	});
});

console.log("agent server on ws://localhost:" + (process.env.PORT ?? 8787));
