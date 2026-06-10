# Inventory Management Web App — Project Memory

Auto-loaded by Claude Code when working in this folder. Single source of truth for project context.

## 1. Identity

- **Owner:** Rogen Hallarsis (rogen.hallarsis29@gmail.com)
- **Project root:** `E:\Projects\Inventory Management Web App\`
- **Purpose:** Inventory management web app with a management dashboard. Track stock, surface KPIs, generate reports for leadership.
- **Audience:** Internal — warehouse staff, managers, admins.

## 2. Live Deployments

| Environment | URL | Config file |
|---|---|---|
| Railway (primary) | https://pgi-ims.up.railway.app/ | `railway.toml` |
| Render (backup) | (see Render dashboard) | `render.yaml` |

Railway runs `npm start` → `node backend/server.js` per `package.json`.

## 3. Tech Stack (actual, detected)

- **Frontend:** Plain HTML + CSS + JS, Chart.js (`frontend/index.html`, `frontend/chart.min.js`)
- **Backend:** Node.js ≥18, Express 4 (currently `frontend/server.js`)
- **Database:** PostgreSQL via `pg` (prod), `sql.js` SQLite fallback (local)
- **Email:** Nodemailer + Resend
- **File uploads:** Multer
- **CORS:** `cors` package


## 4. Project Structure

```
Inventory Management Web App/
├── .claude/              # Local Claude settings (NOT committed)
├── .git/
├── .gitignore
├── package.json          # Node deps + start scripts
├── railway.toml          # Railway deploy config
├── render.yaml           # Render deploy config
├── CLAUDE.md             # This file
├── SKILLS-REFERENCE.md   # Plugin quick-lookup
├── CHEATSHEET.md         # One-page commands & URLs
├── backend/              # (empty — server code lives in frontend/ for now)
├── frontend/             # ⚠ Contains BOTH UI and server code
│   ├── server.js         # Express app entry
│   ├── db.js             # DB connection
│   ├── database.js
│   ├── audit.js
│   ├── routes/           # API endpoints
│   ├── services/         # Business logic
│   ├── utils/
│   ├── workers/
│   ├── data/             # Local SQLite (gitignored)
│   ├── uploads/          # Multer dest (gitignored)
│   ├── index.html        # Main UI
│   ├── chart.min.js
│   └── package.json      # Frontend-scope deps
└── Reports/              # Generated reports output
```

### Known structural quirk
Server code (`server.js`, `routes/`, `services/`, `db.js`) currently lives **inside `frontend/`** instead of `backend/`. The `backend/` folder exists but is empty. Refactoring is on the TODO list — use the `code-refactoring` skill when ready.

### Scaffolding cruft to consider cleaning
The root contains ~40 `.bat` files (`check_*.bat`, `fix_*.bat`, `push-*.bat`, `do-*.bat`, etc.) and the frontend contains one-off helpers (`_check.js`, `_check2.js`, `fix_double_exports.js`, `fix_chartjs_local.js`, etc.). Use `codebase-cleanup` + `shell-scripting` to consolidate.

## 5. Key Features

Built / in progress:
- Express API with routes, services, workers
- Postgres + SQLite fallback
- File uploads (Multer)
- Email notifications (Nodemailer + Resend)
- Dashboard UI with Chart.js
- Audit logging hooks (`audit.js`)
- Render + Railway deploys

Planned:
- Stock tracking (products, categories, suppliers, locations, movements)
- Role-based access (admin, warehouse, manager)
- Low-stock alerts & reorder points
- Excel/PDF exports for management


## 6. Installed Plugins — 65 total, 1,460 capabilities

Across 5 marketplaces: `claude-code-workflows`, `superpowers-marketplace`, `everything-claude-code`, `awesome-claude-skills`, `ui-ux-pro-max-skill`, `anthropic-agent-skills`.

Skill picks organized by use case:

### Planning & Architecture
`writing-plans`, `brainstorming`, `architecture-decision-records`, `c4-architecture`, `product-capability`

### Database (Postgres)
`database-design`, `postgres-patterns`, `database-migrations`, `database-cloud-optimization`

### Backend (Node / Express)
`api-scaffolding`, `api-design`, `backend-development`, `backend-patterns`, `backend-api-security`, `api-testing-observability`

### Frontend / Dashboard
`dashboard-builder`, `ui-ux-pro-max`, `ui-design`, `frontend-design`, `frontend-patterns`, `theme-factory`, `data-visualization`, `frontend-mobile-development`, `multi-platform-apps`

### Inventory Domain
`inventory-demand-planning`, `returns-reverse-logistics`, `carrier-relationship-management`, `logistics-exception-management`, `quality-nonconformance`

### Audit & Validation
`signed-audit-trails` *(critical — every stock movement)*, `data-validation-suite`

### Reports for Management
`xlsx`, `pdf`, `docx`, `business-analytics`

### Testing & QA
`tdd-workflows`, `unit-testing`, `e2e-testing`, `webapp-testing`, `qa-orchestra`, `performance-testing-review`

### Security & Compliance
`security-review`, `security-scanning`, `security-compliance`, `protect-mcp`

### Performance
`application-performance`, `database-cloud-optimization`

### Deployment & Ops (Railway/Render)
`deployment-strategies`, `deployment-validation`, `cicd-automation`, `cloud-infrastructure`, `kubernetes-operations`, `docker-patterns`

### Observability & Incident
`observability-monitoring`, `incident-response`, `distributed-debugging`

### Code Quality
`code-refactoring`, `codebase-cleanup`, `code-documentation`, `documentation-generation`, `documentation-standards`, `dependency-management`

### Errors & Debugging
`debugging` *(reach for this first)*, `error-diagnostics`, `error-debugging`, `problem-solving`, `root-cause-analysis`

### Workflow & Git
`git-pr-workflows`, `team-collaboration`, `shell-scripting` *(matches .bat-file workflow)*, `web-scripting`

### Agentic / Meta
`agent-orchestration`, `agent-teams`, `context-management`

### Language Patterns
`javascript-typescript`

### AI / Advanced
`llm-application-dev`, `machine-learning-ops`, `meigen-ai-design`

### Accessibility & Integration
`accessibility-compliance`, `payment-processing`, `customer-sales-automation`, `data-engineering`, `framework-migration`

## 7. Top 10 Daily Skills

1. `debugging` — when stuck
2. `signed-audit-trails` — stock movement logging
3. `database-design` / `postgres-patterns` — schema decisions
4. `api-scaffolding` — new endpoints
5. `dashboard-builder` — UI work
6. `xlsx` / `pdf` — management reports
7. `tdd-workflows` — for stock logic
8. `security-review` — auth & data integrity
9. `git-pr-workflows` — daily commits
10. `code-refactoring` — for the frontend/→backend/ cleanup


## 8. Recurring Commands

```bash
# Run locally
npm start                          # → node backend/server.js
npm run dev                        # → node --watch backend/server.js

