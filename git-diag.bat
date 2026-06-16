@echo off
cd /d "E:\Projects\Inventory Management Web App"
echo === GIT VERSION === > git-diag-out.txt
git --version >> git-diag-out.txt 2>&1
echo === STATUS === >> git-diag-out.txt
git status >> git-diag-out.txt 2>&1
echo === INDEX EXISTS === >> git-diag-out.txt
if exist ".git\index" (echo YES - index exists) >> git-diag-out.txt
echo === DELETE INDEX === >> git-diag-out.txt
del /f /q ".git\index" >> git-diag-out.txt 2>&1
echo ERRORLEVEL=%ERRORLEVEL% >> git-diag-out.txt
echo === INDEX AFTER DELETE === >> git-diag-out.txt
if exist ".git\index" (echo STILL EXISTS) else (echo DELETED OK) >> git-diag-out.txt
echo === GIT RESET === >> git-diag-out.txt
git reset >> git-diag-out.txt 2>&1
echo ERRORLEVEL=%ERRORLEVEL% >> git-diag-out.txt
echo === STATUS AFTER RESET === >> git-diag-out.txt
git status >> git-diag-out.txt 2>&1
echo === DONE === >> git-diag-out.txt
timeout /t 3
