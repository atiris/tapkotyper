---
paths:
  - "assets-src/**"
  - "public/assets/**"
  - "public/hands/**"
  - "scripts/assets.mjs"
  - "scripts/bg-seam.mjs"
  - "tools/hand-poser/**"
  - "src/ui/hands.ts"
---

# Pictures and hands

- Pictures come from the owner's Gemini prompts in `assets-src/PROMPTS.md`; read its "Lessons from generating" before writing or fixing a prompt and add each new lesson there. Name everyday objects plainly; exact shape words bend the pictures.
- `npm run assets` turns raw files in `assets-src/` (not committed) into `public/assets/` and the manifest; background bands are `bg-<world>-far|mid|near`, joined to repeat with `scripts/bg-seam.mjs`.
- Keyboard hands: the owner tunes poses in the hand tool (`/tools/hand-poser/` on the dev server); its rules are `assets-src/PROMPTS.md` section 12. Never generate poses beyond a starting point.
- Looking at pictures costs a lot of context: compare and judge them in a subagent when there are many.
