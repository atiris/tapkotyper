<#
.SYNOPSIS
  Implements the plans listed in .todo/QUEUE.md one by one, each in its own
  clean Claude Code session.

.DESCRIPTION
  Every plan opens its own window with an interactive `claude` session named
  "todo: <plan>", working in the repository's own checkout. Watch it there, or
  type into it; afterwards it is in the /resume picker (`claude --resume <id>`).
  (`claude --bg` is not used: a background session must isolate itself in a
  worktree on its own branch and may not push to main.)

  A plan counts as finished when its session is idle and the plan has moved to
  .todo/.done/ with a clean git tree; the runner then closes the session, pauses
  and opens the next. Anything else stops the queue and leaves the window open.

  The runner window shows when the run started, how many plans finished and
  how many are left, and how long the current one has been running.

  Keys while running:  A = stop after the current plan   Q = stop now
                       L = show / hide the run order (done, current, waiting)
  From another shell:  run-queue.ps1 -Stop after | now

  -Hibernate puts the PC into hibernation when the runner ends, however it
  ended (a stopped queue still keeps its windows, they come back on wake),
  after a countdown that any key in the runner window cancels.

  Installed by the dev-workflow plugin's workflow-init skill; the plugin's copy
  is the source, so improve it there and re-run workflow-init in each repo.

.EXAMPLE
  .\run-queue.ps1 -DryRun
.EXAMPLE
  .\run-queue.ps1 -Hibernate
#>
param(
  [switch]$DryRun,
  [switch]$Hibernate,
  [int]$HibernateCountdownSeconds = 120,
  [ValidateSet('after', 'now')][string]$Stop,
  [string]$Repo = (Split-Path -Parent $PSScriptRoot),
  [int]$PauseSeconds = 180,
  [int]$StallMinutes = 15,
  [int]$QuietMinutes = 3,
  [int]$PollSeconds = 10,
  [string]$Model,
  # Internal: the body of one plan's window
  [string]$Launch,
  [string]$SessionId
)

$ErrorActionPreference = 'Stop'
$todoDir = Join-Path $Repo '.todo'
$queueFile = Join-Path $todoDir 'QUEUE.md'
# Runner state lives outside the repository, so it never dirties the tree the runner checks
$repoHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData(
    [Text.Encoding]::UTF8.GetBytes($Repo.ToLowerInvariant()))).Substring(0, 8)
$stateDir = Join-Path $env:LOCALAPPDATA "claude-todo-runner\$(Split-Path -Leaf $Repo)-$repoHash"
$stopAfterFlag = Join-Path $stateDir 'stop-after'
$stopNowFlag = Join-Path $stateDir 'stop-now'
$pidFile = Join-Path $stateDir 'runner.pid'
New-Item -ItemType Directory -Force $stateDir | Out-Null

$UnattendedPrompt = @'
This session was started by the unattended .todo queue runner (.todo/run-queue.ps1). The user is not available and will not answer: do not ask questions, do not wait for confirmation, and do not end your turn with a question or an offer. Wherever you would ask, decide yourself in the best long-term interest of the application, following CLAUDE.md, the project's own conventions and the plan, and record every non-obvious decision in the plan's progress.
Work the one plan you were given to the end: keep its progress current, build/lint/test, commit and push, and when the last step is done git mv it to .todo/.done/ with a short "## Done - YYYY-MM-DD" section (what shipped, what was left out and put in .todo/BACKLOG.md), removing its line from .todo/QUEUE.md in the same commit. A push that fails is not a blocker: keep the commit and go on. If something outside the repo blocks you (a service, the network, VPN, credentials), work around it where the plan allows; otherwise record the blocker in the plan's ## State, commit and push that, and end your turn - the runner treats a plan left in .todo/ as unfinished and stops the queue.
Work in this directory on the checked-out branch: do not create a worktree or a branch. Do not start another plan or a backlog entry, and do not end your turn while waiting on a background timer.
'@

function Get-ClaudeArgs([string]$plan, [string]$sessionId) {
  $slug = [IO.Path]::GetFileNameWithoutExtension($plan)
  $claudeArgs = @('--session-id', $sessionId, '-n', "todo: $slug", '--permission-mode', 'bypassPermissions',
    '--append-system-prompt', $UnattendedPrompt)
  if ($Model) { $claudeArgs += @('--model', $Model) }
  $claudeArgs + "Implement ``.todo/$plan``"
}

