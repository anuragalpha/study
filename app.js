(function () {
'use strict';
var KEY = 'studyflow.v1';
var $ = function (s) { return document.querySelector(s); };

/* ---------- helpers ---------- */
function h(tag, props) {
  var e = document.createElement(tag), p = props || {};
  Object.keys(p).forEach(function (k) {
    var v = p[k];
    if (k === 'class') e.className = v;
    else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  });
  Array.prototype.slice.call(arguments, 2).forEach(function add(c) {
    if (Array.isArray(c)) c.forEach(add);
    else if (c != null && c !== false) e.append(c.nodeType ? c : String(c));
  });
  return e;
}
function opt(v, label, cur) { return h('option', { value: v, selected: v === cur }, label); }
function field(label, id, type, attrs) {
  return h('div', { class: 'f' }, h('label', { for: id }, label), h('input', Object.assign({ id: id, type: type }, attrs || {})));
}
var pad = function (n) { return String(n).padStart(2, '0'); };
var ymd = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
var today = function () { return ymd(new Date()); };
function parse(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return null;
  var d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : null;
}
function addDays(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return ymd(d); }
function diff(a, b) {
  var A = parse(a), B = parse(b);
  return Math.round((Date.UTC(B.getFullYear(), B.getMonth(), B.getDate()) - Date.UTC(A.getFullYear(), A.getMonth(), A.getDate())) / 864e5);
}
function fmt(s) { return parse(s).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
function fmtTs(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString(); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
var isOver = function (t) { return !t.done && !!t.due && t.due < today(); };
var validMin = function (n) { return Number.isInteger(n) && n >= 5 && n <= 600; };

var toastTimer;
function toast(msg, isErr) {
  var t = $('#toast');
  t.textContent = msg; t.className = 'show' + (isErr ? ' error' : '');
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.className = ''; }, 4500);
}

/* ---------- data ---------- */
var tasks = [];
function normalize(t) {
  if (!t || typeof t !== 'object' || typeof t.title !== 'string' || !t.title.trim()) return null;
  var now = new Date().toISOString(), min = Number(t.minutes);
  return {
    id: typeof t.id === 'string' && t.id ? t.id.slice(0, 40) : uid(),
    title: t.title.trim().slice(0, 120),
    subject: (typeof t.subject === 'string' && t.subject.trim() ? t.subject.trim() : 'General').slice(0, 40),
    description: typeof t.description === 'string' ? t.description.slice(0, 1000) : '',
    priority: ['high', 'medium', 'low'].indexOf(t.priority) > -1 ? t.priority : 'medium',
    due: parse(t.due) ? t.due : '',
    minutes: validMin(min) ? min : 30,
    done: t.done === true,
    created: !isNaN(new Date(t.created)) && t.created ? t.created : now,
    updated: !isNaN(new Date(t.updated)) && t.updated ? t.updated : now
  };
}
function normalizeAll(arr) {
  var seen = {}, out = [], bad = 0;
  arr.forEach(function (x) {
    var n = normalize(x);
    if (!n) { bad++; return; }
    if (seen[n.id]) n.id = uid();
    seen[n.id] = 1; out.push(n);
  });
  return { tasks: out, skipped: bad };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ version: 1, tasks: tasks })); return true; }
  catch (e) { toast('Could not save to this browser (storage full or blocked). Export your data to keep it.', true); return false; }
}
function load() {
  var raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { toast('Browser storage is blocked. Data will not persist.', true); return; }
  if (raw === null) return;
  try {
    var d = JSON.parse(raw);
    var res = normalizeAll(Array.isArray(d) ? d : d.tasks);
    tasks = res.tasks;
    if (res.skipped) toast(res.skipped + ' stored task(s) were invalid and skipped.', true);
  } catch (e) {
    try { localStorage.setItem(KEY + '.corrupt', raw); } catch (e2) {}
    tasks = [];
    toast('Stored data was unreadable. A backup copy was kept and the app started empty.', true);
  }
}

