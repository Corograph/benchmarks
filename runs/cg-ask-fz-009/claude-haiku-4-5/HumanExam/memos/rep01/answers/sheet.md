Deletes memo comments (child memos with COMMENT type relations)
2. Then deletes: reactions, attachments, and memo_relations (handled by store.DeleteMemo)

**q17: Frontend memo CRUD mutations/queries module and client**
web/src/hooks/useMemoQueries.ts; memoServiceClient

**q18: Three database driver implementations and factory**
Implementations:
store/db/sqlite/sqlite.go
store/db/mysql/mysql.go
store/db/postgres/postgres.go
Factory: NewDBDriver — store/db/db.go

**q19: MemoService served over TWO protocols**
gRPC — server/router/api/v1/connect_services.go
REST (via grpc-gateway) — proto/gen/api/v1/memo_service.pb.gw.go

**q20: Server live event mechanism, hub, and handlers**
Mechanism: Server-Sent Events (SSE)
Hub implementation: v1.SSEHub — server/router/api/v1/sse_hub.go
Memo handlers broadcasting: CreateMemo, UpdateMemo, DeleteMemo, CreateMemoComment — server/router/api/v1/memo_service.go (lines 163, 513, 585, etc.)

**q21: Callers of Store.GetUser that must be updated if signature changes**
auth.Authenticator.AuthenticateByRefreshToken — server/auth/authenticator.go
auth.Authenticator.resolveBearer — server/auth/authenticator.go
v1.APIV1Service.SignIn — server/router/api/v1/auth_service.go
v1.APIV1Service.fetchCurrentUser — server/router/api/v1/auth_service_session.go
v1.APIV1Service.getLinkedSSOUser — server/router/api/v1/auth_service_sso.go
v1.APIV1Service.resolveSSOUser — server/router/api/v1/auth_service_sso.go
v1.ResolveUserByName — server/router/api/v1/user_resource_name.go
fileserver.FileServerService.getUserByUsername — server/router/fileserver/fileserver.go
rss.RSSService.GetUserRSS — server/router/rss/rss.go
notification.EmailDispatcher.DispatchInboxEmail — server/notification/email.go

**q22: Webhook dispatch when memo created**
Dispatcher function: DispatchMemoCreatedWebhook — server/router/api/v1/memo_service_webhooks.go
Called from: server/router/api/v1/memo_service.go:157
Delivery package: internal/webhook
Signing mechanism: HMAC-SHA256 (Standard Webhooks "whsec_" format)

**q23: Memo entity definition at each layer**
SQL schema: store/migration/sqlite/LATEST.sql (lines 32-44)
Go store model: store/memo.go (Memo struct)
API proto message: proto/api/v1/memo_service.proto (Memo message)
Generated frontend types: web/src/types/proto/api/v1/memo_service_pb.ts

**q24: Complete call chain for creating a memo**
web/src/hooks/useMemoQueries.ts (useCreateMemo)
web/src/connect.ts (memoServiceClient)
proto/api/v1/memo_service.proto (CreateMemoRequest/CreateMemo RPC)
server/router/api/v1/memo_service.go (APIV1Service.CreateMemo)
store/memo.go (Store.CreateMemo)
store/db/sqlite/memo.go (DB.CreateMemo)

**q25: ListMemos filter parsing**
Engine: CEL (Common Expression Language) filter engine — internal/filter/engine.go
Mechanism: Filter expressions are compiled to Condition trees, then rendered to SQL fragments via dialect-specific RenderOptions (DialectSQLite, DialectMySQL, DialectPostgres)

**q26: Database tables affected by DeleteMemo**
memo, memo_relation, attachment, reaction, memo_share (when deleting related memo shares)

**q27: Compiled React frontend serving in production**
Mechanism: Embedded filesystem with SPA fallback middleware
File: server/router/frontend/frontend.go (FrontendService.Serve method at line 41)

**q28: Background workers/runners started by server**
s3presign.Runner — triggered by time.NewTicker (12-hour interval) — server/server.go:153-171
memopayload.Runner — NOT CONTINUOUSLY RUN (RunOnce called only during startup for batch rebuild, not scheduled)

Unused infrastructure: internal/scheduler package exists but is not used by the server to schedule workers.

**q29: Frontend API request authentication**
Interceptor path: web/src/connect.ts (authInterceptor at line 156)
Token kinds: Access tokens (Bearer), refresh tokens (stored, rotated)
Backend validation package: server/auth (server/auth/authenticator.go — Authenticator.AuthenticateByRefreshToken, resolveBearer)

**q30: Memo lifecycle events and webhook dispatch functions**
memo.created: DispatchMemoCreatedWebhook — server/router/api/v1/memo_service_webhooks.go:15
memo.updated: DispatchMemoUpdatedWebhook — server/router/api/v1/memo_service_webhooks.go:20
memo.deleted: DispatchMemoDeletedWebhook — server/router/api/v1/memo_service_webhooks.go:25
memo.comment.created: DispatchMemoCommentCreatedWebhook — server/router/api/v1/memo_service_webhooks.go:30

All converge for delivery at: webhook.PostAsync — internal/webhook/webhook.go:184
