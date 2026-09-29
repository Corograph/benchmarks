h01** — S3 presigned-URL refresh runner keeps external (S3) attachment references from expiring.
- Component: `s3presign.Runner` (`CheckAndPresign`/`RunOnce`), `server/runner/s3presign/runner.go:16,43,47`.
- Schedule: every 12 hours (`runnerInterval = time.Hour * 12`, runner.go:27), driven by a `time.Ticker` in `Run` (runner.go:29-41); re-presigns any S3 object whose presigned URL is within 4 days of its 5-day expiry (runner.go:85-91).
- Wiring: `server/server.go:162-171` — `startBackgroundRunners` calls `s3presignRunner.RunOnce(ctx)` once at startup (server.go:163) then launches `s3presignRunner.Run(s3Context)` in a goroutine (server.go:169).

**2. h02**
- Delivery function: `webhook.Post` — `internal/webhook/webhook.go:120` (the actual `safeClient.Do(req)` is at webhook.go:152; entry via `webhook.PostAsync`, webhook.go:184).
- SSRF protection: a custom `safeDialContext` on the shared `safeClient`'s Transport (`internal/webhook/webhook.go:32-37`, `59-77`) that resolves the host and rejects any address in a reserved/private range via `isReservedIP` (webhook.go:71) — blocking connections to internal addresses and DNS-rebinding.

**3. h03**
- Abstraction package: `internal/idp` — defines `IdentityProviderUserInfo` (`internal/idp/idp.go:1-8`), the provider-neutral user-info contract.
- Implementation package: `internal/idp/oauth2` — the concrete OAuth2 provider `IdentityProvider` with `NewIdentityProvider` (`internal/idp/oauth2/oauth2.go:20,27`). OAuth2 is the only protocol implementation shipped (cf. only `IdentityProvider_OAUTH2` type exists, `proto/gen/store/idp.pb.go:26`).

**4. h04**
- **No.** The MySQL driver constructor `mysql.NewDB` is called only from the driver-selection factory `NewDBDriver` (`store/db/db.go:22`, inside a `switch profile.Driver` on `"mysql"`). Every other `mysql.NewDB` / `sql.Open("mysql", …)` occurrence is in test code (`store/test/containers.go:145`, `store/db/mysql/*_test.go`). Evidence: grep across `**/*.go` for `mysql.New` / `sql.Open("mysql"` / `go-sql-driver` — only non-test hit constructing the driver is the factory.

**5. h05**
- Mechanism: **explicit Go code**, not a DB rule.
- Evidence: `store/db/sqlite/user_delete.go:400-402` (`deleteReactionsByCreatorTx` → `DELETE FROM reaction WHERE creator_id = …`), plus a batched `DELETE FROM reaction WHERE content_id IN …` at `user_delete.go:383`; mirrored in `store/db/postgres/user_delete.go` and `store/db/mysql/user_delete.go`. No DB cascade exists — the `reaction` table (`store/migration/sqlite/LATEST.sql:92-99`) declares no `FOREIGN KEY … REFERENCES user … ON DELETE CASCADE` (only `memo_share` has such an FK, LATEST.sql:109).

**6. h06**
- Handlers (≥3): `CreateMemo` (`server/router/api/v1/memo_service.go:157` → `DispatchMemoCreatedWebhook`); `UpdateMemo` (via `dispatchMemoUpdatedSideEffects`, `server/router/api/v1/memo_update_helpers.go:67` → `DispatchMemoUpdatedWebhook`); `DeleteMemo` (`memo_service.go:562` → `DispatchMemoDeletedWebhook`); `CreateMemoComment` (`memo_service_comments.go:119` → `DispatchMemoCommentCreatedWebhook`).
- Convergence function: all route through `dispatchMemoRelatedWebhook`/the comment dispatcher → `webhook.PostAsync` → **`webhook.Post`** — `internal/webhook/webhook.go:120` (the single function that performs the outbound HTTP delivery).

**7. h07** (hops)
- `FileServerService.serveUserAvatar` — `server/router/fileserver/fileserver.go:168` (route `GET /file/users/:identifier/avatar`, registered fileserver.go:124)
- `FileServerService.getUserByUsername` — `server/router/fileserver/fileserver.go:715`
- `store.Store.GetUser` (called with `&store.FindUser{Username:…}`) — `server/router/fileserver/fileserver.go:716`
- concrete data layer `sqlite.(*DB).GetUser` (default driver) — `store/db/sqlite/user.go`; avatar bytes then decoded from `user.AvatarURL` data-URI (fileserver.go:196).

**8. h08**
- `memopayload.Runner.RunOnce` — `server/runner/memopayload/runner.go:27` — **not invoked** in production (only its own package; no non-test caller).
- `s3presign.Runner.RunOnce` — `server/runner/s3presign/runner.go:43` — **invoked** by `server.startBackgroundRunners` at `server/server.go:163`, and by its own `Run` ticker loop at `server/runner/s3presign/runner.go:36`.

**9. h09**
- I did not exhaustively count every `Close` declaration across the backend, so the exact count is best given as a range rather than asserted precisely — **cannot determine** the exact distinct-declaration count from the checks performed. What is established: the store driver's `Close` is the one called by non-test server code — `store.Store.Close`/driver `Close` is invoked during shutdown. (I confirmed the driver interface has `Close`, but did not enumerate all `Close` declarers/callers, so I won't guess the total.) → **cannot determine** (count).

