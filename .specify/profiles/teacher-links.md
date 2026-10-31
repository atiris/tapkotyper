# Tasks, results and moving a player by links

## What
- **No server, links only.** Everything a link carries is inside its address hash
  (`#/task/…`, `#/result/…`, `#/move/…`), compressed, with a format version, so the data
  never reaches a web server and old links can still be told apart later.
- **Making a task** happens only on the teacher page, tab **Úlohy** (`#/teacher/tasks`): a form,
  then "Pripravené úlohy", newest first. The form asks, top to bottom: the task's name and group;
  the **game** (Prúd slov, Čakajúce slová, Odpis, Pás, Prepis); the task's **words** (for the two
  words games) or its **text** (for the three text games), only the one the game uses; the
  **limit**: Čas (typing goes on until the time is up), Text (the task ends when the whole text
  is typed) or Čas aj text (the whole text, and then on until the time is up); **use the
  dictionary when the text runs out** (on: words of the dictionary the student can type come;
  off: the task's words repeat); **only letters the student knows** (on: words with unknown
  letters are left out; off: the student learns the missing letters before the task); the
  **length** 1-30 minutes (only for a limit with time); the **world**: the student's current one
  or a random one (also one not open yet, only as a backdrop). Each choice has one line saying
  what it does. A task needs at least one word or some text.
