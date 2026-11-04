# Class overview from exported files

## What
- A "Teacher view" page (reachable from the start screen, no profile needed): the teacher
  drops in many exported profile files (one per child, from different school computers).
- It shows one table: child name, current world, keys learned, accuracy trend, time
  practised this week, the 3 weakest keys, and when the file was saved. Clicking a row
  opens the same key map as the parent dashboard (read only).
- One button prints a class sheet. Nothing is stored after the page is closed unless the
  teacher saves it; nothing leaves the computer.
- Optional: the teacher exports a class "starter file" (layout, word list, session length)
  that children import once.

## Why
- Progress reports are what teachers praise most in school tools: reviewers
  call out useful data on student progress, and school typing tools all have class reports.
- These reports need class codes or student accounts; a district guide notes the tool "will
  generate usernames and passwords for students". An account-free report is the privacy-friendly answer.
- Shared classroom devices are common (noted already in the profiles spec).

## Fit
- Keeps "no backend, no accounts": data moves only as files the teacher collects.
- Risk: collecting files is manual; fine for one class, clumsy for a whole school. That is
  acceptable for the app's scope.

## Priority
P2, effort M.
