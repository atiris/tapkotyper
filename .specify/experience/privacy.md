# Privacy

## What
- No ads, no accounts, no cookies and no data about users. The only external request of the
  page is an anonymous visit counter (GoatCounter, no cookies, no personal data), and nothing
  is counted offline. The help page's about tab names it and shows the count it reports.
- The help page's about tab also links to reporting a bug or an idea (a GitHub issue).
- The help page's about tab says that, as everything is only on the device, a forgotten settings password
  or lost progress cannot be recovered by us, so progress should be exported now and then.
- A short, plain statement of this on the start screen and the help page's about tab, for parents.
  On the start screen it is two of its promises: "no ads, no accounts" and "your data stays on
  your device" (opens the about tab). The code's licence ("MIT · Atiris", linked to the code) sits
  small at the bottom right; the visit count is only on the about tab.
- Nothing leaves the browser except what a person copies themselves: task, result and
  move links carry their data in the address hash, which browsers never send to the server
  ([teacher links](../profiles/teacher-links.md)). A teacher's collected results stay in this
  browser's own database; nothing is synced anywhere. A `.tapko` file leaves the browser only
  when the mentor saves or shares it themselves (to carry results from a phone to a computer).
- The teacher's camera scan reads QR codes in the browser: the picture is never sent or
  stored, and the camera is off whenever the scan is not running.
- What a child types in "Just typing" is never stored; reading it aloud uses the
  browser's own voice on the device ([free typing](../game/free-typing.md)).
- The optional settings password is kept only as a salted hash in the browser's storage;
  it never leaves the device and is not part of exported files
  ([parent controls](../profiles/parent-controls.md)).

## Why
- Ads and data collection are the top complaints about popular free typing tools
  ([research](../../.research/features/privacy-no-ads.md)).
