**POST /api/v1/memos** — gateway pattern `apiv1.pattern_MemoService_CreateMemo_0` (proto/gen/api/v1/memo_service.pb.gw.go:1745), declared in proto/api/v1/memo_service.proto.

2. sqlite, mysql, postgres — store/migration/sqlite, store/migration/mysql, store/migration/postgres (e.g. store/migration/sqlite/LATEST.sql:1).

3. **DB — store/db/postgres/postgres.go:16** (`postgres.DB`, implements `store.Driver`).

4. **APIV1Service.SignIn — server/router/api/v1/auth_service.go:51**.

5. **8**: AIService, AttachmentService, AuthService, IdentityProviderService, InstanceService, MemoService, ShortcutService, UserService (proto/api/v1/ai_service.proto:11, attachment_service.proto:15, auth_service.proto:13, idp_service.proto:14, instance_service.proto:17, memo_service.proto:17, shortcut_service.proto:14, user_service.proto:17).

6. **memo_relation** — store/migration/sqlite/LATEST.sql:47 (`memo_id`, `related_memo_id`, `type`).

7. **web/src/connect.ts** (clients created at lines 192–203).

8. **Driver — store/driver.go:10** (48 methods; implemented by mysql.DB, postgres.DB, sqlite.DB).

9. **AIService** — proto/api/v1/ai_service.proto:13 (`POST /api/v1/ai:transcribe`).

10. **store/migration/sqlite/LATEST.sql** (applied by preMigrate for uninitialized DBs; store/migrator.go:27,56).

11. `APIV1Service.CreateMemo — server/router/api/v1/memo_service.go:70` (line 115 is the `s.Store.CreateMemo` call). That is the only API-layer caller; `CreateMemoComment` reaches the store indirectly by calling the API method (server/router/api/v1/memo_service_comments.go:56).

12. 
- frontend hook — web/src/hooks/useMemoQueries.ts:112 `useMemos` (also `useInfiniteMemos`, :122)
- client — web/src/connect.ts:197 (`memoServiceClient.listMemos`, useMemoQueries.ts:116)
- proto RPC — proto/api/v1/memo_service.proto (MemoService.ListMemos, `GET /api/v1/memos`)
- backend handler — server/router/api/v1/memo_service.go:178
- store method — store/memo.go:116
- dialect impl — store/db/sqlite/memo.go:54 (also postgres/memo.go:54-ish, mysql/memo.go)

13. Files referencing `store.Memo` (blast radius, d:1):
- store/memo.go, store/driver.go
- store/db/sqlite/memo.go, store/db/mysql/memo.go, store/db/postgres/memo.go
- server/router/api/v1/memo_service.go, memo_service_converter.go, memo_update_helpers.go, memo_batch_helpers.go, memo_mention_helpers.go, memo_relation_service.go, memo_attachment_service.go, sse_event_helpers.go, common.go, user_service_notifications.go
- server/notification/email.go
- server/router/rss/rss.go
- server/runner/memopayload/runner.go

14. RPCs: ListShortcuts, GetShortcut, CreateShortcut, UpdateShortcut, DeleteShortcut (proto/api/v1/shortcut_service.proto:18,24,30,39,48). Implemented in **server/router/api/v1/shortcut_service.go** (:49, :95, :135, :211, :284).

15. 
- user: `User` — store/user.go:29
- attachment: `Attachment` — store/attachment.go:16
- reaction: `Reaction` — store/reaction.go:7

16. Inside `Store.DeleteMemo` (store/memo.go:140-158), before the memo row: **memo_relation rows where the memo is the source** (:142), **memo_relation rows where it is the target** (:145), **all attachments linked to the memo** (:149-157, each via `DeleteAttachment`, which also removes blob/local/S3 storage). Additionally the API handler first deletes **comment memos** (server/router/api/v1/memo_service.go:567-577).

17. **web/src/hooks/useMemoQueries.ts**; client: **memoServiceClient** (web/src/connect.ts:197) — `useMemos`, `useInfiniteMemos`, `useMemo`, `useCreateMemo`, `useUpdateMemo`, `useDeleteMemo` (useMemoQueries.ts:112,122,142,178,197,253).

