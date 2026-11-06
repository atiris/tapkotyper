# Rhythm as evenness, not speed

Date: 2026-11-07. Proposal (P1), answers the backlog entry "Rhythm is shown as speed".
Read before: [`../../.specify/learning/feedback.md`](../../.specify/learning/feedback.md),
[`../../.specify/game/mechanics.md`](../../.specify/game/mechanics.md) (rhythm gauge),
`src/game/rhythm.ts`, `src/game/pace.ts`, `src/game/progress.ts` (`rhythmTrend`), `src/game/end-news.ts`.

Sources: **[bg]** background knowledge of keystroke-timing research (inter-key intervals, bigram
effects, skill studies), speech and music rhythm research (pairwise variability index) and classic
typing pedagogy (rhythm drills, typing to a metronome). Not verified in this pass; the numbers
below are starting points to calibrate on real sessions (the tester profile, recorded plays).

## Problem
- The top bar says "Rytmus: X písmen za minútu", the gauge, the session record (`cpm`), the
  parent statistics and the end card's "rhythm is smoother" news all measure **speed**
  (correct characters per minute, smoothed). A fast child who types in bursts gets the best
  "rhythm"; a slow, steady child gets the worst.
- The owner's order of goals is **accuracy > rhythm > speed**. Today the game has only two of
  the three numbers, and the middle one is named after the wrong thing.

## What rhythm should mean
- **Rhythm = how even the time between key presses is**, whatever the speed. A child who types
  one letter every second, every second, has a perfect rhythm; a child who types "fjf" in a
  flash and then hunts two seconds for `k` has a poor one.
- Why it matters for learning **[bg]**: classic typing courses train an even beat (drills read
  aloud or typed to a metronome) because bursts mean the fingers know some keys and hunt for
  others; an even beat makes the child slow down on easy letters and get surer on hard ones.
  Experts are not perfectly even (their bigrams differ), so the measure must not punish the
  natural differences between key pairs, only hesitation and bursts.

## Options considered

| Option | Idea | Good | Bad |
|---|---|---|---|
| CV of IKI | standard deviation / mean of the intervals | well known, scale free | one 3 s hunt dominates; drift (slowing over a level) counts as unevenness |
| Robust CV (MAD or IQR over median) | ignore outliers | stable | too robust: a burst pattern "fast fast fast slow" has a median deviation of 0, so bursts look perfect |
| Spread of log intervals | intervals are skewed; the log makes x2 slower and x2 faster equal | scale free, fair to slow typists | still global: drift counts |
| **Pairwise variability (successive log differences)** | compare each interval with the one before it (as speech rhythm research does with nPVI) | local: a slow drift or a tempo change costs nothing; bursts and hesitations show clearly; scale free | needs two neighbouring kept intervals, so breaks lose pairs |
| Timing error vs. a beat | offsets of presses from a known beat | the best measure when a beat exists | needs a beat; only the rhythm game has one ([rhythm-game.md](../game/rhythm-game.md)) |

Recommended for free typing in all levels: **pairwise variability of log intervals**, with
pauses, combos, errors and bigram classes handled as below. The rhythm game uses its own beat
measure (end of this file), which is the same idea with a known beat instead of the previous interval.

## Which intervals count
An interval is the time between two correct key **strokes**; times come from the key event's
`timeStamp` (the press itself), not `performance.now()` in the handler, which adds processing delay.

- **Combos are one stroke.** A dead-key letter (`ó` = acute + `o`, `ô`, `ä`, `č` on some
  layouts) and a capital (Shift + letter) need two presses. The stroke starts at the **first**
  press of the combo (the dead key, the Shift going down) and ends at the composed letter. The
  interval *into* the combo is measured to its first press, the time *inside* the combo is left
  out, the next interval is measured from the composed letter. So a Slovak child is not
  marked uneven for every accent.
- **Chain breaks** (the interval is dropped and the pair chain starts again):
  - the first letter of a new target (reading and finding the next word is not rhythm);
  - after a pause, a card, a resume, the paws' help, a lost focus (the existing `ready()`);
  - any interval that contains a wrong key or a Backspace (correcting is not rhythm; accuracy
    already counts the error);
  - the same key again (`ffff`): as today it adds nothing, otherwise holding a key fakes
    evenness the way it faked speed.
