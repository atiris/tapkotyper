# Tasks, results and moving a player by links

## What
- **No server, links only.** Everything a link carries is inside its address hash
  (`#/task/…`, `#/result/…`, `#/move/…`), compressed, with a format version, so the data
  never reaches a web server and old links can still be told apart later.
- **Making a task** happens only on the teacher page, **Úlohy › Nová úloha** (`#/teacher/tasks/new`): a
  form; a saved task opens among the prepared ones, **Úlohy › Pripravené úlohy** (`#/teacher/tasks/ready`,
  the tab names how many there are), newest first. The form asks, top to bottom: the task's name and its group side by side, the same height, each with one line under it (the name: the student sees it on their Tasks page and on the card before typing; the group, a choice of the teacher's groups, **Nová skupina…** (asks the name) or **Bez skupiny**: the results of this task go into it when the student has no group yet);
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
- **Uložiť ako novú úlohu** keeps the task in the list at once and opens it. A row of the list shows
  the title, game and limit, group and the day made, and a square QR button. On a computer the
  task opens in a panel beside the list: its title and summary, its QR code, **Kopírovať odkaz**,
  **Veľký kód** (the task's title over the code, in a frame of its own colour), **Upraviť** (the
  form fills; saving keeps the task's identity so its results stay together) and **Odstrániť**
  (asks first). On a phone it is a page of its own with the title, a round X (and Esc) to close,
  the QR code, **Zdieľať odkaz** (only with a share sheet), **Kopírovať odkaz**, **Upraviť** and
  **Odstrániť**. The list keeps the last 100 tasks in this browser and is never sent anywhere. How
  a task plays: its [games](../game/task-games.md).
- Opening a task link shows the start page with a task panel in place of its title and texts:
  **Nová úloha** with the task name, its game, limit and group, its words or text, a hint to pick
  a player, and **Zrušiť túto úlohu**. The player card asks **Pre koho je táto úloha?**; a player,
  **Vyskúšať** or **Nový hráč** takes the task. The map shows **Úloha na dnes** as its first card
  until the task is finished.
- **The player's Úlohy page** (`#/p/<id>/tasks`, the map's **Úlohy** button right under
  Pokračovať) is the child's place for tasks: **Naskenovať úlohu** (a camera window with only the
  square picture with its camera switch when there are several, and one status line; a task code flashes
  green, beeps, buzzes where it can and the window closes by itself) and a field for a pasted
  link or code with **Pridať**; anything else says "Toto nie je kód úlohy.". A task added again
  only refreshes what the teacher made. Under them **Moje úlohy**, unfinished first, a new one
  marked for a moment: title, game, group, and what it asks (its minutes or its whole text) or the best run (date, minutes,
  accuracy, rhythm). **Hrať** or **Zopakovať**, and for a finished task **Odovzdať**, **QR kód**
  (the result's big code) and **Výsledok** (the best run and whether playing again improved it);
  **Odstrániť** asks first. A player keeps the last 30 tasks.
- **Best run:** a task is played in one sitting, its limit ends it; leaving early keeps nothing.
  A finished task keeps its best run. Playing it again starts from zero and replaces the best only
  when it is better (higher accuracy, at equal accuracy a higher rhythm). The hand-in and the QR
  code always carry the best run.
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
- **Three parts** as tabs over the page: **Výsledky** (results come in), **Hodnotenie** (sub tabs
  Skupiny · Študenti · Súbory · Dáta) and **Úlohy** (Nová úloha · Pripravené úlohy). Each part,
  sub tab, card and page has its own address (`#/teacher`, `/scan`, `/link`,
  `/eval/groups|students|files|data|import`, `/student/<key>`, `/set/<id>`, `/tasks/new|ready`,
  `/task/<id>`), so Back, Forward and a reload work; the tabs' older addresses lead to their parts.
  Closing a card or a page goes back to the list it was opened from, else (reached by its address)
  to the list it belongs to, never out of the teacher's page. Each part has at
  most one short line saying what it is for; the help's teachers and parents tab explains the
  rest. Buttons with text carry no icons.
- **Výsledky:** one line ("Tu môžete načítať výsledky študentov skenovaním alebo sa tu objavia po
  kliknutí na odkaz s výsledkom…") with **Naskenovať QR** and **Načítať odkaz**; a phone shows only
  **QR sken** across the page. Below, **Posledné pridané výsledky**: the results added last, by
  group, the group with the newest addition first: a group row ("Skupina 5.A", "6 načítaných")
  opens Skupiny filtered to it, a student row (name, task, accuracy, rhythm) the student's card.
  A result link that opened the page says in one line under the buttons whether it was added,
  was here already or is damaged.
- **Every hand-in is kept, once.** A result carries the player's hidden id (a short hash of the
  profile's id, telling nothing of the child) and which run of the task it is; the player id, the
  task and the run name one hand-in. The same hand-in again adds nothing; another copy of the same
  run that says something else (edited or damaged) is dropped and the stored one stays; another
  run of the task is another hand-in. Older results without the id are told apart by a
  fingerprint of what they say. Each hand-in remembers every way it came in: a scan, a link, a
  loaded file. Where a table counts a child's task once, the newest hand-in counts.
- **Students and groups:** a student is one player id (an older result without one: the name in
  its group). All of a student's results are in one group. A result of a student here already
  joins that student and its group, whatever group or name it carries; a new student takes the
  task's group, else none ("Bez skupiny"). Group names that differ only in case, spaces or dots
  ("5a", "5.A") are one group, spelt as it came first. A group exists while a student is in it.
  Nothing asks for a group before scanning or loading a link.
- **Sets:** results added to one group (or none) within 20 minutes of the set's first result
  form one set; later, or in another group, a new set starts. One camera scan is always one
  set per group, however long. A set keeps its group, start and end time, where it came from
  (scan, link, file) and its results; a set whose students all move to another group moves too.
- **Skenovanie** (`#/teacher/scan`): the camera picture as a square from its middle, an aim frame,
  and, with several cameras, a semi-transparent switch in its corner that moves to the next one.
  On a phone a fullscreen button sits beside it, and any scan (also the child's) goes fullscreen on
  its own so the picture is as large as can be; leaving gives the screen back only when the scan
  turned it on and the user did not touch the button since.
  Beside it (under it on a phone) "Načítané" with "7 načítaných", what this scan read, newest
  first, each with a round button to take it back, and **Zrušiť** (asks, then takes this scan's
  results back) and **Hotovo** (to Hodnotenie › Študenti, filtered to the scan's group when they
  share one). A phone shows the scan as a page of its own: on its height the camera and its row
  take at most the top three fifths, the list scrolls, the buttons stay at the bottom; on its
  side the camera fills the left, the list and the buttons the right.
- **Camera scan:** every new valid code is added at once (green flash, a short shop-scanner
  beep, a buzz where the phone can). A code stays quiet while it is in sight and for about 7
  seconds after; a code already here that comes back later blinks the frame orange twice, so the
  teacher knows it is collected. An unknown code only shows a short hint. A browser that reads
  several codes per picture reads several screens at once, otherwise one code at a time. The
  camera stops when the scan ends, the page is left or the tab is hidden; clear messages say when
  access is denied, there is no camera or the page is not secure.
- **Načítanie odkazu** (`#/teacher/link`, a computer's way): the same page with a field for the
  whole link and **Spracovať** in place of the camera. A read link joins the list and the field
  empties; one that is not a result link says "Odkaz je nesprávny, nepodarilo sa ho spracovať."
  at the bottom of the column, so the button never moves.
- **Hodnotenie › Skupiny:** a group choice (Všetky skupiny, the groups, Bez skupiny) and
  **Stiahnuť CSV** (what is shown), then one row per set: day, time from-to, group, tasks,
  results, "zvládli X z Y", accuracy, rhythm. On a computer a click on a row opens the set's
  students inline; on a phone a set is a row (tasks, day and time, group, results, accuracy,
  "X/Y zvládli") that opens the set's page (tiles and its students, closed by a round X).
- **Hodnotenie › Študenti:** a search by part of the name, the group choice (students without a
  group counted: "Bez skupiny (4)") and **Stiahnuť CSV**; every student with a box to tick, the
  name (opens the card), group, hand-ins, the last one, accuracy and rhythm, sortable on a
  computer. Ticked students show "Vybraní: N" with **Preradiť do** (the groups, **Nová skupina…**
  asking the name in a small dialog, **Bez skupiny**) and **Preradiť**. A phone shows rows.
- **A student's card** (results only): on a computer the path "Študenti › group › name", on a
  phone the name with the group under it and a round X (Esc closes it too), without the page's
  bar and tabs. Four tiles (average accuracy, characters a minute, minutes of practice, levels
  passed from the newest result that says them), "Vývoj" with accuracy and rhythm over the
  hand-ins in two charts, and every hand-in with task, date, minutes, accuracy, rhythm and the
  weakest keys. Moving and deleting students are done in Študenti and Dáta.
- **Hodnotenie › Súbory:** the `.tapko` files loaded here (name, when, period and groups inside,
  results, what was added, "nič nové" when nothing).
- **Hodnotenie › Dáta:** **Prenos** (Export výsledkov, Import výsledkov), **Skupiny a študenti**
  (Premenovať skupinu, Zlúčiť skupiny, Zlúčiť študentov) and **Mazanie** (Zmazať študentov
  skupiny, Zmazať študenta, Zmazať skupinu, Zmazať súbory, Zmazať všetky dáta). Each opens a small
  dialog (a sheet from the bottom on a phone) with a round X, its choices and **Zrušiť** /
  **Potvrdiť** (a red **Zmazať** for deleting): renaming to a name spelt like another group
  merges them; merging students moves the old profile's hand-ins to the other student (later
  results of the old player id follow); deleting a group leaves its students without one;
  deleting a file deletes the hand-ins that came only from deleted files. A button with nothing
  to act on is off.
- **Moving results without a server:** **Export výsledkov** saves every result as one
  `tt-YYYYMMDDHHMMSS.tapko` file (JSON with a format name and version; each result keeps its
  checksum and its student); a phone that can share files offers the share sheet instead.
  **Import výsledkov** (`#/teacher/eval/import`) is a place to drop a file with **Vybrať súbor**;
  a file dropped anywhere on the teacher page loads too, and an installed app in Chrome or Edge
  opens a `.tapko` file by a double click. One line then says "Súbor … je v poriadku, výsledky
  sú načítané." or why not (an unknown format or version loads nothing). Loading the same file
  twice adds nothing; a student of the file joins the one here with the same player id.
- **Cleanup:** on opening the page, hand-ins dated over a year ago are deleted once they have
  been in this browser for 7 days, and empty sets go with them.
- **Big code:** the child's hand-in can show the QR over the whole screen so it can be scanned
  across a desk: the child's name and what it is first ("Ema · Štatistiky úlohy …" in a
  green frame, "Ema · Celé moje štatistiky" in an orange one; a task's own code has only its title, in a plum frame), the code as big as fits, then
  "Kopírovať kód" and "Zatvoriť klikom na obrazovku"; a click anywhere also closes it. The
  frame's padding and the gaps between caption, code and buttons are one size.
- **Groups in tasks:** a task may carry a group label (a class such as "5.A", chosen in the task
  form). It travels in the task link and back in the result, with the number of levels the child
  has finished. A child mastered a task from 89 % accuracy, the game's lowest step of its accuracy
  scale. CSV exports what is shown and has a group column.
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
  out must be on screen without scrolling. A nine-column table is unreadable on a phone; rows
  and one child's card answer what a teacher asks ("who needs help", "how is Jakub doing").
- The page had grown into one long screen of fields, tabs and dialogs; three parts (results in,
  evaluation, tasks) with one line each let a teacher in a classroom read it at a glance, and the
  tools that change data sit in one place, each asking first.
- Asking for a group before every scan cost time and made mistakes; the task's group and the
  student's own group place each result, and the teacher sorts only the new students without one.
- A child who renames the profile or plays a task again stays one student, and an edited or
  damaged copy of a hand-in can never replace the one the teacher has.
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
