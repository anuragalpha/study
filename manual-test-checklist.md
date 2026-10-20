# Manual test checklist

Status key: Not run / Pass / Fail. Only items marked Pass were actually run.
Automated smoke run (Playwright, Chromium, file://, one session): items 1-4, 6, 9, 11-13, 15, 18-19 partly exercised. Items marked "Smoke pass" below were observed; everything else is Not run.

| # | Test | Steps | Expected | Status |
|---|------|-------|----------|--------|
| 1 | First launch, no data | Clear site data, open app | Dashboard shows zeros and empty state | Smoke pass |
| 2 | Create valid task | Tasks > Add task, fill, save | Task listed, success message | Smoke pass |
| 3 | Empty title rejected | Save with empty title | Error "Enter a task title." | Smoke pass |
| 4 | Edit task | Edit, change title, save | List shows new title | Not run |
| 5 | Delete with confirmation | Delete, cancel then accept | Removed only after accept | Not run |
| 6 | Complete / reopen | Tick checkbox twice | Status toggles, stats update | Smoke pass (complete only) |
| 7 | Search | Type part of a title | Only matches shown | Not run |
| 8 | Filter and sort | Use each filter and sort | List matches choice | Not run |
| 9 | Overdue detection | Add task due 2000-01-01 | Shown as Overdue | Smoke pass |
| 10 | Due today | Add task due today | Shows "Due today", not overdue | Not run |
| 11 | Dashboard stats | Compare with task list | Numbers match | Smoke pass (1 task) |
| 12 | Generate plan | Fill planner, generate | Editable rows appear | Smoke pass |
| 13 | Workload warning | 1 h/day, 2 subjects, 1 day | Warning shown | Smoke pass |
| 14 | Edit generated tasks | Change row values, Add | Task saved with edits | Not run |
| 15 | Refresh restores | Reload page | Tasks remain | Smoke pass |
| 16 | Export JSON | Data > Download JSON | Valid file downloads | Not run |
| 17 | Import valid JSON | Import exported file | Tasks restored | Not run |
| 18 | Reject malformed JSON | Import a text file | Error, data unchanged | Not run |
| 19 | Malformed localStorage | Set key to `{bad`, reload | Warning, app starts empty | Smoke pass |
| 20 | Reset confirmation | Reset, cancel then accept | Cleared only after accept | Not run |
| 21 | Layout desktop/mobile | Resize to 375 px | No horizontal scroll | Smoke pass (375 px, Tasks page only) |
| 22 | Keyboard and labels | Tab through all pages | Focus visible, all fields labelled | Not run |
| 23 | Console errors | F12 during use | None | Smoke pass (no errors seen) |
| 24 | All controls work | Click every button and nav item | Each does something | Not run |
| 25 | After deployment | Repeat on public URL | Same results | Not run |
