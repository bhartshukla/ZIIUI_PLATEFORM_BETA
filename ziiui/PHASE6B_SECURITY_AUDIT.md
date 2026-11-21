ZIIUI — PHASE 6B: APPLICATION SECURITY AUDIT
================================================================================

1. EXECUTIVE SUMMARY
================================================================================

ZiiUI's security posture is strong. The application follows a frontend-only
architecture with a serverless AI proxy that keeps the OpenRouter API key
off the client. Preview iframes use opaque-origin sandboxing with nonce,
generation, and event.source validation. No critical or high-severity
vulnerabilities were found.

No source code changes are mandated. All findings are documented below;
several are pre-existing design trade-offs (CSP `unsafe-inline` for the
inline theme script) that are acceptable given the constraints.

================================================================================
2. SECRET AND API KEY MANAGEMENT
================================================================================

- `.env` is git-ignored (`.gitignore` line 8) and contains only an empty
  `VITE_OPENROUTER_API_KEY=`. No real key is committed. ✓
- Production builds do not embed an API key: `src/ai/config.js` sets
  `AI_API_KEY = ''` in non-DEV environments; `aiIsConfigured()` returns true
  only when a proxy endpoint is configured. ✓
- `vite.config.js` sets `VITE_OPENROUTER_API_KEY: ''` in the test env.
- The Netlify AI proxy authenticates with the server-side
  `OPENROUTER_API_KEY` environment variable; the frontend never sees it. ✓

Classification: No findings. Secret handling is correct.

================================================================================
3. AI PROXY (netlify/functions/ai.mjs)
================================================================================

The proxy function:
- Allows only POST (405 otherwise). ✓
- Validates JSON body, `messages` array (non-empty), and `model` field (400).
- Caps payload at 1 MB (413). ✓
- Forwards to OpenRouter with the server-side key in the `Authorization`
  header. ✓
- Maps upstream errors to generic client-facing messages:
  - 401/403 -> "AI service is not configured" / "Upstream authentication failed."
  - 429 -> "Rate limit reached. Try again shortly."
  - Other non-ok -> "Upstream error." with optional `detail`. (see S4)

No API key is reflected in responses. ✓

Finding S1 (Low): On non-ok upstream responses, the proxy returns
`{ error: 'Upstream error.', detail: data }` where `data` is the raw
upstream JSON body. This could leak OpenRouter error detail (e.g. model
names, provider messages) to the client. It does not leak the API key.
Recommendation: strip `detail` or sanitize it to a generic message.

================================================================================
4. CLIENT-SIDE AI CLIENT (src/ai/client.js)
================================================================================

- Never sends `Authorization: Bearer <key>` when using the proxy
  (`AI_USES_PROXY` is true in production). ✓
- Structured `AIError` class carries status/model/retryAfter/sanitized body
  but never the key. ✓
- Dev-only debug logging (`logAIError`, `logModelAttempt`) is gated behind
  `import.meta.env.DEV` and never logs keys/tokens. ✓
- Input validation: rejects empty prompts (>4000 chars), NOKEY when
  unconfigured. ✓
- Model fallback cascade with per-model and overall timeouts, AbortController
  cleanup, and 401/403/404/429/504 handling. ✓
- `validateGeneratedCode()` (prompt.js) validates AI output before use. ✓

Classification: No findings. AI client is securely implemented.

================================================================================
5. PREVIEW IFRAME SECURITY (src/lib/preview.js)
================================================================================

- Sandbox attribute excludes `allow-same-origin` (opaque-origin). ✓
- Each preview gets a unique nonce + generation ID. ✓
- All iframe→parent messages validated by `e.source === frame.contentWindow`,
  nonce, and generation. ✓
- Cleanup protocol: `ziiui:cleanup` → `ziiui:ack:cleanup` with matching
  nonce/generation; stale generations rejected. ✓
- `setFrameHTML` sets the sandbox attribute before assigning srcdoc/src. ✓
- `errorDoc()` escapes title/message via `esc()`. ✓

Classification: No findings. Iframe isolation is intact and correctly
implemented. (Group E Playwright test asserts no `allow-same-origin`.)

================================================================================
6. XSS / UNSAFE DOM INJECTION
================================================================================

- `src/lib/dom.js` exports `esc()` (HTML entity escaping) used by
  `errorDoc()` and docs.js. ✓
- `src/ai/chat-view.js` uses `textContent` (not `innerHTML`) for user/AI
  message text. Static SVG/loading HTML is hard-coded and trusted. ✓
- `viewer.js` `openInNewWindow()` uses `win.document.write(code)` where
  `code` is validated component/AI code opened in `_blank`. Acceptable. ✓
