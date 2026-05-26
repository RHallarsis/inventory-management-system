@echo off
E:
cd "E:\Projects\Inventory Management Web App"
echo === GIT LOG === > git-out.txt
git log --oneline -5 >> git-out.txt 2>&1
echo === GIT STATUS === >> git-out.txt
git status --short >> git-out.txt 2>&1
echo === LOCK CHECK === >> git-out.txt
if exist .git\index.lock (echo LOCK EXISTS >> git-out.txt) else (echo NO LOCK >> git-out.txt)
echo Done.
