# 78 - Home row card and the teacher turtle's tips

The owner's request of 2026-10-28. Where the fingers go is taught once, when it is needed: right
after the new-key cards of F and J a home-row card explains the home row of the child's keyboard
(ASDF JKLÔ) and is confirmed by typing `fj fj fj`, like a new-key card. Other mentions of placing
the fingers go, except one line under the picture on the get-ready card. The setting "Inštrukcie
pre malých študentov" becomes "Oboznámiť s funkciami aplikácie": a panel above the world map where
the teacher turtle now and then tells one thing about the app, with OK and an optional second
button (for example to the help page that explains it).

Affected: `src/game/cards.ts` (home-row card, get-ready card's line), `src/game/runtime.ts`
(the card after the new keys), `src/screens/map.ts` (tips panel, the welcome card loses the
kid lines), new `src/app/teacher-tips.ts` (tips, conditions, timing), `src/storage/schema.ts`
(`settings.appTips` replaces `kidHints`; `progress.appTips` seen ids and the time of the last one;
no migration: alpha, defaults fill them), `src/screens/parent.ts`, i18n sk/en + guide + catalog,
`public/assets` (`ui-teacher` from Gemini), `src/styles.css`, `.specify` (finger-guide,
parent-controls, help), tests.

## Steps
- [x] Home-row card after the F and J new-key cards: the home row of the layout drawn as keys,
      the fingers' places, typing `fj fj fj` with marks like a new-key card; Esc skips it as the
      new-key card does. It shows when F and J have just been introduced; no setting skips it.
- [x] Finger placement said nowhere else: the intro scene's F/J line, the welcome card's home
      text and kid lines, the posture tip `home` go; on the get-ready card the home-row line sits
      under the picture (after 10 s, as now) instead of above the space bar.
- [x] `settings.appTips` (default on) in the settings as "Oboznámiť s funkciami aplikácie";
      `kidHints` goes.
- [x] Teacher tips: a list of tips with a condition each (task tips only with a task, sharing after
      a few levels...), an optional second button (label, help tab). One at a time on the map above
      the worlds, never with the welcome card or the install offer; OK marks it seen. The first four
      at most one an hour, then one every 36 hours; none when all are seen.
- [x] `ui-teacher` picture: the mentors' turtle teaching, a raised finger or a pointer, no bubble.
- [x] Specs, tests, browser check, commit.

## Done - 2026-10-28
Shipped every step. The home-row card comes right after the new-key cards of F and J; the intro
scene, the welcome card and the posture tips no longer say where the fingers go; the get-ready
card's finger line moved under the picture. Seven tips (hello, help, keyboard, progress, task,
share, range), four with a second button (a help tab or My progress). Also added: a test that every
dictionary text is still read by the code (`src/i18n/unused-keys.test.ts`), asked by the owner the
same day. Left out: nothing.
