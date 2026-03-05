# Project Conventions

## Function Naming

- Use **camelCase** for all functions and methods
- Prefix async functions that fetch remote data with `fetch` (e.g. `fetchUserProfile`, `fetchOrders`)
- Prefix boolean-returning functions with `is`, `has`, or `can` (e.g. `isAdmin`, `hasPermission`, `canDelete`)
- Prefix functions that mutate state with a verb: `update`, `delete`, `create`, `reset`
- Avoid generic names like `getData`, `doStuff`, `handleThing` — names must describe intent