/* ---------- navigation ---------- */
var VIEWS = [['dashboard', 'Dashboard'], ['tasks', 'Tasks'], ['planner', 'Planner'], ['schedule', 'Deadlines'], ['progress', 'Progress'], ['data', 'Data']];
var view = 'dashboard';
function go(v) { view = v; render(); $('#main').focus(); }
function render() {
  var fn = { dashboard: vDashboard, tasks: vTasks, planner: vPlanner, schedule: vSchedule, progress: vProgress, data: vData }[view];
  $('#main').replaceChildren(fn());
  Array.prototype.forEach.call($('#nav').children, function (b) {
    if (b.dataset.v === view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  if (view === 'tasks') renderList();
  if (view === 'planner') renderPlan();
}
var title = function (t) { return h('h1', {}, t); };
var empty = function (msg, label, fn) { return h('div', { class: 'empty' }, h('p', {}, msg), label ? h('button', { class: 'btn primary', onclick: fn }, label) : null); };

/* ---------- task cards ---------- */
function toggle(id) {
  var t = tasks.find(function (x) { return x.id === id; });
  if (!t) return;
  t.done = !t.done; t.updated = new Date().toISOString();
  if (save()) toast(t.done ? 'Task completed.' : 'Task reopened.');
  view === 'tasks' ? renderList() : render();
}
function del(id) {
  var t = tasks.find(function (x) { return x.id === id; });
  if (!t || !confirm('Delete "' + t.title + '"? This cannot be undone.')) return;
  tasks = tasks.filter(function (x) { return x.id !== id; });
  if (save()) toast('Task deleted.');
  render();
}
function card(x) {
  var od = isOver(x), dueTxt = !x.due ? 'No due date' : od ? 'Overdue: ' + fmt(x.due) : x.due === today() ? 'Due today' : 'Due ' + fmt(x.due);
  return h('li', { class: 'task ' + x.priority + (x.done ? ' done' : '') },
    h('input', { type: 'checkbox', checked: x.done, 'aria-label': (x.done ? 'Reopen: ' : 'Complete: ') + x.title, onchange: function () { toggle(x.id); } }),
    h('div', {},
      h('strong', {}, x.title),
      h('div', { class: 'meta' }, h('span', {}, x.subject), h('span', {}, x.priority + ' priority'), h('span', { class: od ? 'late' : '' }, dueTxt), h('span', {}, x.minutes + ' min'), x.done ? h('span', {}, 'Completed') : null),
      h('details', {}, h('summary', {}, 'Details'),
        x.description ? h('p', {}, x.description) : h('p', {}, 'No description.'),
        h('small', {}, 'Created ' + fmtTs(x.created) + '. Updated ' + fmtTs(x.updated) + '.'))),
    h('div', { class: 'acts' },
      h('button', { class: 'btn', onclick: function () { openTask(x.id); }, 'aria-label': 'Edit ' + x.title }, 'Edit'),
      h('button', { class: 'btn danger', onclick: function () { del(x.id); }, 'aria-label': 'Delete ' + x.title }, 'Delete')));
}

/* ---------- dashboard ---------- */
function vDashboard() {
  var total = tasks.length, done = tasks.filter(function (t) { return t.done; }).length;
  var over = tasks.filter(isOver).length, pct = total ? Math.round(done / total * 100) : 0;
  var stat = function (n, l, c) { return h('div', { class: 'stat ' + (c || '') }, h('b', {}, n), h('span', {}, l)); };
  var up = tasks.filter(function (t) { return !t.done && t.due; }).sort(function (a, b) { return a.due.localeCompare(b.due); }).slice(0, 5);
  var recent = tasks.slice().sort(function (a, b) { return b.updated.localeCompare(a.updated); }).slice(0, 5);
  return h('section', {}, title('Dashboard'),
    h('div', { class: 'stats' }, stat(total, 'Total tasks'), stat(done, 'Completed'), stat(total - done, 'Pending'), stat(over, 'Overdue', over ? 'late' : ''), stat(pct + '%', 'Complete')),
    total === 0 ? empty('No tasks yet. Add your first task, or load a few sample tasks from the Data page.', 'Add a task', function () { openTask(); }) : null,
    h('div', { class: 'panel' }, h('h2', {}, 'Upcoming deadlines'),
      up.length ? h('ul', { class: 'list' }, up.map(card)) : h('p', {}, 'No pending tasks with due dates.')),
    h('div', { class: 'panel' }, h('h2', {}, 'Recent activity'),
      recent.length ? h('ul', {}, recent.map(function (t) { return h('li', {}, (t.done ? 'Completed' : 'Updated') + ' "' + t.title + '" on ' + fmtTs(t.updated)); })) : h('p', {}, 'Nothing yet.')));
}

/* ---------- tasks ---------- */
var F = { q: '', subject: '', priority: '', status: '', due: '', sort: 'due' };
function subjects() { return Array.from(new Set(tasks.map(function (t) { return t.subject; }))).sort(); }
function visible() {
  var t = today(), q = F.q.trim().toLowerCase(), P = { high: 0, medium: 1, low: 2 };
  return tasks.filter(function (x) {
    if (q && (x.title + ' ' + x.subject + ' ' + x.description).toLowerCase().indexOf(q) < 0) return false;
    if (F.subject && x.subject !== F.subject) return false;
    if (F.priority && x.priority !== F.priority) return false;
    if (F.status === 'done' && !x.done) return false;
    if (F.status === 'pending' && x.done) return false;
    if (F.status === 'overdue' && !isOver(x)) return false;
    if (F.due === 'none' && x.due) return false;
    if (F.due === 'today' && x.due !== t) return false;
    if (F.due === 'week' && !(x.due && x.due >= t && x.due <= addDays(t, 7))) return false;
    return true;
  }).sort(function (a, b) {
    if (F.sort === 'priority') return P[a.priority] - P[b.priority];
    if (F.sort === 'created') return b.created.localeCompare(a.created);
    return (a.due || '9999').localeCompare(b.due || '9999');
  });
}
function sel(id, label, key, options) {
  return h('div', { class: 'f' }, h('label', { for: id }, label),
    h('select', { id: id, onchange: function (e) { F[key] = e.target.value; renderList(); } },
      options.map(function (o) { return opt(o[0], o[1], F[key]); })));
}
function vTasks() {
  var subs = [['', 'All subjects']].concat(subjects().map(function (s) { return [s, s]; }));
  return h('section', {}, title('Tasks'),
    h('div', { class: 'bar' },
      h('div', { class: 'f' }, h('label', { for: 'q' }, 'Search'), h('input', { id: 'q', type: 'search', value: F.q, oninput: function (e) { F.q = e.target.value; renderList(); } })),
      sel('fs', 'Subject', 'subject', subs),
      sel('fp', 'Priority', 'priority', [['', 'Any'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']]),
      sel('fst', 'Status', 'status', [['', 'Any'], ['pending', 'Pending'], ['done', 'Completed'], ['overdue', 'Overdue']]),
      sel('fd', 'Due', 'due', [['', 'Any'], ['today', 'Today'], ['week', 'Next 7 days'], ['none', 'No due date']]),
      sel('so', 'Sort by', 'sort', [['due', 'Deadline'], ['priority', 'Priority'], ['created', 'Newest first']]),
      h('button', { class: 'btn primary', onclick: function () { openTask(); } }, 'Add task')),
    h('div', { id: 'list' }));
}
function renderList() {
  var box = $('#list'); if (!box) return;
  var r = visible();
  box.replaceChildren(r.length ? h('ul', { class: 'list' }, r.map(card)) :
    empty(tasks.length ? 'No tasks match these filters.' : 'No tasks yet. Add one to get started.', tasks.length ? null : 'Add a task', function () { openTask(); }));
}

/* ---------- task dialog ---------- */
var dlg = $('#dlg');
function setErr(id, m) { $('#e-' + id).textContent = m || ''; }
function openTask(id) {
  var t = id ? tasks.find(function (x) { return x.id === id; }) : null;
  $('#dlg-title').textContent = t ? 'Edit task' : 'Add task';
  $('#f-id').value = t ? t.id : '';
  $('#f-title').value = t ? t.title : '';
  $('#f-subject').value = t ? t.subject : '';
  $('#f-desc').value = t ? t.description : '';
  $('#f-pri').value = t ? t.priority : 'medium';
  $('#f-due').value = t ? t.due : '';
  $('#f-min').value = t ? t.minutes : 30;
  ['title', 'due', 'min'].forEach(function (k) { setErr(k, ''); });
  $('#subjects').replaceChildren.apply($('#subjects'), subjects().map(function (s) { return h('option', { value: s }); }));
  dlg.showModal(); $('#f-title').focus();
}
$('#f-cancel').addEventListener('click', function () { dlg.close(); });
$('#tf').addEventListener('submit', function (e) {
  e.preventDefault();
  var title = $('#f-title').value.trim(), due = $('#f-due').value, min = Number($('#f-min').value), ok = true;
  setErr('title', ''); setErr('due', ''); setErr('min', '');
  if (!title) { setErr('title', 'Enter a task title.'); ok = false; }
  if (due && !parse(due)) { setErr('due', 'Enter a valid date.'); ok = false; }
  if (!validMin(min)) { setErr('min', 'Enter whole minutes between 5 and 600.'); ok = false; }
  if (!ok) { var f = dlg.querySelector('.err:not(:empty)'); if (f) f.parentElement.querySelector('input').focus(); return; }
  var id = $('#f-id').value, now = new Date().toISOString();
  var data = { title: title, subject: $('#f-subject').value.trim() || 'General', description: $('#f-desc').value.trim(), priority: $('#f-pri').value, due: due, minutes: min };
  var t = id ? tasks.find(function (x) { return x.id === id; }) : null;
  if (t) { Object.assign(t, data, { updated: now }); }
  else tasks.push(Object.assign({ id: uid(), done: false, created: now, updated: now }, data));
  dlg.close();
  if (save()) toast(t ? 'Task updated.' : 'Task added.');
  render();
});

/* ---------- planner (rule-based) ---------- */
var plan = [], ctx = null;
function vPlanner() {
  return h('section', {}, title('Study planner'),
    h('form', { class: 'panel', novalidate: true, onsubmit: function (e) { e.preventDefault(); generate(); } },
      h('p', { class: 'note' }, 'This is a local rule-based planner, not an AI model. It splits each subject into Learn, Practice and Review blocks and spreads them evenly before your deadline. Review and edit everything before saving.'),
      field('Learning goal', 'p-goal', 'text', { maxlength: 120, placeholder: 'Pass the Physics mid-term' }),
      h('div', { class: 'f' }, h('label', { for: 'p-subs' }, 'Subjects or chapters (one per line or comma-separated)'), h('textarea', { id: 'p-subs', rows: 4 })),
      field('Deadline', 'p-dl', 'date'),
      field('Study hours per day', 'p-hrs', 'number', { min: 0.5, max: 16, step: 0.5, value: 2 }),
      h('p', { class: 'err', id: 'p-err', role: 'alert' }),
      h('button', { class: 'btn primary', type: 'submit' }, 'Generate plan')),
    h('div', { id: 'pout' }));
}
function generate() {
  var goal = $('#p-goal').value.trim(), dl = $('#p-dl').value, hrs = Number($('#p-hrs').value);
  var subs = Array.from(new Set($('#p-subs').value.split(/[\n,]+/).map(function (s) { return s.trim(); }).filter(Boolean))).slice(0, 30);
  var err = !goal ? 'Enter a learning goal.' : !subs.length ? 'Enter at least one subject or chapter.' :
    !parse(dl) ? 'Choose a deadline.' : dl < today() ? 'The deadline must be today or later.' :
    !(hrs >= 0.5 && hrs <= 16) ? 'Study hours per day must be between 0.5 and 16.' : '';
  $('#p-err').textContent = err;
  if (err) return;
  var days = diff(today(), dl) + 1, steps = [['Learn', 60, 'high'], ['Practice', 45, 'medium'], ['Review', 30, 'low']], n = subs.length * 3, i = 0;
  plan = [];
  subs.forEach(function (s) {
    steps.forEach(function (st) {
      var off = Math.max(0, Math.min(days - 1, Math.floor((i + 1) * days / n) - 1)); i++;
      plan.push({ title: st[0] + ': ' + s, subject: s.slice(0, 40), description: 'Part of goal: ' + goal, minutes: st[1], priority: st[2], due: addDays(today(), off) });
    });
  });
  ctx = { days: days, cap: Math.round(days * hrs * 60) };
  renderPlan();
}
function planWarn() {
  var w = $('#pw'); if (!w || !ctx) return;
  var sum = plan.reduce(function (a, p) { return a + (Number(p.minutes) || 0); }, 0);
  w.textContent = sum > ctx.cap ? 'Workload warning: this plan needs ' + (sum / 60).toFixed(1) + ' h but you have ' + (ctx.cap / 60).toFixed(1) + ' h available (' + ctx.days + ' day(s)). Lower durations, remove items, or extend the deadline.' : 'Plan needs ' + (sum / 60).toFixed(1) + ' h of the ' + (ctx.cap / 60).toFixed(1) + ' h you have available.';
  w.className = sum > ctx.cap ? 'warn' : 'note';
}
function planValid(p) { return p.title.trim() && parse(p.due) && validMin(Number(p.minutes)); }
function addPlan(p) {
  var now = new Date().toISOString();
  tasks.push({ id: uid(), title: p.title.trim().slice(0, 120), subject: p.subject || 'General', description: p.description, priority: p.priority, due: p.due, minutes: Number(p.minutes), done: false, created: now, updated: now });
}
function renderPlan() {
  var out = $('#pout'); if (!out) return;
  if (!plan.length) { out.replaceChildren(); return; }
  var rows = plan.map(function (p, i) {
    return h('li', { class: 'prow' },
      h('input', { type: 'text', value: p.title, maxlength: 120, 'aria-label': 'Task title', oninput: function (e) { p.title = e.target.value; } }),
      h('input', { type: 'number', value: p.minutes, min: 5, max: 600, 'aria-label': 'Minutes for ' + p.title, oninput: function (e) { p.minutes = e.target.value; planWarn(); } }),
      h('input', { type: 'date', value: p.due, 'aria-label': 'Due date for ' + p.title, oninput: function (e) { p.due = e.target.value; } }),
      h('select', { 'aria-label': 'Priority for ' + p.title, onchange: function (e) { p.priority = e.target.value; } }, opt('high', 'High', p.priority), opt('medium', 'Medium', p.priority), opt('low', 'Low', p.priority)),
      h('div', { class: 'acts' },
        h('button', { class: 'btn', onclick: function () {
          if (!planValid(p)) return toast('Fix the title, minutes (5-600) or date on that row first.', true);
          addPlan(p); plan.splice(i, 1); if (save()) toast('Task added from plan.'); renderPlan(); planWarn();
        } }, 'Add'),
        h('button', { class: 'btn', onclick: function () { plan.splice(i, 1); renderPlan(); planWarn(); } }, 'Remove')));
  });
  out.replaceChildren(h('div', { class: 'panel' }, h('h2', {}, 'Review your plan'), h('p', { id: 'pw' }), h('ul', { class: 'list' }, rows),
    h('p', {}, h('button', { class: 'btn primary', onclick: function () {
      var bad = plan.filter(function (p) { return !planValid(p); }).length;
      if (bad) return toast(bad + ' row(s) have invalid values. Fix them or remove them first.', true);
      var n = plan.length; plan.forEach(addPlan); plan = [];
      if (save()) toast(n + ' task(s) added.');
      renderPlan();
    } }, 'Add all to tasks'))));
  planWarn();
}

/* ---------- deadlines ---------- */
function vSchedule() {
  var pend = tasks.filter(function (t) { return !t.done && t.due; }).sort(function (a, b) { return a.due.localeCompare(b.due) || a.title.localeCompare(b.title); });
  var undated = tasks.filter(function (t) { return !t.done && !t.due; }).length, groups = {}, t0 = today();
  pend.forEach(function (t) { (groups[t.due] = groups[t.due] || []).push(t); });
  var keys = Object.keys(groups);
  return h('section', {}, title('Deadlines'),
    keys.length ? keys.map(function (d) {
      var mins = groups[d].reduce(function (a, t) { return a + t.minutes; }, 0);
      return h('div', { class: 'panel' }, h('h2', { class: d < t0 ? 'late' : '' }, (d < t0 ? 'Overdue: ' : d === t0 ? 'Today: ' : '') + fmt(d)),
        h('small', {}, groups[d].length + ' task(s), about ' + mins + ' min'), h('ul', { class: 'list' }, groups[d].map(card)));
    }) : empty('No pending deadlines. Add a task with a due date to see it here.', 'Add a task', function () { openTask(); }),
    undated ? h('p', {}, undated + ' pending task(s) have no due date and are not shown here.') : null);
}

/* ---------- progress ---------- */
function bar(pct) { return h('div', { class: 'prog', role: 'img', 'aria-label': pct + ' percent complete' }, h('i', { style: 'width:' + pct + '%' })); }
function vProgress() {
  if (!tasks.length) return h('section', {}, title('Progress'), empty('No data yet. Add tasks to see your progress.', 'Add a task', function () { openTask(); }));
  var done = tasks.filter(function (t) { return t.done; }).length, pct = Math.round(done / tasks.length * 100);
  var by = {};
  tasks.forEach(function (t) { var s = by[t.subject] = by[t.subject] || { d: 0, n: 0 }; s.n++; if (t.done) s.d++; });
  return h('section', {}, title('Progress'),
    h('div', { class: 'panel' }, h('h2', {}, 'Overall'), bar(pct), h('p', {}, done + ' completed, ' + (tasks.length - done) + ' pending (' + pct + '% done).')),
    h('div', { class: 'panel' }, h('h2', {}, 'By subject'), Object.keys(by).sort().map(function (k) {
      var p = Math.round(by[k].d / by[k].n * 100);
      return h('div', { class: 'srow' }, h('div', {}, h('span', {}, k), h('span', {}, by[k].d + ' of ' + by[k].n + ' (' + p + '%)')), bar(p));
    })));
}

/* ---------- data ---------- */
function vData() {
  return h('section', {}, title('Data'),
    h('p', { class: 'note' }, 'Your tasks are stored only in this browser profile on this device. They are not backed up or synced to the cloud. Export a JSON file regularly to keep a copy.'),
    h('div', { class: 'panel' }, h('h2', {}, 'Export'), h('button', { class: 'btn primary', onclick: exportData }, 'Download JSON')),
    h('div', { class: 'panel' }, h('h2', {}, 'Import'), h('div', { class: 'f' }, h('label', { for: 'imp' }, 'Choose a StudyFlow JSON file (replaces current tasks)'),
      h('input', { id: 'imp', type: 'file', accept: '.json,application/json', onchange: importData }))),
    h('div', { class: 'panel' }, h('h2', {}, 'Sample tasks'), h('button', { class: 'btn', onclick: samples }, 'Add 4 sample tasks')),
    h('div', { class: 'panel' }, h('h2', {}, 'Reset'), h('button', { class: 'btn danger', onclick: function () {
      if (!confirm('Delete ALL tasks from this browser? This cannot be undone. Consider exporting first.')) return;
      tasks = []; if (save()) toast('All data was reset.'); render();
    } }, 'Reset all data')));
}
function exportData() {
  var blob = new Blob([JSON.stringify({ app: 'StudyFlow AI', version: 1, exported: new Date().toISOString(), tasks: tasks }, null, 2)], { type: 'application/json' });
  var a = h('a', { href: URL.createObjectURL(blob), download: 'studyflow-' + today() + '.json' });
  document.body.append(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  toast('Exported ' + tasks.length + ' task(s).');
}
function importData(e) {
  var file = e.target.files[0]; if (!file) return;
  if (file.size > 2 * 1024 * 1024) { e.target.value = ''; return toast('File is too large (limit 2 MB).', true); }
  var r = new FileReader();
  r.onerror = function () { toast('Could not read that file.', true); };
  r.onload = function () {
    var d;
    try { d = JSON.parse(r.result); } catch (x) { e.target.value = ''; return toast('Import failed: the file is not valid JSON.', true); }
    var arr = Array.isArray(d) ? d : d && Array.isArray(d.tasks) ? d.tasks : null;
    if (!arr) { e.target.value = ''; return toast('Import failed: no task list found in the file.', true); }
    var res = normalizeAll(arr);
    if (!res.tasks.length && arr.length) { e.target.value = ''; return toast('Import failed: none of the tasks were valid.', true); }
    if (!confirm('Replace your current ' + tasks.length + ' task(s) with ' + res.tasks.length + ' imported task(s)?' + (res.skipped ? ' (' + res.skipped + ' invalid skipped.)' : ''))) { e.target.value = ''; return; }
    tasks = res.tasks; if (save()) toast('Imported ' + tasks.length + ' task(s).'); render();
  };
  r.readAsText(file);
}
function samples() {
  var t = today(), now = new Date().toISOString();
  [['Read chapter 3 notes', 'Biology', 'high', 1, 45], ['Algebra practice set', 'Maths', 'medium', 3, 60], ['Essay outline', 'English', 'medium', -1, 40], ['Flashcards review', 'Biology', 'low', 7, 20]].forEach(function (s) {
    tasks.push({ id: uid(), title: s[0], subject: s[1], description: '', priority: s[2], due: addDays(t, s[3]), minutes: s[4], done: false, created: now, updated: now });
  });
  if (save()) toast('Sample tasks added.'); render();
}

/* ---------- start ---------- */
$('#nav').replaceChildren.apply($('#nav'), VIEWS.map(function (v) {
  return h('button', { type: 'button', 'data-v': v[0], onclick: function () { go(v[0]); } }, v[1]);
}));
load();
render();
})();
