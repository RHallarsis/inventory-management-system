@echo off
cd /d "E:\Projects\Inventory Management Web App"

echo Using temp index to bypass corrupt index...
set GIT_INDEX_FILE=.git\index_temp

:: Build a fresh index from HEAD
git read-tree HEAD

:: Stage all current changes on top
git add -A

:: Commit using the temp index
git commit -m "fix: audit log - unique element IDs and col variable fix"

:: Clean up temp index
set GIT_INDEX_FILE=

:: Now pull and push
git pull --no-edit origin main
git push --set-upstream origin main

echo.
echo Done! Check Railway for deployment.
timeout /t 8