- **Space inside a target** (a copy row, a sentence) counts like any key: in real text the space
  is part of the beat. A space between targets is ignored, as today.
- **Long hunts inside a word count, but bounded.** One pair's log difference is clamped to 1.0
  (a factor of about 2.7), so one long search costs one strong mark, not the whole window.
  An interval over `max(2 s, 4 x the window's median)` inside a word is clamped to that cap first.
- **Key pair classes.** Hand alternation (`f j`) is naturally quicker than the same hand
  (`f d`), and the same finger on another key (`f r`, `j m`) is slower still **[bg]**. Each
  interval is divided by the child's own usual interval for its class (running median of the
  last 200 intervals of that class in the profile; before 20 of them, the defaults 0.85 / 1.0 /
  1.3 of the overall median). Fingers come from the layout's finger map that the finger guide
  already uses. Without this, a perfectly steady word list with mixed classes looks uneven.

## Recommended formula

```
stroke times t0, t1, ...           (combo = its first press; see rules above)
interval  d_i = t_i - t_(i-1)      (kept only if no chain break)
normal    n_i = d_i / classUsual(pair_i)      (hand alternation / same hand / same finger)
pair      p_i = min(1.0, |ln n_i - ln n_(i-1)|)  (only when d_i and d_(i-1) are both kept and neighbours)

window    last 30 pairs (live gauge); all pairs (session)
L         = mean(p) over the window
rhythmRaw = 100 * clamp((0.45 - L) / (0.45 - 0.10), 0, 1)     -> 0..100
shown     = min(rhythmRaw, accuracyCap)
accuracyCap = 100 * clamp((acc - 0.75) / (0.95 - 0.75), 0, 1)  (acc over the same stretch of play)
```

- `L` of 0.10 or less (pairs differ by about 10 %) is 100; 0.45 or more is 0.
- **Minimum sample:** the live gauge shows a value after 10 pairs (before that it shows a calm
  "listening" state, not zero); a session stores a score only with at least 20 pairs, else none.
- **Smoothing:** the gauge eases toward the window's value (weight 0.2 per new pair), so one
  pair never jumps it. It does **not** sink while the child is not typing: a pause is not
  unevenness, and the story's waiting words must not look like a bad rhythm.
- **Accuracy first:** the cap means rhythm can never look better than accuracy allows. At 95 %
  and more accuracy there is no cap; at 85 % the rhythm shows at most 50; at 75 % it is 0. This
  closes the hole that errors leave: wrong presses drop intervals, so without the cap a child who
  hammers wrong keys would keep only the few calm intervals and look even.
- **Speed stays a separate, third number** (correct characters per minute, the current `cpm`),
  named "Rýchlosť" and shown only as a personal trend.

### Why this one
- Scale free: a steady slow typist and a steady fast typist score the same, the owner's first test.
- Local: slowing down over a long level, or the rhythm game raising its tempo, costs nothing;
  only the change from one interval to the next counts.
- Bursts score low by construction: "fast fast fast slow" gives two big pairs out of four.
- Bounded: one hunt or one distraction cannot ruin the window (clamp, chain breaks).
- Cheap: a ring buffer of 30 numbers per press, no effect on frame time.

### Example values (to check the parameters)

| Typist | Intervals | L | rhythmRaw |
|---|---|---|---|
| Steady slow | 1000 ms, +-10 % random | about 0.07 | 100 |
| Steady fast | 250 ms, +-10 % random | about 0.07 | 100 |
| Steady with natural spread | 600 ms, +-25 % random | about 0.17 | about 80 |
| Fast bursty | 150, 150, 150, 700 ms repeating | about 0.50 (two pairs of four, each clamped at 1.0) | 0 |
| Mild bursts | 300, 300, 450 ms repeating | about 0.27 | about 51 |
| Steady but 85 % accurate | as steady slow | 0.07 | shown 50 (accuracy cap) |

