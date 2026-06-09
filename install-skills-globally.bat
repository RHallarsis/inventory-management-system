@echo off
REM ===================================================================
REM  install-skills-globally.bat
REM  Copies all skills from this project's .claude\skills\ into the
REM  GLOBAL Claude Code skills folder so they load in EVERY session,
REM  from any directory.
REM
REM  Run once: double-click this file, or run it from a terminal.
REM  Re-run anytime to refresh the global copy.
REM ===================================================================

setlocal
set "SRC=%~dp0.claude\skills"
set "DST=%USERPROFILE%\.claude\skills"

echo.
echo Source : %SRC%
echo Target : %DST%
echo.

if not exist "%SRC%" (
  echo [ERROR] Source skills folder not found: %SRC%
  echo Run this script from the project root.
  pause
  exit /b 1
)

if not exist "%DST%" mkdir "%DST%"

echo Copying skills to global folder...
robocopy "%SRC%" "%DST%" /E /NFL /NDL /NJH /NJS /NP
echo.

REM robocopy exit codes 0-7 are success; 8+ are errors
if %ERRORLEVEL% GEQ 8 (
  echo [ERROR] robocopy reported errors ^(code %ERRORLEVEL%^).
  pause
  exit /b %ERRORLEVEL%
)

echo Counting installed skills...
set /a COUNT=0
for /d %%D in ("%DST%\*") do set /a COUNT+=1
echo.
echo [DONE] Skills now globally available: %COUNT%
echo They will load in any Claude Code session. Restart Claude Code to pick them up.
echo.
pause
endlocal