if ($Launch) {
  $host.UI.RawUI.WindowTitle = "todo: $Launch"
  # Started from inside a Claude session, these would make claude treat the plan's
  # session as its child: no transcript of its own and no entry in `claude agents`
  Get-ChildItem Env: | Where-Object { $_.Name -like 'CLAUDECODE*' -or $_.Name -like 'CLAUDE_CODE_*' -or $_.Name -eq 'CLAUDE_PID' } |
    ForEach-Object { Remove-Item "Env:$($_.Name)" }
  Set-Location $Repo
  & claude @(Get-ClaudeArgs $Launch $SessionId)
  return
}

if ($Stop) {
  $flag = if ($Stop -eq 'now') { $stopNowFlag } else { $stopAfterFlag }
  Set-Content -Path $flag -Value (Get-Date -Format o)
  Write-Host "Requested: stop $Stop. The running queue picks it up within a second."
  return
}

function Get-QueuedPlans {
  if (-not (Test-Path $queueFile)) { throw "Missing $queueFile" }
  Select-String -Path $queueFile -Pattern '^\s*-\s+(?:\[P[1-3]\]\s+)?`?([\w.-]+\.md)`?' |
    ForEach-Object { $_.Matches[0].Groups[1].Value } |
    Where-Object { $_ -notin 'BACKLOG.md', 'QUEUE.md' }
}

function Get-OpenPlans {
  Get-ChildItem -Path $todoDir -Filter '*.md' -File |
    Where-Object { $_.Name -notin 'BACKLOG.md', 'QUEUE.md' } |
    ForEach-Object Name
}

function Get-NextPlan {
  Get-QueuedPlans | Where-Object { Test-Path (Join-Path $todoDir $_) } | Select-Object -First 1
}

function Test-TreeClean {
  -not (git -C $Repo status --porcelain)
}

function Get-Session([string]$sessionId) {
  claude agents --json | ConvertFrom-Json | Where-Object { $_.sessionId -eq $sessionId } | Select-Object -First 1
}

function Find-Transcript([string]$sessionId) {
  Get-ChildItem -Path (Join-Path $HOME '.claude\projects') -Recurse -Filter "$sessionId.jsonl" -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
}

# The newest tool call or text from the session transcript, as one short line
function Get-LastActivity([string]$transcript) {
  if (-not $transcript -or -not (Test-Path $transcript)) { return '(no transcript yet)' }
  $lines = Get-Content -Path $transcript -Tail 60
  for ($i = $lines.Count - 1; $i -ge 0; $i--) {
    try { $entry = $lines[$i] | ConvertFrom-Json } catch { continue }
    if ($entry.type -ne 'assistant') { continue }
    $parts = @($entry.message.content)
    for ($j = $parts.Count - 1; $j -ge 0; $j--) {
      $part = $parts[$j]
      if ($part.type -eq 'tool_use') {
        $in = $part.input
        $detail = @($in.description, $in.file_path, $in.command, $in.pattern, $in.prompt) |
          Where-Object { $_ } | Select-Object -First 1
        return "$($part.name): $detail"
      }
      if ($part.type -eq 'text' -and $part.text.Trim()) { return "says: $($part.text.Trim())" }
    }
  }
  '(starting)'
}

$interactive = -not [Console]::IsInputRedirected -and -not [Console]::IsOutputRedirected

function Read-Key {
  if (-not $interactive -or -not [Console]::KeyAvailable) { return $null }
  [Console]::ReadKey($true).Key
}

# Ends the plan's window together with the claude session inside it
function Close-Window($window) {
  if (-not $window.HasExited) { taskkill /T /F /PID $window.Id 2>&1 | Out-Null }
}

function Format-Line([string]$text) {
  $width = if ($interactive) { [Math]::Max(40, $Host.UI.RawUI.WindowSize.Width - 1) } else { 160 }
  $flat = $text -replace '\s*[\r\n]+\s*', ' '
  if ($flat.Length -gt $width) { $flat.Substring(0, $width - 3) + '...' } else { $flat }
}

# --- report what the queue holds -------------------------------------------
$queued = @(Get-QueuedPlans)
$open = @(Get-OpenPlans)
$pending = @($queued | Where-Object { $_ -in $open })
$unqueued = @($open | Where-Object { $_ -notin $queued })
$missing = @($queued | Where-Object { $_ -notin $open })

Write-Host "Queue: $queueFile"
$n = 0
foreach ($plan in $pending) { $n++; Write-Host ("  {0}. {1}" -f $n, $plan) }
if ($missing) { Write-Host "Already done or missing (skipped): $($missing -join ', ')" -ForegroundColor DarkGray }
if ($unqueued) { Write-Host "Open plans NOT in the queue (never run): $($unqueued -join ', ')" -ForegroundColor Yellow }

