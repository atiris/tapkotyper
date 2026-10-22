# Scenarios

Executable verification runs for an AI agent. Run one with
`otestuj .scenarios/<file>.md` (the `scenario-run` skill); write or revise one
with the `scenario-write` skill. The agent reads
[common-rules.md](common-rules.md) first, then the scenario, and runs it end to
end without questions - as a real user of the product.

Scenarios describe user intents and outcomes, not clicks, so they survive
changes of routes, APIs and design. They look for what is critically or
substantially wrong; every defect that turns up is fixed on the spot when easy,
written up in `.todo/` and queued when hard and substantial, and given one
`.todo/BACKLOG.md` line when hard and minor. After the run the `.todo` queue
runner starts on the queued plans.

Evidence goes to the gitignored directory named in `common-rules.md`; secrets
come only from the gitignored `*.protect.md` files and are never written down.

- [common-rules.md](common-rules.md) - this project's rules for every run: the
  environment, the production guard, protected files, evidence, platform rules.
  Not runnable on its own.
- [full-playthrough.md](full-playthrough.md) - S1: a new child learns the first keys
  one by one, plays all of World 1, meets Tapko and sees the stats; a parent tunes
  settings, exports and imports the profile; offline reload. Not destructive.
