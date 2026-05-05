@echo off
cd /d "E:\Projects\Inventory Management Web App"
echo Checking each commit for a complete index.html...
for /f "tokens=1" %%c in ('git log --oneline --format^=%%H frontend/index.html') do (
  echo.
  echo Commit: %%c
  git show %%c:frontend/index.html 2>nul | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const lines=d.split('\n');console.log('  Lines:',lines.length,'Has /body:',d.includes('</body>'),'Has /html:',d.includes('</html>'));})"
)
