# Judge transports

The judge is an LLM called ONE question at a time with the prompt in
`judge-prompt.md`. Two transports exist and are stamped on every verdict
(`judge.transport`):

- `api` — the vendor Messages API, no harness, no context beyond the prompt.
- `cc_oauth` — the same prompt through a hermetic `claude -p` call on a
  subscription account: a scratch configuration directory (no user config, no
  memory, no project files), tools disabled, the system prompt supplied verbatim.
  A per-call scan proves nothing else entered the context.

Both transports run the same core: identical prompt bytes, identical parsing,
identical contradiction handling (a fail verdict with a pass-shaped reason is
retried once sternly; a persistent contradiction is marked `adjudicate` and
counted as a fail, listed separately). A vendor outage is an INFRA gap that leaves
the question unscored for retry — never a verdict.
