# Tasks, results and moving a player by links

## What
- **No server, links only.** Everything a link carries is inside its address hash
  (`#/task/…`, `#/result/…`, `#/move/…`), compressed, with a format version, so the data
  never reaches a web server and old links can still be told apart later.
- **Task** (parent area, tab "Úloha"): a name, own words and/or a text, 1-20 minutes, and
  what to play: free practice of only the task's words, or the next story levels with the
  task's words mixed in mostly. The result is a link to copy and a QR code (when the link
  fits in one). It can also be given straight to the current player.
- Opening a task link asks which player takes it (or creates a new one). The map then
  shows **Úloha na dnes** as its first card until the minutes are played; a story task
  may take several levels, and leaving a level early does not count it.
- **Hand-in:** after the task, the child gets **Odovzdať**: a result link and the short
  instruction to send it to the mentor (Edupage, e-mail). It holds the player's real name
  (or the nickname when there is none),
  the task, the date, minutes played, accuracy, rhythm and the five weakest keys, plus a
  checksum. The UI says plainly that the checksum finds damaged copies, not cheating.
- **Teacher view** (`#/teacher`, from the start page footer, or by opening a result link):
  results are kept in this browser only, apart from the players, one row per child and task
  (a newer hand-in replaces the older one), with delete and CSV export. No accounts.
  Results come in three ways: scanning the result QR codes on the children's screens with the
  camera, pasting a link, or opening a link.
- The page itself stays short: one line on why to type a group (a class's results stay
  together and can be filtered), the key words in bold, and a pointer to the help's Mentoring
  tab, where everything else is explained; a teacher in a classroom reads the page at a glance.
- **Camera scan:** the teacher types the group being scanned (a class), one tap starts a
  continuous scan, and every new valid code is written into that group at once
  (green flash, soft tick), a code seen again is ignored, a changed result of the same child
  replaces the older one, an unknown code only shows a short hint. A browser that reads
  several codes per picture reads several screens at once, otherwise one code at a time. A
  list of what the scan collected lets the teacher undo a wrong read. The camera stops when
  the scan ends, the screen is left or the tab is hidden; clear messages say when access is
  denied, there is no camera or the page is not secure.
- **Scanning on a phone:** after the scan starts the page scrolls so the heading
  ("Skenovanie · group"), the camera preview and the done bar fill the screen; the done bar
  counts this scan ("7 načítaných", under it "5 nových · 2 aktualizované") next to "Hotovo",
  the list of this scan follows below. Hotovo stops the camera and shows the results of the
  scanned group.
- **Big code:** the child's hand-in can show the QR over the whole screen so it can be scanned
  across a desk: the child's name and what it is first ("Ema · Štatistiky cvičenia …" in a
  green frame, "Ema · Celé moje štatistiky" in an orange one), the code as big as fits, then
  "Kopírovať kód" and "Zatvoriť klikom na obrazovku"; a click anywhere also closes it. The
  frame's padding and the gaps between caption, code and buttons are one size.
- **Sorting and tasks:** a task picker ("Všetky úlohy" or one task with its count) sits by the
  group chips. Inside each group and task the children sort by name, date, minutes, accuracy,
  rhythm, levels or status (first click: numbers and dates from the highest, names and status
  from the top with "Precvičiť" first; a second click flips; ties by name). On a computer the
  column headers sort; below 700 px the table becomes a list of cards with a row of sort chips,
  each card showing the sorted value big. The summary and CSV follow the filters.
- **A child's card:** clicking a child (the name in the table, the whole card on a phone)
  opens the child's own page (with its address, so Back returns to the list): name, group,
  number of tasks, average accuracy and rhythm, minutes in total, levels (from the newest
  overall statistics), the four weakest keys, every task with date, minutes, rhythm, status
  and accuracy, and "Presunúť do skupiny" and "Odstrániť žiaka". Two children of one name in
  two groups stay apart.
- **Groups:** a task may carry a group label (a class such as "5.A", typed in the task form).
  It travels in the task link and back in the result. The teacher's table has filter chips
  (all, each group, without a group), is grouped group > task > child, and shows the result
  count and a one-line summary of the shown children and of each group: how many mastered the
  task (accuracy from 85 %), average accuracy and rhythm, levels finished. A result also carries
  the number of levels the child has finished. Rows without a group (older links) can be chosen and assigned to a group; a later
  hand-in of the same child keeps an assigned group. CSV exports what is shown, or everything,
  and has a group column.
- **Move a player:** parent area, data tab, "Preniesť na iný počítač": a link (and QR when
  it fits) with the whole profile. A link stays under 8000 characters: older per-key day
  history (over 30 days) is dropped first, and a profile still too big goes by file export.
  Opening the link imports the player and asks before replacing one with the same id.

## Why
- A teacher scans walking through a classroom with a phone in one hand: the camera and the way
  out must be on screen without scrolling. A nine-column table is unreadable on a phone;
  sorting and one child's card answer what a teacher asks ("who needs help", "how is Jakub doing").
- A teacher with 20-30 screens in a room cannot paste links one at a time; walking past the
  screens with a phone or webcam fills the table, and links stay for children working at home.
- Teachers and parents want to give today's task and get the child's results back, and
  a child wants to continue on another computer, without copying JSON files around.
- The app has no backend and promises that nothing leaves the browser on its own; links
  keep that promise, because only what a person copies and sends travels.
