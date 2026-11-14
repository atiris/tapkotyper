@echo off
rem Starts the queue runner of the installed dev-workflow plugin on this
rem repository, so every repository runs the same runner and install.ps1 of
rem the plugin repository updates it everywhere at once.
rem -DryRun and -Stop after|now run here; anything else (no arguments,
rem -Hibernate, -Model ...) starts the queue runner in its own window and returns.
set "RUNNER=$p = (Get-Content -Raw (Join-Path $HOME '.claude\plugins\installed_plugins.json') | ConvertFrom-Json).plugins.PSObject.Properties | Where-Object Name -like 'dev-workflow@*' | Select-Object -First 1; if (-not $p) { throw 'dev-workflow plugin is not installed' }; & (Join-Path $p.Value[0].installPath 'skills\workflow-init\templates\todo\run-queue.ps1') -Repo '%~dp0..'"
if /i "%~1"=="-DryRun" goto here
if /i "%~1"=="-Stop" goto here
start "todo queue" pwsh -NoExit -NoProfile -ExecutionPolicy Bypass -Command "%RUNNER%" %*
exit /b
:here
pwsh -NoProfile -ExecutionPolicy Bypass -Command "%RUNNER%" %*
