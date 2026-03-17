# API Instructions

## Response Handling

- Always check `res.ok` before calling `.json()` — throw an error if the response is not OK
- Never use `any` as a return type for API functions — define an explicit interface or type
- Always handle network errors with try/catch around `fetch` calls

## Example

```ts
interface User {
  id: number;
  name: string;
}

export async function fetchUser(id: number): Promise<User> {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<User>;
  } catch (err) {
    throw new Error(`fetchUser failed: ${err}`);
  }
}
```

## Endpoints

- All endpoints must be versioned: `/api/v1/...`
- Never hardcode base URLs — use an environment variable (`API_BASE_URL`)
