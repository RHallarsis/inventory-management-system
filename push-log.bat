@echo off
cd /d "E:\Projects\Inventory Management Web App"

if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"

git config core.editor "cmd /c exit 0"
git config pull.rebase false

echo === GIT STATUS === > push-log.txt 2>&1
git status >> push-log.txt 2>&1

echo === GIT ADD === >> push-log.txt 2>&1
git add frontend/index.html >> push-log.txt 2>&1

echo === GIT COMMIT === >> push-log.txt 2>&1
git commit -m "style: align manpower table columns" >> push-log.txt 2>&1

echo === GIT PULL === >> push-log.txt 2>&1
git pull --no-edit origin main >> push-log.txt 2>&1

echo === GIT PUSH === >> push-log.txt 2>&1
git push --set-upstream origin main >> push-log.txt 2>&1

echo === DONE === >> push-log.txt 2>&1