- Making a task keeps it in the list at once and shows it: the link to copy, its QR code and
  "Veľký kód" (the task's title over the code, in a frame of its own colour). A row shows the
  title, game, limit, group and the date made, with **Ukázať**, **Upraviť** (the form fills;
  saving keeps the task's identity so its results stay together) and **Odstrániť**. The list
  keeps the last 100 tasks in this browser and is never sent anywhere. Until the task games
  exist, a task plays its words and text as a timed practice of its minutes.
- Opening a task link shows the start page with a task panel in place of its title and texts:
  **Nová úloha** with the task name, its game, limit and group, its words or text, a hint to pick
  a player, and **Zrušiť túto úlohu**. The player card asks **Pre koho je táto úloha?**; a player,
  **Vyskúšať** or **Nový hráč** takes the task. The map shows **Úloha na dnes** as its first card
  until the task is finished.
- **The player's Úlohy page** (`#/p/<id>/tasks`, the map's **Úlohy** button right under
  Pokračovať) is the child's place for tasks: **Naskenovať úlohu** (a camera window with only the
  picture, the camera choice when there are several, and one status line; a task code flashes
  green, beeps, buzzes where it can and the window closes by itself) and a field for a pasted
  link or code with **Pridať**; anything else says "Toto nie je kód úlohy.". A task added again
  only refreshes what the teacher made. Under them **Moje úlohy**, unfinished first, a new one
  marked for a moment: title, game, group, and what is left or the best run (date, minutes,
  accuracy, rhythm). **Hrať** or **Zopakovať**, and for a finished task **Odovzdať**, **QR kód**
  (the result's big code) and **Výsledok** (the best run and whether playing again improved it);
  **Odstrániť** asks first. A player keeps the last 30 tasks.
- **Best run:** a finished task keeps its best run. Playing it again starts from zero; a finished
  repeat replaces the best only when it is better (higher accuracy, at equal accuracy a higher
  rhythm); an unfinished repeat changes nothing. The hand-in and the QR code always carry the
  best run.
- **Noting a task on a phone:** a phone without a keyboard has **Nová úloha** on its start page
  ([devices](../experience/devices.md)): a page with the same camera. A task code stops the camera
  and shows the task panel with **Poslať** (the phone's share sheet, only where the phone has
  one), **E-mail** (a new e-mail with the task's name and link), **Kopírovať odkaz**, **Veľký kód**
  (for a laptop's camera on the Úlohy page) and **Skenovať ďalšiu**. Under the camera
  "Zaznačené úlohy" keeps the last 20 noted tasks (the same one once, newest first): a tap shows
  it again, an X removes it.
- **Hand-in:** after the task (and on the Úlohy page), the child gets **Odovzdať**: the end card "Úloha splnená!" (the
  one card of every end, see [mechanics](../game/mechanics.md)) with the backpack, the minutes, the
  task, "Pošli učiteľovi: odkaz alebo kód", the result link, "Kopírovať odkaz" and "Veľký kód". The link holds the player's real name
  (or the nickname when there is none),
  the task, the date, minutes played of its best run (typing time, [statistics](statistics.md)), accuracy, rhythm and the five weakest keys, a yes/no
  flag that the super player removed or changed the settings password on the child's device
  ([profiles](profiles.md)), plus a checksum; the teacher's views and the QR scan show a red
  lock by that child's name. The teacher's help says plainly that the checksum finds damaged copies, not cheating.
- **Teacher view** (`#/teacher`, from the start page footer, or by opening a result link):
  results are kept in this browser only (IndexedDB), apart from the players, so a large
  class's history does not crowd the players' storage. No accounts.
  Every hand-in is kept, once: a fingerprint of what it says (task, name, group, date, minutes,
  accuracy, rhythm, levels, weakest keys) is never stored twice, whether it came by a scan, a
  link or a file. Where a table counts a child's task once, the newest hand-in counts.
- **Sets:** results added to one group (or none) within 20 minutes of the set's first result
  form one set; later, or in another group, a new set starts. One camera scan is always one
  set, however long. A set keeps its group, start and end time, where it came from (scan, link,
  file) and its results.
- **Tabs:** Skupiny · Študenti · Súbory · Úlohy, under the intro, the scan box (the group, then "Sken QR") and below it the paste field with "Add". One line at the bottom says the camera picture goes nowhere and the results stay in this browser.
  Each tab, a set and a writer have their own address, so Back works.
  - **Skupiny:** group chips; per group a line with sets, writers, accuracy and rhythm, then one
    row per set: day, time from-to, tasks, results, "zvládli X z Y", accuracy, rhythm. On a
    computer a click on the day opens the set's writers inline; on a phone a set is a card that
    opens the set's page (tiles, "Poslať sadu", "Odstrániť sadu", sort chips, writers). CSV,
    assigning chosen sets to a group and removing them stay here.
  - **Študenti:** a search that filters while typing, the group chips, and every writer with
    group, hand-ins, the last one, accuracy and rhythm with the change from the first hand-in to
    the last (green up, red-brown down), minutes, levels, weakest keys and status; sortable
    columns on a computer, cards with sort chips on a phone.
  - **Súbory:** load a `.tapko` file (button, or dropped anywhere on the page), save everything
    as `.tapko`, "Vymazať…", and the list of loaded files (name, when, period and groups inside,
    results, what was added, "nič nové" when nothing).
- **Moving results without a server:** a `.tapko` file (JSON with a format name and version;
  each result keeps its checksum). On a phone, "Poslať do počítača" offers the whole history
  or only what came since the last send, shares the file to another app when the phone can, or
  saves it. On the computer the file is loaded whole; loading the same file or set twice adds
  nothing and says nothing about it, the message counts only what was added. An installed app
  in Chrome or Edge opens a `.tapko` file by a double click. An unknown format or version loads
  nothing and says so.
- **Cleanup:** on opening the page, hand-ins dated over a year ago are deleted once they have
  been in this browser for 7 days, and empty sets go with them; a loaded file with such results
  says how many and that they stay 7 days. "Vymazať…" deletes older than 6 months, 3 months, a
  month, 2 weeks, a week or a day (each choice shows what it takes), or all data with the list
  of files, and reminds to save as `.tapko` first.
  Results come in three ways: scanning the result QR codes on the children's screens with the
  camera, pasting a link, or opening a link.
- The page itself stays short: one line on why to type a group (a class's results stay
  together and can be filtered), the key words in bold, and a pointer to the help's teachers and parents
  tab, where everything else is explained; a teacher in a classroom reads the page at a glance.
- **Camera scan:** the teacher types the group being scanned (a class), one tap starts a
  continuous scan, and every new valid code is written into that group at once
  (green flash, a short shop-scanner beep, a buzz where the phone can). A code stays quiet
  while it is in sight and for about 7 seconds after; a code already here that comes back later
  blinks the frame orange twice, so the teacher knows it is collected. An unknown code only
  shows a short hint. A browser that reads
  several codes per picture reads several screens at once, otherwise one code at a time. A
  list of what the scan collected lets the teacher undo a wrong read. The camera stops when
  the scan ends, the screen is left or the tab is hidden; clear messages say when access is
  denied, there is no camera or the page is not secure.
- **Scanning on a phone:** after the scan starts the page scrolls so the heading
  ("Skenovanie · group"), the camera preview and the done bar fill the screen; the done bar
  counts this scan ("7 načítaných") next to "Hotovo", the list of this scan follows below.
  Hotovo stops the camera and shows the scanned group with this scan's set open.
- **Big code:** the child's hand-in can show the QR over the whole screen so it can be scanned
  across a desk: the child's name and what it is first ("Ema · Štatistiky úlohy …" in a
  green frame, "Ema · Celé moje štatistiky" in an orange one; a task's own code has only its title, in a plum frame), the code as big as fits, then
  "Kopírovať kód" and "Zatvoriť klikom na obrazovku"; a click anywhere also closes it. The
  frame's padding and the gaps between caption, code and buttons are one size.
- **A writer's page:** clicking a writer (the name in a table, the whole card on a phone)
  opens the writer's own page: name, group, hand-ins, average accuracy and rhythm with their
  change, minutes, levels (from the newest overall statistics), the four weakest keys, "Vývoj"
  with accuracy and rhythm over the hand-ins in two charts (side by side on a computer, stacked
  on a phone), and every hand-in with time, task, a link to its set, minutes, accuracy, rhythm,
  levels and status; then "Presunúť do skupiny" and "Odstrániť študenta". Two children of one
  name in two groups stay apart.
- **Groups:** a task may carry a group label (a class such as "5.A", typed in the task form).
  It travels in the task link and back in the result, with the number of levels the child has
  finished. A child mastered a task from 85 % accuracy. A later hand-in without a group keeps
  the group the teacher gave that child. CSV exports what is shown, or everything, and has a
  group column.
- **Move a player:** parent area, data tab, "Preniesť na iný počítač": a link (and QR when
  it fits) with the whole profile. A link stays under 8000 characters: older per-key day
  history (over 30 days) is dropped first, and a profile still too big goes by file export.
  Opening the link imports the player and asks before replacing one with the same id.

## Why
- A teacher wants to go back to a class's scan from last week and see how each child is getting
  on over time; keeping every hand-in in sets keeps that progress.
- A teacher scans with a phone in the classroom and reads the statistics on a computer at home;
  one file carries the results without a server, and duplicates never pile up.
- A year of history is enough for a school year; the 7 days let a teacher look at old results
  just loaded before they go.
- A teacher scans walking through a classroom with a phone in one hand: the camera and the way
  out must be on screen without scrolling. A nine-column table is unreadable on a phone;
  sorting and one child's card answer what a teacher asks ("who needs help", "how is Jakub doing").
- A teacher with 20-30 screens in a room cannot paste links one at a time; walking past the
  screens with a phone or webcam fills the table, and links stay for children working at home.
- A teacher prepares the week's tasks in one place and gives the same task to a class again;
  the task's game, limit and source say exactly what the children practise. Parents give their
  own words in the own content tab, so the settings need no task tab.
- A child keeps every task in one place, may try again for a better result without losing a
  good one, and hands in the best; the teacher sees the child's best effort.
- Pupils often have only a phone at school: noting the task from the board's QR code and sending
  it home brings it to the computer with a keyboard without typing a long link.
- Teachers and parents want to give today's task and get the child's results back, and
  a child wants to continue on another computer, without copying JSON files around.
- The app has no backend and promises that nothing leaves the browser on its own; links
  keep that promise, because only what a person copies and sends travels.
