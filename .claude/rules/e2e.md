---
paths:
  - "e2e/**"
  - "playwright.config.ts"
  - "scripts/test-affected.mjs"
---

# E2E specs

- Specs run against the e2e build (`--mode e2e`, `?minActive=` shortens levels); play levels through the helpers in `e2e/helpers.ts`, which type the key the guide asks for.
- A new spec, or a source area no rule covers yet, gets its line in `RULES` in `scripts/test-affected.mjs` in the same commit; check it with `npm run test:affected -- --dry <paths>`.
- Wait for states (a selector, a `data-` value, finished animations), never for a fixed time as the condition; a spec that is red without a change is fixed or listed in the backlog, never retried until green.
- In the Playwright MCP browser (not in specs): type with `window.tapkoType(text)` and open `?fast`; use the tester profile `.e2e/tester-profile.json`, never type the super password by script.
