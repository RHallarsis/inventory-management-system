# Inventory App — Cheatsheet

One-page quick reference.

## URLs
- **Live (Railway):** https://pgi-ims.up.railway.app/
- **Render dashboard:** https://dashboard.render.com/ (per `render.yaml`)
- **Railway dashboard:** https://railway.app/

## Local Dev

```bash
# In E:\Projects\Inventory Management Web App\
npm install          # First-time setup
npm start            # Run server
npm run dev          # Run with --watch (auto-reload)
```

Open http://localhost:3000 (or whatever port `server.js` uses) in browser.

## Deploy

Railway auto-redeploys on push to main branch:
```bash
git add .
git commit -m "your message"
git push
```

Existing batch shortcuts (at project root):
- `push-update.bat` — quick commit + push
- `push-to-render.bat` — push then trigger Render
- `restart-server.bat` — kill + restart local node
- `run-server.bat` / `start-server.bat` — start local server
- `Start App.bat` — launches the app

## Key Files

| File | Purpose |
|---|---|
| `frontend/server.js` | Express app entry (note: lives in frontend/) |
| `frontend/db.js` | Postgres + sql.js connection |
| `frontend/routes/` | API endpoints |
| `frontend/services/` | Business logic |
| `frontend/audit.js` | Audit logging |
| `frontend/index.html` | Main dashboard UI |
| `package.json` | Deps + scripts |
| `railway.toml` | Railway deploy config |
| `render.yaml` | Render deploy config |
| `.gitignore` | Excludes node_modules, .env, logs, uploads, data |

## Dependencies (`package.json`)

- `express` `^4.18.3` — web framework
- `pg` `^8.13.1` — Postgres client
- `sql.js` `^1.12.0` — SQLite fallback
- `cors` `^2.8.5`
- `multer` `^2.1.1` — file uploads
- `nodemailer` `^6.9.13` — email
- `resend` `^6.12.3` — email API

## Environment Variables (`.env`, gitignored)

Likely needed (verify with your config):
- `DATABASE_URL` — Postgres connection string
- `RESEND_API_KEY` — Resend email
- `PORT` — server port (Railway/Render injects)
- SMTP creds for Nodemailer

## Common Tasks → Skills

| I want to... | Use skill |
|---|---|
| Add a new API route | `api-scaffolding` |
| Add a DB table/column | `database-design` + `database-migrations` |
| Fix a bug | `debugging` |
| Add chart to dashboard | `dashboard-builder` + `data-visualization` |
| Export Excel report | `xlsx` |
| Export PDF report | `pdf` |
| Audit a stock change | `signed-audit-trails` |
| Validate input | `data-validation-suite` |
| Write tests | `tdd-workflows`, `unit-testing` |
| Security check | `security-review` |
| Refactor code | `code-refactoring` |
| Clean dead code | `codebase-cleanup` |
| Polish UI | `ui-ux-pro-max` |

## Project Quirks (don't get tripped up)

- **Server code is in `frontend/`, not `backend/`** — `backend/` is currently empty
- **Drive D: is mapped as E:** on this Windows machine (volume label vs letter)
- **~40 .bat files** at root for git/push/check workflows — needs cleanup
- **`.claude/`** folder is NOT tracked by git, plugins live globally not per-project
