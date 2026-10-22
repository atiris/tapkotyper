# Offline and Installable (PWA)

**Status:** new (spec: static client-side app, dictionaries loaded dynamically). **Prio:** P2.

## What
- After first visit the game works offline, including the selected language dictionary and audio.
- Installable on desktop, Chromebook and tablet like an app; school computers can open it without network.
- Dictionary files are small and cached per language; clear message if a language is not cached yet.
- Warn the user that local data is per browser; remind to export.

## Why
- Kids reviews of TypingClub mention lag and technical issues; classroom Wi-Fi is weak. [src: Common Sense Media TypingClub]
- Dance Mat site was described as glitchy and freezing. [src: https://www.commonsense.org/education/reviews/dance-mat-typing/teacher-reviews/4050761]
- Older tools (ZAV, ATF, KTouch, Klavaro, Tux Typing) are desktop installs; a web app with offline support combines both worlds. [src]
- Free GitHub Pages hosting has no server, so offline caching also reduces load for us.