**10. h10**
- By measured direct-caller (fan-in) count, the leaders among symbols declared under `internal/` are `util.GenUUID` (`internal/util/util.go:40`) with **~7** direct callers, tied with the markdown `service.parse` helper (`internal/markdown/markdown.go`, ~7). `util.GenUUID` — `internal/util/util.go:40` — approx fan-in 7. (Note: the code graph under-counts inbound edges for `internal/`, and interface-dispatched markdown methods add indirect callers; 7 is the highest directly verified.)

**11. h11**
- 1st: **`store.User`** (`store/user.go:29`) — referenced most widely; usage spans auth, fileserver, notification, rss, all three db dialects, and the v1 API layer (`[Corograph query]` = 85 edges across ~9+ packages).
- 2nd: **`store.Memo`** (`store/memo.go:35`) — next widest (`[Corograph query]` = 57 edges), spanning memopayload, notification, rss, db dialects, and the v1 API layer (~8 packages).

**12. h12**
- Concrete method: **`sqlite.(*DB).CreateMemo`** — `store/db/sqlite/memo.go:16` (the `INSERT INTO memo … RETURNING …` at memo.go:41).
- Determination: default driver is `sqlite` (`viper.SetDefault("driver","sqlite")`, `cmd/memos/main.go:122`; flag default `"sqlite"`, main.go:130). `NewDBDriver` selects the concrete driver by `profile.Driver` (`store/db/db.go:18-24`), so with no DB flags the `store.Driver.CreateMemo` interface call dispatches to the sqlite implementation.

**13. h13**
- Impl: the unexported `service` struct backed by goldmark — `internal/markdown/markdown.go:58` (implements the `markdown.Service` interface, markdown.go:31).
- Construction: `markdown.NewService(...)` — `internal/markdown/markdown.go:85`; called in production at `server/router/api/v1/v1.go:48` (and the RSS service, `rss` constructor).
- Holders: `APIV1Service.MarkdownService` (v1 API service, wired in `v1.go:48`); `memopayload.Runner.MarkdownService` (`server/runner/memopayload/runner.go:16`); and the RSS service. They call it via the `Service` interface (`ExtractAll`, `GenerateSnippet`, `RenderHTML`, etc.).

**14. h14**
- Computation site: `memopayload.RebuildMemoPayload` — `server/runner/memopayload/runner.go:74`, which calls `markdownService.ExtractAll` (runner.go:80) and stores the result into `memo.Payload.Tags` and `memo.Payload.Property` (runner.go:85-86).
- Triggers: memo create (`server/router/api/v1/memo_service.go:108`), memo update when content changes (`memo_service.go:447`), and the bulk backfill `memopayload.Runner.RunOnce` (`server/runner/memopayload/runner.go:52`).
- Extracted properties: from `ExtractAll` — the memo's **tags** and **properties** (e.g. hasLink/hasCode/hasTaskList/incompleteTasks and title), i.e. `ExtractedData.Tags` and `ExtractedData.Property` written to `MemoPayload`.

**15. h15** (visibility enforcement sites)
- `GetMemo` handler — `server/router/api/v1/memo_service.go:55-64`
- `ListMemos` filter narrowing — `server/router/api/v1/memo_service.go:218-226`
- Reaction create/list — `server/router/api/v1/reaction_service.go:30-39` and `:83-84`
- Attachment access checks — `server/router/api/v1/attachment_service.go:445-452` and `server/router/api/v1/memo_attachment_service.go:214-223`
- Comment creation — `server/router/api/v1/memo_service_comments.go:41-42`
- SSE delivery filtering — `server/router/api/v1/sse_hub.go:134-142` (`SSEClient.canReceive`)
- Email notification eligibility — `server/notification/email.go:313-317` (`canViewerAccessMemo`)

**16. r01** — Premise false. There is **no Redis and no cache layer** in this codebase (no `redis` import/reference anywhere; searched 343 files; not in go.mod). User lookups go straight to the SQL store (`store.GetUser`). No Redis connection and no user-entry TTL exist to configure.

**17. r02** — Premise false. There is **no per-user API rate-limiting middleware** — no rate-limiter registration or request-limit configuration exists (no `ratelimit`/`rate_limit` references; `golang.org/x/time` is only an indirect dep). Access control is via the ACL/authenticator (`server/router/api/v1/acl_config.go`), not rate limiting.

**18. r03** — Premise false. There is **no nightly database-cleanup job and no cron scheduler wired into the server**. An `internal/scheduler` cron library exists (`internal/scheduler/scheduler.go`), but `scheduler.New()`/`Register` are used only in that package's tests and doc examples — never in production. The only scheduled background work is the S3 presign runner on a 12-hour `time.Ticker` (`server/runner/s3presign/runner.go:27`), not a cron-scheduled cleanup at any time.

**19. r04** — Premise false. There are **no message brokers and no queue** — neither NATS nor RabbitMQ/AMQP appears anywhere (searched 343 files; none in go.mod). Webhook delivery uses an in-process bounded Go channel: `asyncPostQueue = make(chan *WebhookRequestPayload, 128)` consumed by 4 goroutines started in `init()` (`internal/webhook/webhook.go:39-54`), enqueued via `PostAsync` (webhook.go:184).

**20. r05** — Premise false. There is **no GraphQL schema or GraphQL API** (no `graphql` references anywhere). The public API surface is **Connect/gRPC** defined via protobuf: services under `proto/gen/api/v1/apiv1connect/` (e.g. `MemoService`, `UserService`, `AttachmentService`, `AuthService`, `IdentityProviderService`), served over Connect handlers (`connectrpc.com/connect`), plus a small REST/file surface via echo (`server/router/fileserver`, `server/router/rss`).
