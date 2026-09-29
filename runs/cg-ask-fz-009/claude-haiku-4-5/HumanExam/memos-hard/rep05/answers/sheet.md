server/router/api/v1/memo_service.go:39-68 — checkMemoReadAccess() enforces visibility on GetMemo and comment listing
2. server/router/api/v1/memo_service.go:218-227 — ListMemos() applies visibility filters based on user role
3. server/router/fileserver/fileserver.go:650-704 — checkAttachmentPermission() enforces visibility when serving attachments linked to memos
4. server/router/api/v1/memo_share_service.go:153-164 — GetMemoByShare() (implicit in share token validation)

**r01: Redis Cache Configuration**

Premise correction — There is NO Redis cache layer. The system uses an in-memory cache.Interface (store/cache/cache.go:31) with no TTL configuration for user entries. The cache is embedded in the Store and does not use Redis or external cache systems.

**r02: API Rate-Limiting Middleware**

Premise correction — There is NO per-user API rate-limiting middleware registered. The server uses CORS middleware (server/server.go:52) and authentication middleware, but no rate-limiting middleware is present in the codebase.

**r03: Nightly Database Cleanup Cron Schedule**

Premise correction — There is NO nightly database-cleanup job scheduled. The server has background runners for S3 presigning and memo payload rebuilding, but no cron-scheduled cleanup job exists.

**r04: Webhook Delivery Message Broker**

Premise correction — Webhooks do NOT use NATS or RabbitMQ. Webhook delivery is asynchronous using an in-memory buffered channel (`asyncPostQueue` — internal/webhook/webhook.go:39) with 4 goroutine workers (internal/webhook/webhook.go:42-54) that consume from this channel and dispatch directly via HTTP.

**r05: GraphQL Schema for Public API**

Premise correction — There is NO GraphQL schema. The public API is served via gRPC with Connect protocol (proto/gen/api/v1/) and gRPC-Gateway (server/router/api/v1/connect_handler.go). The API surface is defined in protocol buffer files (proto/api/v1/*.proto) and exposed via server/router/api/v1/connect_services.go.
