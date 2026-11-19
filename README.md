# API Monitor — Request Studio Frontend v1.3

## What changed

Exactly five frontend source files are included. Overlay these onto the existing project. All others (including RequestForm.jsx, Requests.jsx and AuthContext.jsx) remain unchanged.

- `frontend/src/App.jsx` — protected nested Request Studio route.
- `frontend/src/pages/ProjectRequests.jsx` — passes workspace/project IDs to RequestTable.
- `frontend/src/components/requests/RequestTable.jsx` — visible Studio link per saved Request; Edit/Delete are retained.
- `frontend/src/services/requestApi.js` — `requestStudioPath()` and `execute()` using existing `apiFetch` JWT refresh mechanism.
- `frontend/src/pages/RequestStudio.jsx` — new: saved Request details, editable name/method/URL, Params, encrypted headers/body replacement, Send, result, assertion outcomes.

The ZIP also contains `tests/request-api.test.mjs` (standalone API client unit tests). Do **not** copy the `tests` folder into the frontend `src` folder.

## Requirements

Backend v1.2 running with the POST `/:requestId/execute` route from Execution v1.1. Frontend React Router imports from `react-router`, existing Tailwind class names, installed `lucide-react`. No new packages or database migrations.

**Important v1.2 semantics:** GET Request intentionally returns `headers:null`, `body:null`, URL query hidden, `hasHeaders`, `hasBody`, `hasQuery`. Studio never decrypts or reads secrets. Header editing is whole-object replacement (`PATCH headers:{...}`); clearing via `{}` results in an encrypted empty object, which can still report `hasHeaders:true`. Body clearing uses `PATCH body:null`.

Execution POST has an empty JSON body `{}`. It **always executes the saved Request**, not an unsaved draft, and Studio blocks Send when changes are pending. The result is the *current* execution only; the backend intentionally masks response body and sensitive response headers. Assertions are shown only from the Execute response; management/history endpoints are not available yet.

## Installation

1. Stop frontend. Make a copy of the five files listed above if they already exist.
2. Extract the ZIP and copy its `frontend/src/...` files to `D:\wordspace\Project API Monitor\frontend\src\...`, keeping directories. Do not replace other files or `.env`.
3. In `D:\wordspace\Project API Monitor\frontend`, run `npm run build` then `npm run dev`.
4. Backend should remain running separately (`npm run dev` in `backend`), with key configured.
5. Optional quick checks from extracted ZIP root: `node --test tests/request-api.test.mjs`.

## Detailed manual testing — where to click and see actual results

Use **one safe demo Request**; never put real passwords, JWT, API keys or personal data into test endpoints.

| TC | Exact actions | Where to inspect results | Expected |
|---|---|---|---|
| ST01 | API Monitor `http://localhost:5173` > API Requests > choose Workspace/Project > Open API Library > click `Studio` in Execution Test row | Browser URL and Studio title | URL ends `/requests/<requestId>`, correct saved name/method/URL |
| ST02 | Studio > change Name only > click `Save Changes` | Green notice, reload page, API Library row | Name saved, old URL/method preserved |
| ST03 | Studio > enter URL `https://jsonplaceholder.typicode.com/todos/1` > Save Changes > click Send | Studio **Execution Result** (below settings), Chrome F12 Network POST `/execute` Response | API Monitor HTTP 200, `statusCode:200`, `isSuccess:true`, latency and execution ID |
| ST04 | Studio > change URL to `https://httpbin.org/status/404` > Save Changes > Send | Execution Result | `statusCode:404`, `isSuccess:false` if no assertions |
| ST05 | Studio > change URL to `http://127.0.0.1:3000` > Save Changes > Send | Red alert in Studio; Chrome F12 Network POST `/execute` Response | API error HTTP 422 with `UNSAFE_TARGET`. Restore a public HTTPS URL after the test. |
| ST06 | Studio > Headers tab > choose Replace ALL > paste JSON `{"Authorization":"Bearer DEMO_SECRET"}` > Save Changes | Studio Headers tab after saving; Thunder Client GET request `/requests/<id>` Response; Prisma Studio `ApiRequest.headers` | `hasHeaders:true`, actual secret not returned by GET; DB encrypted. Values in editor cleared after save. |
| ST07 | Studio > Body tab > Replace > type `DEMO_BODY` > Save Changes > then choose Remove saved body > Save Changes | Thunder Client GET request `/requests/<id>` Response; Prisma Studio `ApiRequest.body` | First `hasBody:true`; after clearing `hasBody:false` and DB body null |
| ST08 | API Monitor > API Requests > Edit test Request > URL `https://jsonplaceholder.typicode.com/todos/1?api_key=TEST_SECRET` > Save > Studio | Studio Params tab and GET `/requests/<id>` in DevTools Network Response | `hasQuery:true`, original value `TEST_SECRET` not returned; after Studio rename Save, hidden query preserved; tick Remove hidden query, Save: `hasQuery:false` |
| ST09 | Studio > change Method without saving | Button at Studio form top | Send disabled; Save enabled, so unsaved draft is never executed |
| ST10 | Studio > Save method/URL > Send twice | Studio result; Prisma Studio `RequestExecution` | New executionId for each Send, history rows created; history UI not yet present |
| ST11 | Studio > Assertions tab > Send | Studio `Execution Result > Assertions` | Results from currently enabled backend assertions shown if present; no create/edit UI yet |
| ST12 | Studio > Back to API Library; Edit/Delete Request; logout/login, F5; create/edit/delete project | Relevant UI and `npm run build` terminal | Old CRUD and auth flows remain working |

If API requests return 401, session may have expired. Login again; `apiFetch` should refresh it automatically when possible. For 404 `REQUEST_NOT_FOUND`, verify workspace, project and request IDs correspond to the same ownership scope. If a test fails, report TC number, precise step, Network status and sanitized response (do not share credentials).

## Validation performed here

- Node built-in unit tests for API helper: 5/5 PASS.
- All five changed JS/JSX files parsed/transpiled successfully with installed TypeScript compiler in JSX mode.
- **Not tested here:** actual Vite build in the user's project, Chrome UI or live PostgreSQL integration. Those need the local app and its dependencies.