18. Implementations: store/db/sqlite/sqlite.go:16, store/db/mysql/mysql.go:14, store/db/postgres/postgres.go:16. Factory: **NewDBDriver — store/db/db.go:14** (switch on `profile.Driver`).

19. 
- **Connect (connectrpc) — server/router/api/v1/connect_handler.go:31-40** (`apiv1connect.NewMemoServiceHandler`), mounted at server/router/api/v1/v1.go:139-144 (`/memos.api.v1.*`)
- **gRPC-Gateway HTTP/JSON REST — server/router/api/v1/v1.go:108** (`RegisterMemoServiceHandlerServer`) with generated routes in proto/gen/api/v1/memo_service.pb.gw.go

20. Mechanism: **Server-Sent Events** (`GET /api/v1/sse`, server/router/api/v1/sse_handler.go:25; client fetches the stream at web/src/hooks/useLiveMemoRefresh.ts:203). Hub: **server/router/api/v1/sse_hub.go** (`SSEHub`, event types :14-21). Broadcasting memo handlers: `CreateMemo` (memo_service.go:163), `DeleteMemo` (memo_service.go:585), `CreateMemoComment` (memo_service_comments.go:126), `dispatchMemoUpdatedSideEffects` used by UpdateMemo (memo_update_helpers.go:71), plus reactions `UpsertMemoReaction`/`DeleteMemoReaction` (reaction_service.go:106,161).

21. Callers of `Store.GetUser`:
- `auth.Authenticator.AuthenticateByRefreshToken` — server/auth/authenticator.go:61
- `auth.Authenticator.resolveBearer` — server/auth/authenticator.go:149
- `notification.EmailDispatcher.DispatchInboxEmail` — server/notification/email.go:40
- `APIV1Service.GetInstanceAdmin` — server/router/api/v1/instance_service.go:332
- `APIV1Service.SignIn` — server/router/api/v1/auth_service.go:51
- `APIV1Service.fetchCurrentUser` — server/router/api/v1/auth_service_session.go:246
- `APIV1Service.getLinkedSSOUser` — server/router/api/v1/auth_service_sso.go:150
- `APIV1Service.resolveSSOUser` — server/router/api/v1/auth_service_sso.go:19
- `ResolveUserByName` — server/router/api/v1/user_resource_name.go:49
- `FileServerService.getUserByUsername` — server/router/fileserver/fileserver.go:715
- `RSSService.GetUserRSS` — server/router/rss/rss.go:111
- `Store.GetUserByPATHash` — store/user_setting.go:128

22. Dispatcher: **`APIV1Service.DispatchMemoCreatedWebhook` — server/router/api/v1/memo_service_webhooks.go:15** (called at server/router/api/v1/memo_service.go:157; delegates to `dispatchMemoRelatedWebhook`, :48). Delivery package: **internal/webhook** (`PostAsync` queue + 4 workers, internal/webhook/webhook.go:184,42; HTTP POST in `Post`, :120, via an SSRF-guarded client). Signing: **HMAC-SHA256 Standard Webhooks** — `whsec_`-decoded key over `msgID.timestamp.body`, headers `webhook-id`/`webhook-timestamp`/`webhook-signature: v1,<b64>` (internal/webhook/webhook.go:133-150).

23. 
- SQL schema: store/migration/sqlite/LATEST.sql:33 (plus store/migration/postgres/LATEST.sql:32, store/migration/mysql/LATEST.sql:32)
- Go store model: store/memo.go:35
- API proto message: proto/api/v1/memo_service.proto:198 (generated Go: proto/gen/api/v1/memo_service.pb.go)
- Generated frontend types: web/src/types/proto/api/v1/memo_service_pb.ts

24. 
- web/src/hooks/useMemoQueries.ts:178 (`useCreateMemo` mutation, calls `memoServiceClient.createMemo` at :183)
- web/src/connect.ts:197 (`memoServiceClient`)
- proto/api/v1/memo_service.proto (MemoService.CreateMemo → POST /api/v1/memos)
- server/router/api/v1/memo_service.go:70 (`APIV1Service.CreateMemo`, store call at :115)
- store/memo.go:109 (`Store.CreateMemo`)
- store/db/sqlite/memo.go:16 (`INSERT INTO memo`; postgres equivalent at store/db/postgres/memo.go:38)