## How it is shown
- **Top bar gauge:** the ring's fill is `shown / 100`, always calm colours (never red, as today).
  Tooltip: "Rytmus: 82 zo 100" plus a word for children: 0-39 "hľadáme rytmus", 40-69 "pekný
  rytmus", 70-89 "plynulý", 90-100 "ako hodinky". The ring is no longer relative to the child's
  usual speed (the "a fifth above the usual pace" rule goes away): evenness has a fixed scale.
- **Header text:** "Rytmus: X písmen za minútu" becomes the rhythm score; "písmen za minútu"
  stays only where speed is meant and is named "Rýchlosť".
- **Statistics (parent):** three lines in the owner's order: accuracy, rhythm (0-100), speed
  (letters per minute). The session record gets a `rhythm` field (0-100, null when the session
  had fewer than 20 pairs) next to `cpm`. Alpha: a new field with a default, no store migration.
- **Trend:** the median session rhythm of the last 7 days against the 7 days before (at least
  3 scored sessions on each side, else no trend). News on the end card when it grew by 5 points
  or more ("Rytmus je plynulejší ako minulý týždeň" then tells the truth). Speed news ("faster")
  stays below it in the news order, as today.
- **Level pace is not touched:** `pace.ts` measures the child's word pace (reading included) for
  target timing; that is speed and stays speed. The rocket and the dragons' flight that read
  `rhythm.ema` today need a decision (open question below).

## Test cases (unit tests for the rhythm module)
1. Steady slow (1000 ms +-10 %, 60 strokes, alternating keys): score >= 90.
2. Steady fast (250 ms +-10 %): score within 5 points of case 1.
3. Fast bursty (150/150/150/700 ms): score <= 30 and lower than case 1, although its speed is 3x higher.
4. Slow drift (900 ms rising to 1400 ms over 60 strokes, even within): score >= 85.
5. A 4 s pause between two targets: no pair is formed across it; score unchanged.
6. One 3 s hunt inside a word in a steady run: score drops by at most 20 points and is back once 30 new pairs have passed it.
7. `ó` typed as dead key + `o` in a steady run: the time between the two presses is not
   measured; the score equals the same run with plain `o`.
8. Capital (Shift + letter) in a steady run: as case 7, the stroke starts at Shift down.
9. `ffff` held or hammered: no pairs, no score change.
10. Wrong key inside a word: the interval around it is dropped; the chain restarts.
11. Fewer than 10 pairs: gauge in "listening" state; fewer than 20 in a session: `rhythm` null.
12. Steady run at 85 % accuracy: shown score at most 50; at 96 % no cap.
13. Mixed classes typed at each class's own steady time (alternation 400 ms, same finger 600 ms):
    score >= 90 once class medians are known.
14. Gauge does not sink during 10 s without typing.

## Timing against a beat (for the rhythm game)
When the game knows the beat, rhythm is measured against it, not against the previous interval.

```
o_i      = pressTime_i - beatTime_i - calibration     (ms, negative = early)
bias     = median(o) over the round                     (the child's own steady early/late lean)
MAO      = mean |o_i - bias| / T                        (T = beat period; relative, so tempo free)
catch    = caught / due letters
beatRaw  = 100 * clamp((0.25 - MAO) / (0.25 - 0.06), 0, 1) * catch
shown    = min(beatRaw, accuracyCap)
```

- Removing the child's own bias rewards a steady child who always presses a little early; the
  device's latency is removed by the calibration (see the game file).
- Hit windows are relative to the beat: "v rytme" within 0.12 T of the landing, "chytené" within
  the catch zone, otherwise a miss. Relative windows keep the game fair at every tempo; at slow
  tempo they are generous in milliseconds, which young children need.
- The same session record field `rhythm` takes the round's `shown`, so the trend uses both sources.

## Open question for the owner
- The rocket's speed (space world, "Rytmus tvojho písania poháňa raketu") and the dragons'
  flight are driven by the smoothed speed today. Drive them by the new rhythm score (a slow,
  even child flies well, matching the order of goals), or keep them on speed and change the
  story line?