- Other `innerHTML` usages (chat-view loading, docs TOC/nav, ai-editor copy
  buttons, nav video controls) use hard-coded or internally generated trusted
  strings. No user-controlled HTML is inserted unescaped. ✓

Classification: No findings. XSS surface is minimal and contained.

================================================================================
7. LOCALSTORAGE / STORAGE
================================================================================

- `src/lib/storage.js`: `safeGet`/`safeSet`/`safeRemove` never throw
  (private mode, quota exceeded, blocked storage). ✓
- `uid()` uses `crypto.randomUUID()` with a fallback. ✓
- AI state persisted under `ziiui-ai-state-v2` (single source of truth).
  ✓ (architectural constraint preserved)

Classification: No findings.

================================================================================
8. CONTENT SECURITY POLICY (netlify.toml)
================================================================================

CSP header applied to `/*`:
- default-src 'self'
- script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com
  https://cdn.jsdelivr.net https://fonts.googleapis.com
- style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
  https://cdn.jsdelivr.net
- font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net
- img-src 'self' data: https:
- media-src 'self' https://zzzui.netlify.app
- connect-src 'self'
- frame-src 'self'; worker-src 'self' blob:
- base-uri 'self'; form-action 'self'

Finding S2 (Low): `script-src` and `style-src` include `'unsafe-inline'`.
This is required by the inline theme-selection script in each HTML page
(applies saved theme before first paint to prevent FOUC). Removing it would
require moving the theme script to an external file (adds a render-blocking
round-trip) or build-time nonce generation. Acceptable trade-off; documented.
No `unsafe-eval`. object-src not explicitly set (defaults to 'self' via
default-src). ✓

================================================================================
9. CORS / connect-src
================================================================================

- CSP `connect-src 'self'` only. In production, the AI proxy is at
  `/api/ai` (same origin via Netlify redirect). ✓
- In development, `VITE_AI_ENDPOINT` may point to OpenRouter directly
  (cross-origin), but this is dev-only and requires the user to configure
  their own key. ✓

Classification: No findings.

================================================================================
10. RATE LIMITING / ABUSE
================================================================================

- The Netlify AI proxy has no application-level rate limiting (IP-based or
  per-client). Netlify Functions have platform-level limits but no per-user
  quota. A malicious client could spam the proxy.

Finding S3 (Medium): No rate limiting on the AI proxy endpoint.
Mitigating factors: (a) payload capped at 1 MB, (b) model fallback cascade
consumes upstream quota on repeated failures, (c) Netlify free-tier function
invocation limits provide some protection. Recommendation: add a simple
IP-based rate limit (e.g. via Netlify's `x-nf-client-connection-ip` header
or a lightweight in-memory counter) in a future iteration. Not blocking.

================================================================================
11. ERROR RESPONSE DISCLOSURE
================================================================================

- Proxy 502 ("Could not reach OpenRouter.") and 500 ("AI service is not
  configured.") are generic. ✓
- 401/403 do not reveal upstream auth details beyond "authentication failed." ✓
- Non-ok upstream responses include `detail: data` (see S1). Low risk.

Classification: S1 (Low). No secrets or stack traces exposed.

================================================================================
12. DEPENDENCY SECURITY
================================================================================

- No npm runtime dependencies. All runtime libraries (GSAP, Lenis, Three.js,
  Remixicon, Google Fonts) are loaded via CDN from effect templates inside
  sandboxed iframes. ✓
- Dev dependencies: vite, vitest, jsdom, eslint, playwright. All pinned with
  caret ranges; no known critical vulnerabilities reported at audit time.
  `npm audit` not run offline (no network); not flagged.

Classification: No findings. (No `npm audit` possible offline.)

================================================================================
13. FINDINGS SUMMARY
================================================================================

ID   | Severity | Finding                                       | Recommendation
-----|----------|-----------------------------------------------|---------------
S1   | Low      | Proxy returns raw upstream `detail` on errors | Sanitize/remove `detail`
S2   | Low      | CSP script/style-src allow `'unsafe-inline'`  | Accept (needed for inline theme script)
S3   | Medium   | No rate limiting on AI proxy                  | Add IP-based rate limit (future iteration)

No critical or high-severity unresolved security issues.

================================================================================
14. CONCLUSION
================================================================================

The application security boundary is well-designed: secret kept server-side,
iframe sandbox preserved, no XSS with user content, errors sanitized. No
code changes are required for this phase; S1 is a minor improvement that
can be addressed without weakening any control. Existing AI functionality,
animations, and iframe security remain intact.