if ($DryRun) {
  Write-Host ''
  Write-Host "claude: $((Get-Command claude).Source) ($(claude --version))"
  $null = claude agents --json | ConvertFrom-Json
  Write-Host 'claude agents --json: ok'
  Write-Host "git tree clean: $(Test-TreeClean)"
  foreach ($plan in $pending) {
    $shown = (Get-ClaudeArgs $plan '<new-uuid>') | ForEach-Object {
      if ($_ -eq $UnattendedPrompt) { '<unattended prompt>' } elseif ($_ -match '\s') { "`"$_`"" } else { $_ }
    }
    Write-Host "would open a window in ${Repo}: claude $($shown -join ' ')"
  }
  Write-Host "then wait for idle + plan in .todo/.done/ + clean tree, close it, pause $PauseSeconds s, next."
  if ($Hibernate) { Write-Host "when the runner ends: hibernate after a $HibernateCountdownSeconds s countdown" }
  return
}

# --- single instance --------------------------------------------------------
if (Test-Path $pidFile) {
  $otherPid = [int](Get-Content $pidFile)
  if (Get-Process -Id $otherPid -ErrorAction SilentlyContinue) {
    throw "Another runner is active (PID $otherPid). Stop it with -Stop now, or delete $pidFile if it is stale."
  }
}
Set-Content -Path $pidFile -Value $PID
Remove-Item $stopAfterFlag, $stopNowFlag -ErrorAction SilentlyContinue

$runLog = Join-Path $stateDir 'runner.log'
function Write-Log([string]$text) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $text"
  Add-Content -Path $runLog -Value $line
  Write-Host $line
}

$runnerStarted = Get-Date
$history = [System.Collections.Generic.List[object]]::new()
$showList = $false

function Format-Span([TimeSpan]$span) {
  '{0:00}:{1:mm\:ss}' -f [Math]::Floor($span.TotalHours), $span
}

# Redraws the runner screen: run statistics, the given lines, the optional run order, the keys
function Show-Status([string[]]$lines, [switch]$NoKeys) {
  if ($interactive) { Clear-Host }
  $left = @(Get-QueuedPlans | Where-Object { Test-Path (Join-Path $todoDir $_) })
  $finished = @($history | Where-Object Outcome -eq 'finished').Count
  Write-Host ('todo queue  started {0:yyyy-MM-dd HH:mm} ({1} ago)   finished {2}   left {3}' -f
    $runnerStarted, (Format-Span ((Get-Date) - $runnerStarted)), $finished, $left.Count)
  Write-Host ''
  foreach ($line in $lines) { Write-Host (Format-Line $line) }
  Write-Host ''
  if ($showList) {
    Write-Host 'order'
    $i = 0
    foreach ($h in $history) {
      $i++
      Write-Host (Format-Line ('  {0,2}. {1:HH:mm}  {2}  {3}  - {4}' -f $i, $h.Start, (Format-Span $h.Duration), $h.Plan, $h.Outcome))
    }
    foreach ($p in $left) {
      $i++
      $mark = if ($p -eq $plan) { 'now    ' } else { 'waiting' }
      Write-Host (Format-Line ('  {0,2}. {1}           {2}' -f $i, $mark, $p))
    }
    Write-Host ''
  }
  if ($NoKeys) { return }
  Write-Host ('keys     [A] stop after this plan: {0}   [Q] stop now   [L] order: {1}' -f
    $(if ($stopAfter) { 'ON' } else { 'off' }), $(if ($showList) { 'shown' } else { 'hidden' }))
}

$stopAfter = $false
$result = 'queue empty'
try {
  while ($true) {
    $plan = Get-NextPlan
    if (-not $plan) { $result = 'queue empty'; break }
    if (-not (Test-TreeClean)) { $result = "git tree is not clean, not starting $plan"; break }

    $sid = [guid]::NewGuid().ToString()
    $launchArgs = @('-NoProfile', '-File', "`"$PSCommandPath`"", '-Launch', $plan, '-SessionId', $sid, '-Repo', "`"$Repo`"")
    if ($Model) { $launchArgs += @('-Model', $Model) }
    $window = Start-Process pwsh -ArgumentList $launchArgs -PassThru
    $started = Get-Date
    if ($interactive) { $host.UI.RawUI.WindowTitle = "todo queue: $plan" }
    Write-Log "started $plan as session $sid"

    $transcript = $null
    $idleSince = $null
    $outcome = $null
    $nextPoll = Get-Date
    while (-not $outcome) {
      switch (Read-Key) {
        'A' { $stopAfter = -not $stopAfter; $nextPoll = Get-Date }
        'L' { $showList = -not $showList; $nextPoll = Get-Date }
        'Q' { $outcome = 'stopped now' }
      }
      if (Test-Path $stopAfterFlag) { $stopAfter = $true; Remove-Item $stopAfterFlag }
      if (Test-Path $stopNowFlag) { $outcome = 'stopped now'; Remove-Item $stopNowFlag }
      if ($outcome) { Close-Window $window; break }

      if ((Get-Date) -ge $nextPoll) {
        $nextPoll = (Get-Date).AddSeconds($PollSeconds)
        $session = Get-Session $sid
        if (-not $transcript) { $transcript = Find-Transcript $sid }
        $state = if ($window.HasExited) { 'closed' } elseif ($session) { $session.status } elseif ($transcript) { 'running' } else { 'starting' }
        if ($state -eq 'starting' -and ((Get-Date) - $started).TotalMinutes -ge 2) { $state = 'did not start' }
        $idle = $state -in 'idle', 'closed'
        if ($idle -and -not $idleSince) { $idleSince = Get-Date }
        if (-not $idle) { $idleSince = $null }

        $planDone = -not (Test-Path (Join-Path $todoDir $plan)) -and (Test-Path (Join-Path $todoDir ".done\$plan"))
        # `claude agents` can keep reporting a session busy after its last turn ended;
        # a done plan whose transcript stopped growing counts as idle too
        $quiet = $transcript -and ((Get-Date) - (Get-Item $transcript).LastWriteTime).TotalMinutes -ge $QuietMinutes
        if ($planDone -and ($idle -or $quiet)) {
          $outcome = if (Test-TreeClean) { 'finished' } else { 'finished, but the git tree is not clean' }
          Close-Window $window
        }
        elseif ($state -eq 'closed') { $outcome = 'window closed without finishing the plan' }
        elseif ($state -eq 'did not start') {
          $outcome = 'session did not start (a dialog in its window?)'
          Close-Window $window
        }
        elseif ($idleSince -and ((Get-Date) - $idleSince).TotalMinutes -ge $StallMinutes) {
          $outcome = "idle for $StallMinutes min without finishing the plan"
        }

        Show-Status @(
          "plan     .todo/$plan"
          "session  $sid  ($state, working for $(Format-Span ((Get-Date) - $started)))"
          "now      $(Get-LastActivity $transcript)"
          "watch    the window 'todo: $([IO.Path]::GetFileNameWithoutExtension($plan))'; later: claude --resume $sid"
        )
      }
      Start-Sleep -Milliseconds 250
    }

    $history.Add([pscustomobject]@{ Plan = $plan; Start = $started; Duration = (Get-Date) - $started; Outcome = $outcome })
    Write-Log "$plan -> $outcome"
    if ($outcome -ne 'finished') { $result = "$plan $outcome - open it with: claude --resume $sid"; break }
    if ($stopAfter) { $result = "stopped after $plan as requested"; break }

    $resume = (Get-Date).AddSeconds($PauseSeconds)
    $nextDraw = Get-Date
    while ((Get-Date) -lt $resume) {
      $key = Read-Key
      if ($key -eq 'L') { $showList = -not $showList; $nextDraw = Get-Date }
      if ($key -eq 'A' -or $key -eq 'Q' -or (Test-Path $stopAfterFlag) -or (Test-Path $stopNowFlag)) { $stopAfter = $true; break }
      if ($interactive -and (Get-Date) -ge $nextDraw) {
        $nextDraw = (Get-Date).AddSeconds(1)
        Show-Status @("pause    next plan in $([Math]::Ceiling(($resume - (Get-Date)).TotalSeconds)) s   ([A] or [Q] ends the queue here)")
      }
      Start-Sleep -Milliseconds 250
    }
    if ($stopAfter) { $result = "stopped after $plan as requested"; break }
  }
}
finally {
  Remove-Item $pidFile, $stopAfterFlag, $stopNowFlag -ErrorAction SilentlyContinue
  if ($interactive) { $host.UI.RawUI.WindowTitle = 'todo queue: stopped' }
}
$showList = $true
$plan = $null
Show-Status @("ended    $result") -NoKeys
Write-Log "runner ended: $result"

if ($Hibernate) {
  $hibernateAt = (Get-Date).AddSeconds($HibernateCountdownSeconds)
  $cancelled = $false
  Write-Host "Hibernating at $($hibernateAt.ToString('HH:mm:ss')) - press any key here to cancel."
  while ((Get-Date) -lt $hibernateAt) {
    if (Read-Key) { $cancelled = $true; break }
    if ($interactive) { $host.UI.RawUI.WindowTitle = "todo queue: hibernate in $([Math]::Ceiling(($hibernateAt - (Get-Date)).TotalSeconds)) s (any key cancels)" }
    Start-Sleep -Milliseconds 250
  }
  if ($cancelled) {
    Write-Log 'hibernate cancelled'
  }
  else {
    Write-Log 'hibernating'
    shutdown.exe /h
  }
}
