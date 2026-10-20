# StudyFlow AI

A study-planning app that runs entirely in your browser. It has a dashboard, task manager, deadline view, progress tracking, and a **local rule-based planner**. The planner is not an AI model: it splits each subject into Learn, Practice and Review blocks and spreads them before your deadline.

No backend, no accounts, no API keys. Data is saved in your browser's localStorage. It stays on this device and browser profile and is **not synced or backed up**. Use Data > Download JSON to keep a copy.

## Run on Windows
1. Install VS Code (free) from https://code.visualstudio.com, or use Notepad.
2. Create a folder `StudyFlow-AI` and put these files in it: `index.html`, `styles.css`, `app.js`.
3. Double-click `index.html`. It opens in your browser. Chrome or Edge is recommended.
4. To see errors: press F12, open the Console tab. Red messages are errors.

Troubleshooting: if the page is unstyled, check that all three files are in the same folder and named exactly as above. If data does not persist, you may be in a private window or have storage blocked.

## Features
Tasks (add, edit, delete with confirmation, complete, search, filter, sort), dashboard stats, deadlines grouped by date, per-subject progress, planner with editable preview and workload warning, JSON export, validated JSON import, reset with confirmation.

## Limitations
- Deadlines are a grouped list, not a full calendar grid.
- No dark theme, timer or printable plan.
- The planner uses fixed block lengths (60/45/30 min). Edit them before saving.

## Publish with Git and GitHub Pages (free)
1. Install Git for Windows (https://git-scm.com). Create a GitHub account.
2. On github.com click New repository, name it `StudyFlow-AI`, leave it empty.
3. In the project folder, open PowerShell and run:
```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/StudyFlow-AI.git
git push -u origin main
```
4. On GitHub: Settings > Pages > Source: Deploy from a branch > main / root > Save.
5. After a minute the page shows your public URL. Open it and run the checklist in `tests/manual-test-checklist.md`.
