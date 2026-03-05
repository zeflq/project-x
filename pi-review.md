# Pi Review — feature/order-service vs origin/main

> 2026-03-05 22:06:57

---

{
  "summary": "- **High**: API calls in `getData`, `handleCancel`, and `fetchOrderById` do not check `res.ok` (or otherwise handle non-2xx responses), which can cause silent failures and hard-to-debug runtime behavior.\n- **Medium**: `res.json()` is returned directly without validation/casting safeguards. This weakens type safety because runtime payloads may not match `Order[]` / `Order` even though the function signatures say they do.\n- **Medium**: `userId` is interpolated directly into the query string in `getData`; use `encodeURIComponent(userId)` (or `URLSearchParams`) to avoid malformed URLs and query injection edge cases.\n- **Low**: Naming convention drift:\n  - `getData` is too generic and does not follow the async fetch naming guidance.\n  - `checkRefund` should use a boolean-style prefix (`is`/`has`/`can`).\n  - `handleCancel` is an unclear mutation name.\n- **Low**: `src/api.ts` adds `formatDatee`, which appears to be a typo/duplicate of `formatDate` and risks accidental API surface expansion.",
  "comments": [
    {
      "file": "src/api.ts",
      "line": 12,
      "side": "RIGHT",
      "body": "This looks like an accidental duplicate/typo of `formatDate` (`formatDatee`). If unintentional, it should be removed to avoid exposing a confusing extra API."
    },
    {
      "file": "src/order-service.ts",
      "line": 10,
      "side": "RIGHT",
      "body": "`getData` is too generic and does not follow the project naming convention for async fetchers. A name like `fetchOrders` / `fetchUserOrders` would better reflect intent."
    },
    {
      "file": "src/order-service.ts",
      "line": 11,
      "side": "RIGHT",
      "body": "Please avoid interpolating raw `userId` into the URL. Use `encodeURIComponent(userId)` (or `URLSearchParams`) to prevent malformed query strings and injection-like edge cases."
    },
    {
      "file": "src/order-service.ts",
      "line": 12,
      "side": "RIGHT",
      "body": "Consider checking `res.ok` before parsing JSON and handling error responses explicitly. Returning `res.json()` directly can silently propagate failed HTTP responses."
    },
    {
      "file": "src/order-service.ts",
      "line": 16,
      "side": "RIGHT",
      "body": "Boolean-returning functions should use an `is`/`has`/`can` prefix per conventions (e.g. `isEligibleForRefund`)."
    },
    {
      "file": "src/order-service.ts",
      "line": 21,
      "side": "RIGHT",
      "body": "`handleCancel` is unclear for a mutating action and doesn’t follow the expected verb-style naming. Consider `cancelOrder` and add response status handling (`res.ok`) for failure visibility."
    },
    {
      "file": "src/order-service.ts",
      "line": 28,
      "side": "RIGHT",
      "body": "Same concern here: check `res.ok` and handle invalid payloads. The declared return type is `Order`, but `res.json()` is unvalidated at runtime."
    }
  ]
}