# Deploy
git add . && git commit -m "..." && git push   # Railway auto-redeploys
```

Many existing `.bat` helpers at root: `push-update.bat`, `push-to-render.bat`, `restart-server.bat`, etc.

## 9. Working Style Preferences

- **Auto-deploy after every task** — after completing ANY code change, deploy by double-clicking `smart-push.bat` in File Explorer (E:\Projects\Inventory Management Web App\smart-push.bat). NEVER attempt raw git commands from the Linux sandbox — they fail due to index lock conflicts with the Windows git process.

- **Git push workflow (CRITICAL):**
  1. Write/edit the file using the Edit/Write tools
  2. Open File Explorer to `E:\Projects\Inventory Management Web App\`
  3. Double-click `smart-push.bat` — it handles everything automatically:
     - Removes stale `index.lock` / `HEAD.lock` files
     - Configures git to never open an editor (`core.editor = cmd /c exit 0`)
     - Sets `pull.rebase false` to avoid unstaged-change conflicts
     - Completes any in-progress merge with `--no-edit`
     - Pulls remote changes without prompting
     - Pushes with upstream tracking set
  4. Wait ~1 min for Railway to redeploy

- **If index.lock blocks from Linux sandbox** — do NOT try `rm`, Python delete, or any Linux-side workaround. Go straight to File Explorer → double-click `smart-push.bat` (Windows process has full permission to delete the lock file).
- **Plan before coding** — use `writing-plans`
- **TDD for stock logic** — quantities, reorder points, audit trails
- **Reports must be exportable** — managers expect `.xlsx` and `.pdf`
- **Accessibility default** — use `ui-ux-pro-max`, target WCAG AA
- **Mobile-first** — every UI change must be responsive and work on mobile phones. Touch-friendly tap targets, readable font sizes, no horizontal scroll, stacked layouts on small screens.
- **Audit everything inventory** — every adjustment, transfer, count needs `signed-audit-trails`
- **Don't push secrets** — `.env` is in `.gitignore`, keep it that way

## 10. Open TODOs (running list)

- [ ] Move `server.js`, `routes/`, `services/`, `db.js`, `db.js`, `audit.js` from `frontend/` → `backend/`
- [ ] Consolidate 40+ `.bat` scripts into 3–5 organized ones
- [ ] Delete dead `_check.js`, `_check2.js`, `fix_*.js`, `test_*.js` after auditing
- [ ] Add `.claude/` and `*.bak` to `.gitignore`
- [ ] Wire `signed-audit-trails` into stock-mutation routes
- [ ] Decide: Render or Railway as primary (currently both configured)
- [ ] Add e2e test suite (`webapp-testing`, `e2e-testing`)

## 10b. Installed Skill Library (1,141 skills)

Four external skill repos are installed into `.claude/skills/` (project-scoped):
superpowers (14), ui-ux-pro-max (7), everything-claude-code (260),
awesome-claude-skills (28 + 832 Composio/Rube automation stubs).

- **Full list:** `SKILLS-INDEX.md` (alphabetical, tagged by source)
- **Manifest:** `.claude/skills/_INSTALLED_SKILLS.tsv`
- **Make global (any session/folder):** run `install-skills-globally.bat` once →
  copies them to `%USERPROFILE%\.claude\skills\`. Restart Claude Code after.
- **Note:** the `*-automation` / `connect` skills require the **Rube MCP** connector to function.

## 11. Quick References

- Plugin lookup table: `SKILLS-REFERENCE.md`
- Cheatsheet (URLs, commands): `CHEATSHEET.md`
- Global user memory: `C:\Users\ADMIN\.claude\CLAUDE.md`
- Claude Code binary: `C:\Users\ADMIN\AppData\Roaming\npm\claude.cmd`
- Git binary: `C:\Users\ADMIN\PortableGit\PortableGit\cmd\git.exe`
