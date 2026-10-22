@echo off
rem -DryRun and -Stop after|now run here; anything else (no arguments,
rem -Hibernate, -Model ...) starts the queue runner in its own window and returns.
if /i "%~1"=="-DryRun" goto here
if /i "%~1"=="-Stop" goto here
start "todo queue" pwsh -NoExit -ExecutionPolicy Bypass -File "%~dp0run-queue.ps1" %*
exit /b
:here
pwsh -ExecutionPolicy Bypass -File "%~dp0run-queue.ps1" %*
