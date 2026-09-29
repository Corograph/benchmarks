memo_relation records (where this memo is the source)
2. memo_relation records (where this memo is the target)
3. attachment records

**q17: Which frontend module contains the memo CRUD mutations/queries, and which generated service client does it use?**

web/src/hooks/useMemoQueries.ts — memoServiceClient

**q18: List the three implementations of the database driver interface (entry file each) and name the factory function + file that selects between them at startup.**

store/db/sqlite/db.go (sqlite.NewDB)
store/db/mysql/db.go (mysql.NewDB)
store/db/postgres/db.go (postgres.NewDB)

Factory: db.NewDBDriver — store/db/db.go:14

**q19: MemoService is served over TWO protocols. Name both, and give the file(s) where each protocol's registration/wrapping happens.**

gRPC-Gateway (REST): v1pb.RegisterMemoServiceHandlerServer — server/router/api/v1/v1.go:108
Connect: v1.NewConnectServiceHandler — server/router/api/v1/v1.go:140

**q20: The server pushes live events to browsers. What mechanism is used, where is the hub implemented, and which memo handlers broadcast through it?**

Mechanism: Server-Sent Events (SSE)
Hub: v1.SSEHub — server/router/api/v1/sse_hub.go:56
Handlers that broadcast:
- CreateMemo (SSEEventMemoCreated) — server/router/api/v1/memo_service.go:163
- UpdateMemo (SSEEventMemoUpdated)
- DeleteMemo (SSEEventMemoDeleted) — server/router/api/v1/memo_service.go:585
- CreateMemoComment (SSEEventMemoCommentCreated)
- UpsertMemoReaction (SSEEventReactionUpserted)
- DeleteMemoReaction (SSEEventReactionDeleted)

**q21: If the signature of Store.GetUser changes, which call sites must be updated?**

From [Corograph query]:
auth.Authenticator.AuthenticateByRefreshToken — server/auth/authenticator.go:61
auth.Authenticator.resolveBearer — server/auth/authenticator.go:149
notification.EmailDispatcher.DispatchInboxEmail — server/notification/email.go:40
v1.APIV1Service.GetInstanceAdmin — server/router/api/v1/instance_service.go:332
v1.APIV1Service.SignIn — server/router/api/v1/auth_service.go:51
v1.APIV1Service.fetchCurrentUser — server/router/api/v1/auth_service_session.go:246
v1.APIV1Service.getLinkedSSOUser — server/router/api/v1/auth_service_sso.go:150
v1.APIV1Service.resolveSSOUser — server/router/api/v1/auth_service_sso.go:19
v1.ResolveUserByName — server/router/api/v1/user_resource_name.go:49
fileserver.FileServerService.getUserByUsername — server/router/fileserver/fileserver.go:715
rss.RSSService.GetUserRSS — server/router/rss/rss.go:111
store.Store.GetUserByPATHash — store/user_setting.go:128

**q22: When a memo is created, how are user webhooks notified? Name the dispatch function and file called from the handler, the package that performs the HTTP delivery, and the request-signing mechanism used.**

Dispatch function: v1.APIV1Service.DispatchMemoCreatedWebhook — server/router/api/v1/memo_service_webhooks.go:15
HTTP delivery package: internal/webhook (webhook.PostAsync)
Signing mechanism: HMAC-SHA256 (webhook.GenerateSigningSecret, webhook.ValidateSigningSecret)

**q23: The memo entity's shape is defined at multiple layers. Give the file defining it at each of these layers: SQL schema, Go store model, API proto message, generated frontend types.**

SQL schema: store/migration/sqlite/LATEST.sql:33
Go store model: store/memo.go:35
API proto message: proto/api/v1/memo_service.proto (message Memo)
Generated frontend types: web/src/types/proto/api/v1/memo_service_pb.ts:79

**q24: Give the complete call chain for creating a memo, from the frontend mutation hook to the SQL INSERT, naming each hop's file.**

web/src/hooks/useMemoQueries.ts (useCreateMemo)
web/src/connect.ts (memoServiceClient.createMemo)
proto/gen/api/v1/apiv1connect/memo_service.connect.go (connect transport)
server/router/api/v1/memo_service.go (v1.APIV1Service.CreateMemo:70)
store/memo.go (store.Store.CreateMemo:109)
store/db/sqlite/memo.go (sqlite.DB.CreateMemo:16)

**q25: The ListMemos RPC accepts a filter expression. What syntax/engine parses it, where does that engine live, and how does the filter become SQL for each dialect?**

Engine: CEL (Common Expression Language)
Location: internal/filter/engine.go:14 (filter.Engine)
Mechanism: The filter.Engine.CompileToStatement method (internal/filter/engine.go:74) parses the CEL expression into a dialect-agnostic condition tree, then renders it to SQL using dialect-specific renderers. Each dialect (SQLite, MySQL, PostgreSQL) has its own renderer that generates appropriate SQL syntax from the condition tree.

**q26: Which database tables are affected (directly or by explicit cascade code) when DeleteMemo runs?**

From store.memo.go:140-158 and server/router/api/v1/memo_service.go:518-593:
- memo (direct delete)
- memo_relation (explicit delete via store.DeleteMemoRelation)
- attachment (explicit delete via store.DeleteAttachment)
- reaction (implicit via ListReactions, explicit delete before memo deletion)

**q27: How does the compiled React frontend get served in production? Name the mechanism and the file where it is wired.**

Mechanism: Embedded static files served via HTTP
File: server/router/frontend/frontend.go (frontend.FrontendService.Serve at line 41)
The compiled frontend is embedded in the binary and served as static assets with proper cache headers and SPA fallback routing.

**q28: What background workers/runners does the server actually START, and what drives each one's scheduling? Note explicitly if any scheduling infrastructure present in the codebase is NOT used by the server.**

Actual runners started:
1. s3presign.Runner — triggered by time interval (runnerInterval constant), Run() loop in server/server.go:169

Scheduling infrastructure present but NOT used:
- internal/scheduler package (scheduler.Scheduler) — defined in internal/scheduler/ but no evidence of it being instantiated or used by server startup code

**q29: How do frontend API requests get authenticated? Name where the auth interceptor lives, what tokens it manages, and the backend package that validates them.**

Auth interceptor: web/src/connect.ts (authInterceptor, lines 156-178)
Tokens managed: Bearer tokens (JWT access tokens) and refresh tokens (stored as cookies)
Backend validation: server/auth (auth.Authenticator.resolveBearer, server/auth/authenticator.go:149; uses server/auth/token.go)

**q30: Which memo lifecycle events dispatch webhooks, and what are the dispatch function names? Where do all of them converge for delivery?**

Events and dispatch functions:
- memo.created: DispatchMemoCreatedWebhook — server/router/api/v1/memo_service_webhooks.go:15
- memo.updated: DispatchMemoUpdatedWebhook — server/router/api/v1/memo_service_webhooks.go:20
- memo.deleted: DispatchMemoDeletedWebhook — server/router/api/v1/memo_service_webhooks.go:25
- memo.comment.created: DispatchMemoCommentCreatedWebhook — server/router/api/v1/memo_service_webhooks.go:30

Convergence point: All dispatch functions call webhook.PostAsync (internal/webhook/webhook.go), which performs asynchronous HTTP delivery with HMAC-SHA256 signing.
