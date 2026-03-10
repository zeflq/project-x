# Review Guidelines

## Always flag
- `fetch` calls missing `res.ok` check before calling `.json()`
- `fetch` calls not wrapped in `try/catch`
- Functions using `Promise<any>` as return type — require an explicit interface
- Hardcoded base URLs — must use `API_BASE_URL` environment variable
- API endpoints not versioned under `/api/v1/`
- New functions named `getData`, `doStuff`, or other generic names

## Skip
- Formatting-only changes
- Changes inside `pi-review.md`