25. Engine: **Google CEL (cel-go) compiled into a dialect-agnostic condition tree — internal/filter** (engine.go:14-71 `Engine.Compile`, grammar/AST handling in internal/filter/parser.go, field vocabulary in internal/filter/schema.go). Mechanism: each dialect driver calls `filter.DefaultEngine()` then `filter.AppendConditions(ctx, engine, find.Filters, filter.Dialect<X>, &where, &args)` (internal/filter/helpers.go:9), which renders the condition tree into dialect-specific SQL + placeholder args via internal/filter/render.go (`DialectSQLite`/`DialectPostgres`/`DialectMySQL`, render.go:231-237) and appends it to the WHERE clause — e.g. store/db/sqlite/memo.go:57-61, store/db/postgres/memo.go:58.

26. **memo** (store/db/sqlite/memo.go:237-239), **memo_relation** (store/memo.go:142,145), **attachment** (store/memo.go:149-157), and **memo_share** via `FOREIGN KEY (memo_id) REFERENCES memo(id) ON DELETE CASCADE` (store/migration/postgres/LATEST.sql:108, store/migration/mysql/LATEST.sql:108) — note this cascade does not fire on SQLite, where FKs are disabled at connection time (store/db/sqlite/sqlite.go:53 `_pragma=foreign_keys(0)`). `reaction` rows are read for the webhook payload (server/router/api/v1/memo_service.go:545) but are not deleted.

27. Mechanism: the built `web/dist` bundle is **embedded into the Go binary (`//go:embed dist/*`) and served by Echo static middleware with an SPA `index.html` fallback** — server/router/frontend/frontend.go:20-21 (embed), :54-59 (static + SPA fallback). Wired at **server/server.go:72** (`frontend.NewFrontendService(profile, store).Serve(ctx, echoServer)`).

28. 
- **s3presign.Runner — one immediate `RunOnce` at startup plus a 12-hour `time.Ticker`** (server/server.go:162-171; interval and loop at server/runner/s3presign/runner.go:27-41). This is the only background runner started.
- Unused infra: **internal/scheduler** (cron-style `Scheduler`, internal/scheduler/scheduler.go:12) is referenced only by its own tests/docs (internal/scheduler/example_test.go, integration_test.go) — the server never constructs it. Also **server/runner/memopayload.Runner** (server/runner/memopayload/runner.go:14-27) is never started; only its `RebuildMemoPayload` helper is used inline by memo handlers (server/router/api/v1/memo_service.go:108,447).

29. Interceptor: **web/src/connect.ts:156** (`authInterceptor`, attached to the transport at :188). Tokens it manages: a short-lived **JWT access token** kept in localStorage and sent as `Authorization: Bearer` (web/src/auth-state.ts:52-84, connect.ts:97-99,124-150), refreshed via `AuthService.RefreshToken` using the **HTTP-only refresh-token cookie** `memos_refresh` (connect.ts:65-83; cookie name at server/auth/token.go:49); the backend also accepts **personal access tokens** (`memos_pat_` prefix, server/auth/token.go:52). Validation backend package: **server/auth** (`Authenticator.AuthenticateByAccessTokenV2` :41, `AuthenticateByRefreshToken` :61, `AuthenticateByPAT` :102), invoked through server/router/api/v1/authz.go for both Connect and gateway transports.

30. 
- memo created: `DispatchMemoCreatedWebhook` — server/router/api/v1/memo_service_webhooks.go:15 (called memo_service.go:157)
- memo updated: `DispatchMemoUpdatedWebhook` — memo_service_webhooks.go:20 (called memo_update_helpers.go:67)
- memo deleted: `DispatchMemoDeletedWebhook` — memo_service_webhooks.go:25 (called memo_service.go:562)
- comment created: `DispatchMemoCommentCreatedWebhook` — memo_service_webhooks.go:30 (called memo_service_comments.go:119)

All three memo lifecycle ones converge on `dispatchMemoRelatedWebhook` (memo_service_webhooks.go:48), and all four converge on delivery via **`webhook.PostAsync` → `webhook.Post` — internal/webhook/webhook.go:184 and :120**.
