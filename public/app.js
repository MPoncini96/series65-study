(() => {
'use strict';

/* ---------- constants ---------- */
const SECTION_IDS = ['econ', 'veh', 'cli', 'law'];
const SEC_COLORS = { econ: 'var(--s1)', veh: 'var(--s2)', cli: 'var(--s3)', law: 'var(--s4)' };
const EXAM_MIX = { econ: 20, veh: 32, cli: 39, law: 39 };
const PASS = 92, EXAM_Q = 130, EXAM_MIN = 180;
const DAY = 864e5;
const BOX_DAYS = [0, 1, 3, 7, 14, 30, 60];
const LS_STATE = 's65.state.v1', LS_KEY = 's65.syncKey', LS_EXAM = 's65.exam.inprogress', LS_THEME = 's65.theme';

const ICONS = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
  cards: '<rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/>',
  quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5V14"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>',
  exam: '<path d="M9 3h6l1 2h3v16H5V5h3z"/><path d="M9 12l2 2 4-4"/>',
  video: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9l5 3-5 3z"/>',
  sync: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>',
  play: '<circle cx="12" cy="12" r="10"/><path d="M10 8l6 4-6 4z" fill="currentColor"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  learn: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/><path d="M22 9v6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'
};
const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;

const NAV = [
  ['#/', 'Dashboard', 'home'], ['#/learn', 'Learn', 'learn'], ['#/read', 'Readings', 'book'], ['#/cards', 'Flashcards', 'cards'],
  ['#/quiz', 'Quizzes', 'quiz'], ['#/exam', 'Practice exam', 'exam'], ['#/videos', 'Videos', 'video'], ['#/sync', 'Sync & settings', 'sync']
];

/* ---------- utils ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const todayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fmtTime = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const LETTERS = 'ABCD';
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };

function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2400);
}
function modal(html, actions) {
  return new Promise((resolve) => {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}<div class="row" style="justify-content:flex-end;margin-top:18px">${actions.map((a, i) => `<button class="btn ${a.cls || ''}" data-i="${i}">${esc(a.label)}</button>`).join('')}</div></div>`;
    bg.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) { bg.remove(); resolve(actions[+b.dataset.i].value); } else if (e.target === bg) { bg.remove(); resolve(null); } });
    document.body.appendChild(bg); $('button.primary', bg)?.focus();
  });
}

/* ---------- data ---------- */
const D = { sections: [], secById: {}, topics: [], topicById: {}, cards: [], cardById: {}, qs: [], qById: {} };
async function loadData() {
  const secs = await Promise.all(SECTION_IDS.map((id) => fetch(`/data/${id}.json`).then((r) => r.json())));
  secs.forEach((s) => {
    D.sections.push(s); D.secById[s.id] = s;
    s.topics.forEach((t) => { t.sec = s.id; D.topics.push(t); D.topicById[t.id] = t; });
    s.flashcards.forEach((c) => { c.sec = s.id; D.cards.push(c); D.cardById[c.id] = c; });
    s.questions.forEach((q) => { q.sec = s.id; D.qs.push(q); D.qById[q.id] = q; });
  });
}

/* ---------- state & sync ---------- */
const blank = () => ({ v: 1, updatedAt: 0, cards: {}, qs: {}, read: {}, exams: [], days: {}, learn: {}, settings: { examDate: '2026-11-11', t: 0 } });
let S = blank();
try { const raw = lsGet(LS_STATE); if (raw) S = Object.assign(blank(), JSON.parse(raw)); } catch {}
let syncKey = lsGet(LS_KEY) || '';
let syncStatus = syncKey ? 'idle' : 'off', syncMsg = '', pushTimer = null;

function save() {
  S.updatedAt = Date.now();
  lsSet(LS_STATE, JSON.stringify(S));
  if (syncKey) { clearTimeout(pushTimer); pushTimer = setTimeout(() => sync(), 4000); }
}
function bumpDay(n = 1) { const k = todayKey(); S.days[k] = (S.days[k] || 0) + n; }

function mergeMap(a = {}, b = {}) {
  const out = { ...a };
  for (const k in b) if (!out[k] || (b[k].t || 0) > (out[k].t || 0)) out[k] = b[k];
  return out;
}
function merge(local, remote) {
  if (!remote) return local;
  const m = blank();
  m.cards = mergeMap(local.cards, remote.cards);
  m.qs = mergeMap(local.qs, remote.qs);
  m.learn = mergeMap(local.learn, remote.learn);
  m.read = { ...remote.read };
  for (const k in local.read) m.read[k] = Math.max(local.read[k] || 0, m.read[k] || 0);
  const ex = {}; [...(remote.exams || []), ...(local.exams || [])].forEach((e) => (ex[e.id] = e));
  m.exams = Object.values(ex).sort((x, y) => x.t - y.t);
  m.days = { ...remote.days };
  for (const k in local.days) m.days[k] = Math.max(local.days[k] || 0, m.days[k] || 0);
  m.settings = (local.settings?.t || 0) >= (remote.settings?.t || 0) ? local.settings : remote.settings;
  m.updatedAt = Math.max(local.updatedAt || 0, remote.updatedAt || 0);
  return m;
}
let syncing = null;
async function sync(manual) {
  if (!syncKey) return;
  if (syncing) return syncing;
  syncStatus = 'busy'; renderSyncFoot();
  syncing = (async () => {
    try {
      const g = await fetch('/api/progress', { headers: { 'x-sync-key': syncKey }, cache: 'no-store' });
      if (!g.ok) throw new Error((await g.json().catch(() => ({}))).error || 'HTTP ' + g.status);
      const { data } = await g.json();
      const before = JSON.stringify(S);
      S = merge(S, data);
      lsSet(LS_STATE, JSON.stringify(S));
      const p = await fetch('/api/progress', { method: 'PUT', headers: { 'x-sync-key': syncKey, 'content-type': 'application/json' }, body: JSON.stringify({ data: S }) });
      if (!p.ok) throw new Error((await p.json().catch(() => ({}))).error || 'HTTP ' + p.status);
      syncStatus = 'ok'; syncMsg = 'Synced ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      if (manual) toast('Progress synced');
      if (JSON.stringify(S) !== before && !inSession()) route();
    } catch (e) {
      syncStatus = 'err'; syncMsg = 'Sync failed: ' + e.message;
      if (manual) toast(syncMsg);
    } finally { syncing = null; renderSyncFoot(); }
  })();
  return syncing;
}
function renderSyncFoot() {
  const el = $('#syncFoot'); if (!el) return;
  const cls = { off: '', idle: '', busy: 'busy', ok: 'ok', err: 'err' }[syncStatus];
  const label = syncStatus === 'off' ? 'Sync off — progress saved on this device' : syncStatus === 'busy' ? 'Syncing…' : syncMsg || 'Sync on';
  el.innerHTML = `<a href="#/sync" style="color:inherit"><span class="sync-dot ${cls}"></span>${esc(label)}</a>`;
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && syncKey) { clearTimeout(pushTimer); sync(); } });

/* ---------- derived stats ---------- */
const cardDue = (id, now = Date.now()) => { const c = S.cards[id]; return c && c.due <= now; };
const cardNew = (id) => !S.cards[id];
const cardMastered = (id) => (S.cards[id]?.b || 0) >= 3;
const qLast = (id) => { const r = S.qs[id]?.r; return r && r.length ? r[r.length - 1] : null; };

function topicStats(tid) {
  const qs = D.qs.filter((q) => q.topic === tid), cards = D.cards.filter((c) => c.topic === tid);
  let seen = 0, right = 0;
  qs.forEach((q) => { const l = qLast(q.id); if (l !== null) { seen++; right += l; } });
  return { qn: qs.length, seen, right, acc: seen ? right / seen : null, cn: cards.length, mastered: cards.filter((c) => cardMastered(c.id)).length, read: !!S.read[tid] };
}
function secStats(sid) {
  const s = D.secById[sid]; let qn = 0, seen = 0, right = 0, cn = 0, mastered = 0, read = 0;
  s.topics.forEach((t) => { const x = topicStats(t.id); qn += x.qn; seen += x.seen; right += x.right; cn += x.cn; mastered += x.mastered; read += x.read ? 1 : 0; });
  return { qn, seen, right, acc: seen ? right / seen : null, cn, mastered, read, tn: s.topics.length };
}
function readiness() {
  // weighted estimate: accuracy per section (unseen sections count as 50%), scaled by coverage confidence
  let est = 0, cov = 0;
  SECTION_IDS.forEach((sid) => {
    const x = secStats(sid), w = EXAM_MIX[sid] / EXAM_Q;
    const c = Math.min(1, x.seen / Math.max(20, x.qn * 0.5));
    const acc = x.acc == null ? 0.5 : x.acc;
    est += w * (c * acc + (1 - c) * 0.5); cov += w * c;
  });
  return { est: Math.round(est * 100), cov: Math.round(cov * 100) };
}
function streak() {
  let n = 0, t = Date.now();
  if (!S.days[todayKey(t)]) t -= DAY;
  while (S.days[todayKey(t)]) { n++; t -= DAY; }
  return n;
}
function weakTopics(n = 5) {
  return D.topics.map((t) => ({ t, x: topicStats(t.id) })).filter((o) => o.x.seen >= 3).sort((a, b) => a.x.acc - b.x.acc).slice(0, n);
}
const daysToExam = () => { const d = S.settings.examDate; if (!d) return null; const [y, m, dd] = d.split('-').map(Number); return Math.ceil((new Date(y, m - 1, dd) - new Date(new Date().toDateString())) / DAY); };

/* ---------- router ---------- */
let session = null; // active flashcard/quiz/exam session
const inSession = () => !!session && !session.done;
let examTick = null;

function route() {
  clearInterval(examTick);
  const h = location.hash || '#/';
  const [path, qs] = h.slice(1).split('?');
  const parts = path.split('/').filter(Boolean);
  const params = new URLSearchParams(qs || '');
  const top = '#/' + (parts[0] || '');
  $('#nav').innerHTML = NAV.map(([href, label, ic]) => `<a href="${href}" class="${href === top ? 'on' : ''}">${icon(ic)}${label}</a>`).join('');
  $('#tabbar').innerHTML = NAV.filter(([h]) => ['#/', '#/learn', '#/cards', '#/quiz', '#/exam'].includes(h)).map(([href, label, ic]) => `<a href="${href}" class="${href === top ? 'on' : ''}">${icon(ic)}${label.split(' ')[0]}</a>`).join('');
  const v = $('#view');
  const r = { '': viewDash, learn: viewLearn, read: viewRead, cards: viewCards, quiz: viewQuiz, exam: viewExam, videos: viewVideos, sync: viewSync, history: viewHistory }[parts[0] || ''] || viewDash;
  if (!['cards', 'quiz', 'exam', 'learn'].includes(parts[0])) session = null;
  r(v, parts.slice(1), params);
  renderSyncFoot();
}
window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });

/* ---------- views: dashboard ---------- */
function viewDash(v) {
  const r = readiness(), dte = daysToExam(), st = streak();
  const now = Date.now();
  const due = D.cards.filter((c) => cardDue(c.id, now)).length;
  const newCards = D.cards.filter((c) => cardNew(c.id)).length;
  const attempted = Object.keys(S.qs).length;
  const lastExam = S.exams[S.exams.length - 1];
  const weak = weakTopics();
  const unread = D.topics.filter((t) => !S.read[t.id]);
  const next = unread[0];
  // heat map: last 28 days
  const heat = []; for (let i = 27; i >= 0; i--) { const n = S.days[todayKey(now - i * DAY)] || 0; heat.push(`<i class="${n >= 40 ? 'l3' : n >= 15 ? 'l2' : n > 0 ? 'l1' : ''}" title="${todayKey(now - i * DAY)}: ${n}"></i>`); }
  v.innerHTML = `
  <div class="row between" style="margin-bottom:18px"><div><div class="eyebrow">NASAA Uniform Investment Adviser Law Exam</div><h1 style="margin:0">Series 65 study plan</h1></div>
  <div class="row"><a class="btn" href="#/cards/run?mode=due">${icon('cards')}Review cards</a><a class="btn primary" href="#/quiz/run?count=20&src=smart">${icon('quiz')}Quick 20-question quiz</a></div></div>
  ${(() => { const nx = nextLesson(); if (!nx) return ''; const L = learnState(nx.id); return `<a class="card learn-banner" href="#/learn/${nx.id}"><span class="lb-ic">${icon('learn')}</span><span style="min-width:0"><span class="eyebrow">${L ? 'Continue learning' : 'Next lesson'} · ${D.topics.filter((t) => learnState(t.id)?.done).length}/${D.topics.length} done</span><strong>${esc(nx.title)}</strong></span><span class="btn primary sm">${L ? 'Resume' : 'Start'}</span></a>`; })()}
  <div class="grid g4">
    <div class="card"><div class="eyebrow">Exam day</div><div class="big">${dte == null ? '—' : dte < 0 ? 'Done' : dte}</div><div class="muted small">${dte == null ? '<a href="#/sync">Set your date</a>' : dte === 0 ? 'Today — good luck!' : dte > 0 ? `days until ${new Date(S.settings.examDate + 'T12:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Exam date has passed'}</div></div>
    <div class="card"><div class="row" style="gap:14px;flex-wrap:nowrap"><div class="ring" style="--p:${r.est}"><span>${r.est}%</span></div><div><div class="eyebrow">Est. score</div><div class="small muted">Pass ≈ 71% (92/130). Based on ${r.cov}% coverage.</div></div></div></div>
    <div class="card"><div class="eyebrow">Flashcards due</div><div class="big">${due}</div><div class="muted small">${newCards} new cards not yet seen</div></div>
    <div class="card"><div class="eyebrow">Study streak</div><div class="big">${st} <span style="font-size:1rem;font-weight:500" class="muted">day${st === 1 ? '' : 's'}</span></div><div class="heat" style="margin-top:8px" aria-label="Activity last 28 days">${heat.join('')}</div></div>
  </div>
  <h2 style="margin:28px 0 12px">Sections</h2>
  <div class="grid g2">${D.sections.map((s) => { const x = secStats(s.id); return `
    <div class="card sec-card" style="--c:${SEC_COLORS[s.id]}">
      <div class="row between"><div><div class="eyebrow">Section ${s.num} · ${s.weight}% · ${s.examQuestions} questions</div><h3 style="margin:0">${esc(s.title)}</h3></div>
      <span class="pill ${x.acc == null ? '' : x.acc >= 0.75 ? 'good' : x.acc >= 0.6 ? 'warn' : 'bad'}">${x.acc == null ? 'Not started' : Math.round(x.acc * 100) + '% correct'}</span></div>
      <div class="kv" style="margin-top:14px">
        <span class="muted">Readings</span><div class="bar"><i style="width:${pct(x.read, x.tn)}%;background:${SEC_COLORS[s.id]}"></i></div><span>${x.read}/${x.tn}</span>
        <span class="muted">Cards mastered</span><div class="bar"><i style="width:${pct(x.mastered, x.cn)}%;background:${SEC_COLORS[s.id]}"></i></div><span>${x.mastered}/${x.cn}</span>
        <span class="muted">Questions tried</span><div class="bar"><i style="width:${pct(x.seen, x.qn)}%;background:${SEC_COLORS[s.id]}"></i></div><span>${x.seen}/${x.qn}</span>
      </div>
      <div class="row" style="margin-top:14px"><a class="btn sm" href="#/read/${s.topics[0].id}">Read</a><a class="btn sm" href="#/cards/run?sec=${s.id}">Flashcards</a><a class="btn sm" href="#/quiz/run?sec=${s.id}&count=15&src=smart">Quiz</a></div>
    </div>`; }).join('')}</div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h3>Focus next</h3>
      ${weak.length ? `<div class="muted small" style="margin-bottom:8px">Your lowest-scoring topics (3+ questions answered):</div>` + weak.map((o) => `<div class="row between" style="padding:7px 0;border-top:1px solid var(--border)"><div class="row" style="gap:8px"><span class="dot" style="background:${SEC_COLORS[o.t.sec]}"></span><a href="#/read/${o.t.id}">${esc(o.t.title)}</a></div><div class="row" style="gap:8px"><span class="pill bad">${Math.round(o.x.acc * 100)}%</span><a class="btn sm" href="#/quiz/run?topic=${o.t.id}&count=10&src=all">Drill</a></div></div>`).join('')
        : `<p class="muted small">Answer a few quizzes and your weakest topics will show up here.</p>`}
      ${next ? `<hr><div class="muted small">Next unread reading</div><div class="row between" style="margin-top:6px"><a href="#/read/${next.id}">${esc(next.title)}</a><span class="pill">${unread.length} left</span></div>` : ''}
    </div>
    <div class="card"><h3>Practice exams</h3>
      ${lastExam ? `<div class="row" style="gap:16px"><div class="big" style="color:${lastExam.score >= PASS ? 'var(--good)' : 'var(--bad)'}">${lastExam.score}/${lastExam.total}</div><div class="small muted">Last attempt ${new Date(lastExam.t).toLocaleDateString()}<br>${lastExam.score >= PASS ? 'Passing' : `${PASS - lastExam.score} short of passing`}</div></div>
        <div class="muted small" style="margin-top:8px">${S.exams.length} exam${S.exams.length === 1 ? '' : 's'} taken · <a href="#/history">See history</a></div>`
        : `<p class="muted small">Take a full-length, timed 130-question exam weighted like the real one (20 / 32 / 39 / 39). You need 92 correct to pass.</p>`}
      <div class="row" style="margin-top:12px"><a class="btn primary" href="#/exam">${icon('exam')}Start a practice exam</a></div>
      <hr><div class="small muted">${attempted} of ${D.qs.length} questions attempted · ${D.cards.length} flashcards · ${D.topics.length} readings</div>
    </div>
  </div>`;
}

/* ---------- readings ---------- */
function vidThumb(url) { const m = url.match(/[?&]v=([\w-]{6,})/); return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : null; }
function vidCard(vd) {
  const th = vidThumb(vd.url), isSearch = /results\?search_query/.test(vd.url), isList = /playlist\?list/.test(vd.url);
  return `<a class="vid" href="${esc(vd.url)}" target="_blank" rel="noopener"><div class="th" ${th ? `style="background-image:url('${th}')"` : ''}>${th ? '' : icon(isSearch ? 'search' : isList ? 'list' : 'play')}</div><div class="t">${esc(vd.title)}${isList ? ' <span class="pill">Playlist</span>' : ''}</div></a>`;
}
function tocHTML(cur) {
  return D.sections.map((s) => `<h4><span class="dot" style="background:${SEC_COLORS[s.id]};margin-right:6px"></span>${s.num}. ${esc(s.title)}</h4>` + s.topics.map((t) => `<a href="#/read/${t.id}" class="${t.id === cur ? 'on' : ''}"><span class="ck">${S.read[t.id] ? '✓' : ''}</span><span>${esc(t.title)}</span></a>`).join('')).join('');
}
function viewRead(v, parts) {
  const tid = parts[0];
  if (!tid) {
    v.innerHTML = `<h1>Readings</h1><p class="muted">${D.topics.length} lessons following the NASAA outline. Each one ends with key points, related videos, and a quiz for that topic.</p>
    <div class="stack">${D.sections.map((s) => { const x = secStats(s.id); return `<div class="card sec-card" style="--c:${SEC_COLORS[s.id]}"><div class="row between"><div><div class="eyebrow">Section ${s.num} · ${s.weight}%</div><h2 style="margin:0">${esc(s.title)}</h2></div><span class="pill">${x.read}/${x.tn} read</span></div>
      <div class="grid g2" style="margin-top:12px;gap:6px 20px">${s.topics.map((t) => { const y = topicStats(t.id); return `<a href="#/read/${t.id}" class="row between" style="padding:6px 0;border-top:1px solid var(--border);color:var(--text)"><span>${S.read[t.id] ? '<span style="color:var(--good)">✓</span> ' : ''}${esc(t.title)}</span>${y.acc != null ? `<span class="pill ${y.acc >= .75 ? 'good' : y.acc >= .6 ? 'warn' : 'bad'}">${Math.round(y.acc * 100)}%</span>` : ''}</a>`; }).join('')}</div></div>`; }).join('')}</div>`;
    return;
  }
  const t = D.topicById[tid]; if (!t) { v.innerHTML = '<div class="empty">Lesson not found. <a href="#/read">All readings</a></div>'; return; }
  const s = D.secById[t.sec], idx = D.topics.indexOf(t), prev = D.topics[idx - 1], next = D.topics[idx + 1];
  const x = topicStats(t.id);
  v.innerHTML = `<div class="read-layout">
    <aside class="card toc" id="toc">${tocHTML(t.id)}</aside>
    <article>
      <div class="row between" style="margin-bottom:6px"><div class="eyebrow"><span class="dot" style="background:${SEC_COLORS[s.id]};margin-right:6px"></span>Section ${s.num} · ${esc(s.title)}</div><button class="btn sm ghost" id="tocToggle" style="display:none">All lessons</button></div>
      <h1>${esc(t.title)}</h1>
      <div class="row small muted" style="margin-bottom:20px">${x.qn} practice questions · ${x.cn} flashcards${x.acc != null ? ` · <span class="pill ${x.acc >= .75 ? 'good' : x.acc >= .6 ? 'warn' : 'bad'}">${Math.round(x.acc * 100)}% correct so far</span>` : ''}</div>
      <div class="prose">${t.reading}</div>
      <div class="keypoints" style="margin-top:8px"><div class="eyebrow">Key points to remember</div><ul>${t.keyPoints.map((k) => `<li>${esc(k)}</li>`).join('')}</ul></div>
      ${t.videos?.length ? `<h3 style="margin-top:26px">Watch</h3><div class="vids">${t.videos.map(vidCard).join('')}</div>` : ''}
      <div class="card" style="margin-top:26px"><div class="row between"><div><strong>Check your understanding</strong><div class="small muted">Lock it in while it's fresh.</div></div>
        <div class="row"><button class="btn" id="markRead">${S.read[t.id] ? '✓ Read' : 'Mark as read'}</button><a class="btn" href="#/cards/run?topic=${t.id}&mode=all">Flashcards</a><a class="btn primary" href="#/quiz/run?topic=${t.id}&count=${Math.min(10, x.qn)}&src=all">Quiz this topic</a></div></div></div>
      <div class="row between" style="margin-top:20px">${prev ? `<a class="btn ghost" href="#/read/${prev.id}">← ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a class="btn ghost" href="#/read/${next.id}">${esc(next.title)} →</a>` : ''}</div>
    </article></div>`;
  if (matchMedia('(max-width:980px)').matches) { const b = $('#tocToggle'); b.style.display = ''; b.onclick = () => $('#toc').classList.toggle('show'); }
  $('#markRead').onclick = () => {
    if (S.read[t.id]) delete S.read[t.id]; else { S.read[t.id] = Date.now(); bumpDay(3); }
    save(); $('#markRead').textContent = S.read[t.id] ? '✓ Read' : 'Mark as read'; $('#toc').innerHTML = tocHTML(t.id);
  };
}

/* ---------- learn: read a part, answer a few questions, repeat ---------- */
const STOP = new Set('about above after again against also among because been before being below between both but cannot could does doing down during each even every from further have having here into itself just more most much must never only other over same should some such than that their them then there these they this those through under until very were what when where which while with would your will than they them also into more most many shall which whose whom whether within without upon following best true false correct incorrect statement statements least except likely client clients investor investors investment'.split(' '));
const words = (s) => String(s).replace(/<[^>]+>/g, ' ').toLowerCase().match(/[a-z0-9$%][a-z0-9$%'-]{2,}/g)?.filter((w) => !STOP.has(w)) || [];
const lessonCache = {};
function lessonPlan(t) {
  if (lessonCache[t.id]) return lessonCache[t.id];
  // split reading at each <h3>; any intro text rides with the first section
  let secs = t.reading.split(/(?=<h3[\s>])/i).map((x) => x.trim()).filter(Boolean);
  if (secs.length > 1 && !/^<h3/i.test(secs[0])) secs = [secs[0] + secs[1], ...secs.slice(2)];
  const qs = D.qs.filter((q) => q.topic === t.id);
  const nParts = Math.max(1, Math.min(3, secs.length, Math.floor(qs.length / 2)));
  // group sections into nParts parts with roughly equal text length
  const lens = secs.map((x) => x.length), total = lens.reduce((a, b) => a + b, 0);
  const parts = []; let cur = [], acc = 0;
  secs.forEach((x, i) => {
    cur.push(x); acc += lens[i];
    const left = secs.length - i - 1, need = nParts - parts.length - 1;
    if (need > 0 && (acc >= (total * (parts.length + 1)) / nParts || left === need)) { parts.push(cur.join('')); cur = []; }
  });
  if (cur.length) parts.push(cur.join(''));
  // match questions to the part whose wording they share most (idf-weighted)
  const pw = parts.map((p) => new Set(words(p)));
  const df = {}; pw.forEach((set) => set.forEach((w) => (df[w] = (df[w] || 0) + 1)));
  const score = (q, k) => { let s = 0; new Set(words(q.q + ' ' + q.choices[q.answer] + ' ' + q.explanation)).forEach((w) => { if (pw[k].has(w)) s += 1 / df[w]; }); return s; };
  const per = qs.length >= parts.length * 3 && parts.length < 3 ? 3 : 2;
  const pairs = []; qs.forEach((q) => parts.forEach((_, k) => pairs.push([score(q, k), q, k])));
  pairs.sort((a, b) => b[0] - a[0] || a[1].id.localeCompare(b[1].id));
  const checks = parts.map(() => []), used = new Set();
  for (const [, q, k] of pairs) if (!used.has(q.id) && checks[k].length < per) { checks[k].push(q); used.add(q.id); }
  for (const q of qs) { if (used.has(q.id)) continue; const k = checks.findIndex((c) => c.length < per); if (k < 0) break; checks[k].push(q); used.add(q.id); }
  return (lessonCache[t.id] = { parts, checks, extra: qs.length - used.size });
}
const learnState = (tid) => S.learn?.[tid];
function learnStatus(t) {
  const L = learnState(t.id);
  if (!L) return { label: 'Not started', cls: '' };
  if (L.done) return { label: `${L.score}/${L.n} correct`, cls: L.score / L.n >= 0.75 ? 'good' : L.score / L.n >= 0.6 ? 'warn' : 'bad' };
  return { label: `Part ${L.part + 1} of ${lessonPlan(t).parts.length}`, cls: 'warn' };
}
const nextLesson = () => D.topics.find((t) => learnState(t.id) && !learnState(t.id).done) || D.topics.find((t) => !learnState(t.id));

function viewLearn(v, parts) {
  if (parts[0]) return runLesson(v, parts[0]);
  const done = D.topics.filter((t) => learnState(t.id)?.done).length, nx = nextLesson();
  v.innerHTML = `<h1>Learn</h1><p class="muted" style="max-width:62ch">Guided lessons in exam-outline order. Each lesson is split into short parts. After each part you answer a few questions on what you just read, then move on. Answers count toward your quiz stats and estimated score.</p>
  <div class="card learn-hero"><div class="row between"><div><div class="eyebrow">${done} of ${D.topics.length} lessons complete</div>
    <h2 style="margin:4px 0 0">${nx ? (learnState(nx.id) ? 'Continue: ' : 'Up next: ') + esc(nx.title) : 'All lessons complete'}</h2>
    ${nx ? `<div class="small muted" style="margin-top:4px">Section ${D.secById[nx.sec].num} · ${lessonPlan(nx).parts.length} parts · about ${Math.max(5, Math.round(nx.reading.length / 900))} min</div>` : '<div class="small muted">Redo any lesson below, or switch to quizzes and the practice exam.</div>'}</div>
    ${nx ? `<a class="btn primary" href="#/learn/${nx.id}">${learnState(nx.id) ? 'Resume lesson' : 'Start lesson'}</a>` : `<a class="btn primary" href="#/exam">Take a practice exam</a>`}</div>
    <div class="bar" style="margin-top:14px"><i style="width:${pct(done, D.topics.length)}%;background:var(--accent)"></i></div></div>
  <div class="stack" style="margin-top:16px">${D.sections.map((s) => `<div class="card sec-card" style="--c:${SEC_COLORS[s.id]}">
    <div class="row between"><div><div class="eyebrow">Section ${s.num} · ${s.weight}% of exam</div><h2 style="margin:0">${esc(s.title)}</h2></div><span class="pill">${s.topics.filter((t) => learnState(t.id)?.done).length}/${s.topics.length} done</span></div>
    <div class="lesson-list">${s.topics.map((t, i) => { const st = learnStatus(t), L = learnState(t.id); return `<a href="#/learn/${t.id}" class="lesson-row"><span class="lnum ${L?.done ? 'done' : L ? 'mid' : ''}">${L?.done ? '✓' : i + 1}</span><span class="ltitle">${esc(t.title)}</span><span class="pill ${st.cls}">${st.label}</span></a>`; }).join('')}</div></div>`).join('')}</div>`;
}

function runLesson(v, tid) {
  const t = D.topicById[tid];
  if (!t) { v.innerHTML = '<div class="empty">Lesson not found. <a href="#/learn">All lessons</a></div>'; return; }
  const plan = lessonPlan(t), s = D.secById[t.sec], P = plan.parts.length;
  S.learn = S.learn || {};
  const prior = S.learn[tid];
  const L = prior && !prior.done ? { ...prior } : { part: 0, score: 0, n: 0, done: false, t: Date.now() };
  let committed = !prior?.done; // redoing a finished lesson keeps the old result until the first answer
  if (committed) { S.learn[tid] = L; save(); }
  // phase: 'read' | 'check'; qi index within the part's checks; ans for current question
  let phase = 'read', qi = 0, ans = null, partRight = 0;
  session = { kind: 'learn', done: false, qs: [], ans: [] };
  const stepper = () => `<div class="lsteps">${plan.parts.map((_, k) => `<span class="lstep ${k < L.part || L.done ? 'done' : k === L.part ? 'on' : ''}"><i></i>Part ${k + 1}</span>`).join('')}<span class="lstep ${L.done ? 'on' : ''}"><i></i>Wrap-up</span></div>`;
  const head = () => `<div class="row between" style="margin-bottom:10px"><a class="btn sm ghost" href="#/learn">← All lessons</a><span class="muted small">${esc(t.title)}</span></div>${stepper()}`;
  const draw = () => {
    if (L.done) return wrap();
    const checks = plan.checks[L.part];
    if (phase === 'read') {
      v.innerHTML = `<div class="lesson">${head()}
        <article class="card lesson-card">
          <div class="eyebrow"><span class="dot" style="background:${SEC_COLORS[s.id]};margin-right:6px"></span>Section ${s.num} · Part ${L.part + 1} of ${P}</div>
          ${L.part === 0 ? `<h1 style="margin-top:6px">${esc(t.title)}</h1>` : ''}
          <div class="prose">${plan.parts[L.part]}</div>
        </article>
        <div class="lesson-foot"><span class="small muted">Next: ${checks.length} question${checks.length === 1 ? '' : 's'} on this part</span><button class="btn primary" id="go">Check my understanding →</button></div></div>`;
      $('#go').onclick = () => { phase = 'check'; qi = 0; ans = null; partRight = 0; draw(); window.scrollTo(0, 0); };
      return;
    }
    const q = checks[qi], revealed = ans !== null, last = qi === checks.length - 1;
    v.innerHTML = `<div class="lesson">${head()}
      <div class="card lesson-card">
        <div class="row between" style="margin-bottom:8px"><div class="eyebrow">Check · Part ${L.part + 1}</div><span class="small muted">Question ${qi + 1} of ${checks.length}</span></div>
        ${qCard(q, ans, revealed, false)}
        <div class="row between" style="margin-top:18px"><button class="btn ghost" id="reread">Re-read part ${L.part + 1}</button>
        <button class="btn primary" id="next" ${revealed ? '' : 'disabled'}>${last ? (L.part === P - 1 ? 'Finish lesson' : `Continue to part ${L.part + 2} →`) : 'Next question'}</button></div>
      </div></div>`;
    $$('.opt', v).forEach((b) => (b.onclick = () => choose(+b.dataset.i)));
    $('#reread').onclick = () => { phase = 'read'; draw(); window.scrollTo(0, 0); };
    $('#next').onclick = next;
    const lk = $('.explain a', v); if (lk) lk.remove();
  };
  const choose = (k) => {
    if (phase !== 'check' || ans !== null) return;
    const q = plan.checks[L.part][qi]; ans = k;
    if (!committed) { S.learn[tid] = L; committed = true; }
    const ok = k === q.answer; recordAnswer(q, ok); if (ok) partRight++;
    session.qs.push(q); session.ans.push(k);
    L.score += ok ? 1 : 0; L.n++; L.t = Date.now(); save(); draw();
  };
  const next = () => {
    if (ans === null) return;
    const checks = plan.checks[L.part];
    if (qi < checks.length - 1) { qi++; ans = null; draw(); return; }
    if (L.part < P - 1) { L.part++; phase = 'read'; L.t = Date.now(); save(); draw(); window.scrollTo(0, 0); return; }
    L.done = true; L.t = Date.now();
    if (!S.read[tid]) { S.read[tid] = Date.now(); bumpDay(3); }
    save(); session.done = true; draw(); window.scrollTo(0, 0);
  };
  const wrap = () => {
    const idx = D.topics.indexOf(t), nx = D.topics[idx + 1], r = L.n ? L.score / L.n : 0;
    const missed = session.qs.map((q, i) => [q, session.ans[i]]).filter(([q, a]) => a !== q.answer);
    v.innerHTML = `<div class="lesson">${head()}
      <div class="card lesson-card"><div class="row between"><div><div class="eyebrow">Lesson complete</div><h1 style="margin:4px 0 0">${esc(t.title)}</h1></div>
        <div class="ring" style="--p:${Math.round(r * 100)}"><span>${L.score}/${L.n}</span></div></div>
        <p class="muted" style="margin-top:10px">${r >= 0.75 ? 'Solid. This topic is marked as read.' : r >= 0.5 ? 'Getting there. Review the key points below, then drill the flashcards.' : 'This one needs another pass. Re-read the key points and try the lesson again.'}</p>
        <div class="keypoints"><div class="eyebrow">Key points to remember</div><ul>${t.keyPoints.map((k) => `<li>${esc(k)}</li>`).join('')}</ul></div>
        ${missed.length ? `<h3 style="margin-top:22px">Missed this session</h3>${missed.map(([q, a]) => `<div class="review-item">${qCard(q, a, true, false)}</div>`).join('')}` : ''}
        <div class="row" style="margin-top:20px;flex-wrap:wrap"><a class="btn" href="#/cards/run?topic=${t.id}&mode=all">Flashcards for this topic</a>
          ${plan.extra > 0 ? `<a class="btn" href="#/quiz/run?topic=${t.id}&count=${plan.extra + session.qs.length}&src=smart">Full topic quiz</a>` : ''}
          <button class="btn" id="redo">Redo lesson</button>
          ${nx ? `<a class="btn primary" href="#/learn/${nx.id}">Next lesson: ${esc(nx.title)} →</a>` : `<a class="btn primary" href="#/exam">Take a practice exam →</a>`}</div>
      </div></div>`;
    $$('.review-item .explain a', v).forEach((a) => a.remove());
    $('#redo').onclick = () => { delete S.learn[tid]; save(); runLesson(v, tid); window.scrollTo(0, 0); };
  };
  session.key = (e) => {
    const k = e.key.toUpperCase();
    if (phase === 'check' && !L.done && k.length === 1 && LETTERS.includes(k) && $('.opt')) choose(LETTERS.indexOf(k));
    else if (e.key === 'Enter' && $('#next') && !$('#next').disabled) next();
  };
  draw();
}

/* ---------- selection UI (shared by cards & quiz) ---------- */
function scopePicker(sel) {
  return `<div class="eyebrow">Sections</div><div class="row" id="secChips">${D.sections.map((s) => `<span class="chip ${sel.includes(s.id) ? 'on' : ''}" data-sec="${s.id}" tabindex="0"><span class="dot" style="background:${SEC_COLORS[s.id]}"></span>${s.num}. ${esc(s.title)}</span>`).join('')}</div>
  <div class="eyebrow" style="margin-top:14px">Topic (optional)</div>
  <select id="topicSel"><option value="">All topics in selected sections</option>${D.sections.map((s) => `<optgroup label="${s.num}. ${esc(s.title)}">${s.topics.map((t) => `<option value="${t.id}">${esc(t.title)}</option>`).join('')}</optgroup>`).join('')}</select>`;
}
function wireScope(root) {
  $$('#secChips .chip', root).forEach((c) => { const f = () => c.classList.toggle('on'); c.onclick = f; c.onkeydown = (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); f(); } }; });
}
function readScope(root) {
  const topic = $('#topicSel', root).value;
  const secs = $$('#secChips .chip.on', root).map((c) => c.dataset.sec);
  return { topic, secs: secs.length ? secs : SECTION_IDS };
}
function filterBy(list, { topic, secs }) { return list.filter((x) => (topic ? x.topic === topic : secs.includes(x.sec))); }
function scopeFromParams(p) { return { topic: p.get('topic') || '', secs: p.get('sec') ? p.get('sec').split(',') : SECTION_IDS }; }
function scopeLabel(sc) { return sc.topic ? D.topicById[sc.topic]?.title : sc.secs.length === 4 ? 'All sections' : sc.secs.map((s) => 'Section ' + D.secById[s].num).join(', '); }

/* ---------- flashcards ---------- */
function viewCards(v, parts, p) {
  if (parts[0] === 'run') return runCards(v, p);
  const now = Date.now();
  const due = D.cards.filter((c) => cardDue(c.id, now)).length, nw = D.cards.filter((c) => cardNew(c.id)).length, ms = D.cards.filter((c) => cardMastered(c.id)).length;
  v.innerHTML = `<h1>Flashcards</h1><p class="muted">Spaced repetition: cards you get right come back later (1 → 3 → 7 → 14 → 30 → 60 days); cards you miss come back in this session.</p>
  <div class="grid g3" style="margin-bottom:16px"><div class="card"><div class="eyebrow">Due now</div><div class="big">${due}</div></div><div class="card"><div class="eyebrow">New</div><div class="big">${nw}</div></div><div class="card"><div class="eyebrow">Mastered</div><div class="big">${ms}<span class="muted" style="font-size:1rem"> / ${D.cards.length}</span></div></div></div>
  <div class="card" id="setup">${scopePicker(SECTION_IDS)}
    <div class="eyebrow" style="margin-top:14px">Which cards</div>
    <div class="seg" id="modeSeg"><button data-m="smart" class="on">Due + new</button><button data-m="due">Due only</button><button data-m="all">All (browse)</button><button data-m="hard">Trouble cards</button></div>
    <div class="row" style="margin-top:18px"><button class="btn primary" id="go">Start session</button><span class="muted small">Tip: <kbd>Space</kbd> flips, <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> rate.</span></div></div>`;
  wireScope(v);
  let mode = 'smart';
  $$('#modeSeg button').forEach((b) => (b.onclick = () => { $$('#modeSeg button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); mode = b.dataset.m; }));
  $('#go').onclick = () => { const sc = readScope(v); location.hash = `#/cards/run?mode=${mode}${sc.topic ? '&topic=' + sc.topic : '&sec=' + sc.secs.join(',')}`; };
}
function runCards(v, p) {
  const sc = scopeFromParams(p), mode = p.get('mode') || 'smart', now = Date.now();
  let pool = filterBy(D.cards, sc);
  if (mode === 'due') pool = pool.filter((c) => cardDue(c.id, now));
  else if (mode === 'hard') pool = pool.filter((c) => S.cards[c.id] && (S.cards[c.id].lapses || 0) > 0).sort((a, b) => (S.cards[b.id].lapses || 0) - (S.cards[a.id].lapses || 0));
  else if (mode === 'smart') { const d = pool.filter((c) => cardDue(c.id, now)); const n = pool.filter((c) => cardNew(c.id)).slice(0, 25); pool = [...shuffle(d), ...n]; }
  else pool = shuffle(pool);
  if (mode !== 'smart' && mode !== 'hard') pool = shuffle(pool);
  pool = pool.slice(0, 60);
  if (!pool.length) {
    v.innerHTML = `<div class="card empty"><h2>Nothing to review here 🎉</h2><p>${mode === 'due' ? 'No cards are due right now.' : mode === 'hard' ? 'You have no missed cards yet.' : 'No cards match.'}</p><div class="row" style="justify-content:center"><a class="btn" href="#/cards">Back</a><a class="btn primary" href="#/cards/run?mode=all${sc.topic ? '&topic=' + sc.topic : '&sec=' + sc.secs.join(',')}">Browse all cards</a></div></div>`;
    return;
  }
  session = { kind: 'cards', queue: pool.map((c) => c.id), i: 0, done: false, stats: { again: 0, good: 0, easy: 0 }, seen: new Set() };
  const total = pool.length;
  const draw = () => {
    if (!session.queue.length) return finish();
    const c = D.cardById[session.queue[0]], st = S.cards[c.id], t = D.topicById[c.topic];
    const n = (b) => { const d = BOX_DAYS[Math.min(6, b)]; return d ? d + 'd' : 'now'; };
    const box = st?.b || 0;
    v.innerHTML = `<div class="row between" style="max-width:680px;margin:0 auto 12px"><a class="btn sm ghost" href="#/cards">← Exit</a><span class="muted small">${session.seen.size} / ${total} · ${esc(scopeLabel(sc))}</span></div>
    <div class="progress-line" style="max-width:680px;margin:0 auto 16px"><i style="width:${pct(session.seen.size, total)}%"></i></div>
    <div class="fc-wrap"><div class="fc" id="fc" tabindex="0" role="button" aria-label="Flip card">
      <div class="face front"><span class="lbl">${esc(t?.title || '')}</span><div class="txt">${esc(c.front)}</div><div class="muted tiny" style="position:absolute;bottom:14px">Tap to reveal</div></div>
      <div class="face back"><span class="lbl">Answer</span><div class="txt">${esc(c.back)}</div></div></div></div>
    <div class="rate" id="rate" style="visibility:hidden">
      <button class="btn bad" data-r="again">Missed it<small>again · 1</small></button>
      <button class="btn" data-r="good">Got it<small>${n(box + 1)} · 2</small></button>
      <button class="btn good" data-r="easy">Easy<small>${n(box + 2)} · 3</small></button></div>
    <div style="text-align:center;margin-top:14px"><a class="small" href="#/read/${c.topic}">Read the lesson on this →</a></div>`;
    const fc = $('#fc');
    const flip = () => { fc.classList.toggle('flip'); $('#rate').style.visibility = 'visible'; };
    fc.onclick = flip; fc.focus();
    $$('#rate button').forEach((b) => (b.onclick = () => rate(b.dataset.r)));
  };
  const rate = (r) => {
    const id = session.queue.shift(), st = S.cards[id] || { b: 0, lapses: 0 };
    const now = Date.now();
    session.seen.add(id); session.stats[r]++;
    if (r === 'again') { st.b = 0; st.lapses = (st.lapses || 0) + 1; st.due = now; session.queue.splice(Math.min(3, session.queue.length), 0, id); }
    else { st.b = Math.min(6, (st.b || 0) + (r === 'easy' ? 2 : 1)); st.due = now + BOX_DAYS[st.b] * DAY - 36e5; }
    st.t = now; st.n = (st.n || 0) + 1; S.cards[id] = st; bumpDay(1); save(); draw();
  };
  const finish = () => {
    session.done = true;
    v.innerHTML = `<div class="card" style="max-width:560px;margin:30px auto;text-align:center"><h2>Session complete</h2><p class="muted">${session.seen.size} cards reviewed</p>
    <div class="grid g3" style="margin:16px 0"><div><div class="big" style="color:var(--bad)">${session.stats.again}</div><div class="small muted">missed</div></div><div><div class="big">${session.stats.good}</div><div class="small muted">got it</div></div><div><div class="big" style="color:var(--good)">${session.stats.easy}</div><div class="small muted">easy</div></div></div>
    <div class="row" style="justify-content:center"><a class="btn" href="#/cards">Flashcards home</a><a class="btn primary" href="#/quiz/run?count=15&src=smart${sc.topic ? '&topic=' + sc.topic : '&sec=' + sc.secs.join(',')}">Take a quiz on these</a></div></div>`;
  };
  session.key = (e) => {
    if (!$('#fc')) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); $('#fc').click(); }
    else if ($('#rate').style.visibility === 'visible' && ['1', '2', '3'].includes(e.key)) rate(['again', 'good', 'easy'][+e.key - 1]);
  };
  draw();
}

/* ---------- quiz ---------- */
function pickQuestions(pool, count, src) {
  const now = Date.now();
  if (src === 'unseen') pool = pool.filter((q) => !S.qs[q.id]);
  else if (src === 'missed') pool = pool.filter((q) => qLast(q.id) === 0);
  if (src === 'smart') {
    // prioritize missed, then unseen, then oldest-seen
    const score = (q) => { const s = S.qs[q.id]; if (!s) return 1 + Math.random(); if (qLast(q.id) === 0) return 2 + Math.random(); return Math.min(1, (now - s.t) / (14 * DAY)) * Math.random(); };
    return pool.map((q) => [score(q), q]).sort((a, b) => b[0] - a[0]).slice(0, count).map((x) => x[1]).sort(() => Math.random() - 0.5);
  }
  return shuffle(pool).slice(0, count);
}
function recordAnswer(q, ok) {
  const s = S.qs[q.id] || { r: [] };
  s.r = [...(s.r || []), ok ? 1 : 0].slice(-5); s.t = Date.now(); S.qs[q.id] = s; bumpDay(1);
}
function viewQuiz(v, parts, p) {
  if (parts[0] === 'run') return runQuiz(v, p);
  const missed = D.qs.filter((q) => qLast(q.id) === 0).length, unseen = D.qs.filter((q) => !S.qs[q.id]).length;
  v.innerHTML = `<h1>Quizzes</h1><p class="muted">Build a quiz from ${D.qs.length} exam-style questions. Tutor mode explains each answer right away; test mode saves feedback for the end.</p>
  <div class="card" id="setup">${scopePicker(SECTION_IDS)}
    <div class="grid g3" style="margin-top:14px">
      <div><div class="eyebrow">Questions</div><div class="seg" id="cnt">${[10, 20, 30, 50].map((n, i) => `<button data-v="${n}" class="${i === 1 ? 'on' : ''}">${n}</button>`).join('')}</div></div>
      <div><div class="eyebrow">Pull from</div><select id="src"><option value="smart">Smart mix (missed + new first)</option><option value="all">Random</option><option value="unseen">Unseen only (${unseen})</option><option value="missed">Missed last time (${missed})</option></select></div>
      <div><div class="eyebrow">Mode</div><div class="seg" id="mode"><button data-v="tutor" class="on">Tutor</button><button data-v="test">Test</button></div></div>
    </div>
    <div class="row" style="margin-top:18px"><button class="btn primary" id="go">Start quiz</button>${missed ? `<a class="btn" href="#/quiz/run?src=missed&count=30">Redo ${missed} missed</a>` : ''}<span class="muted small hide-sm">Keys: <kbd>A</kbd>–<kbd>D</kbd> answer, <kbd>Enter</kbd> next</span></div></div>`;
  wireScope(v);
  const segv = (id) => $(`#${id} button.on`).dataset.v;
  ['cnt', 'mode'].forEach((id) => $$(`#${id} button`).forEach((b) => (b.onclick = () => { $$(`#${id} button`).forEach((x) => x.classList.remove('on')); b.classList.add('on'); })));
  $('#go').onclick = () => { const sc = readScope(v); location.hash = `#/quiz/run?count=${segv('cnt')}&src=${$('#src').value}&mode=${segv('mode')}${sc.topic ? '&topic=' + sc.topic : '&sec=' + sc.secs.join(',')}`; };
}
function runQuiz(v, p) {
  const sc = scopeFromParams(p), count = +(p.get('count') || 20), src = p.get('src') || 'smart', mode = p.get('mode') || 'tutor';
  const qs = pickQuestions(filterBy(D.qs, sc), count, src);
  if (!qs.length) { v.innerHTML = `<div class="card empty"><h2>No questions match</h2><p>Try a different filter.</p><a class="btn" href="#/quiz">Back</a></div>`; return; }
  session = { kind: 'quiz', qs, i: 0, ans: Array(qs.length).fill(null), done: false };
  const draw = () => {
    const i = session.i, q = qs[i], a = session.ans[i], revealed = mode === 'tutor' && a !== null;
    v.innerHTML = `<div style="max-width:760px;margin:0 auto">
      <div class="row between" style="margin-bottom:10px"><a class="btn sm ghost" href="#/quiz">← Exit</a><span class="muted small">Question ${i + 1} of ${qs.length} · ${esc(scopeLabel(sc))}</span></div>
      <div class="progress-line"><i style="width:${pct(i + (a !== null ? 1 : 0), qs.length)}%"></i></div>
      <div class="card">${qCard(q, a, revealed)}
        <div class="row between" style="margin-top:18px"><button class="btn" id="prev" ${i === 0 ? 'disabled' : ''}>Back</button>
        <button class="btn primary" id="next" ${a === null ? 'disabled' : ''}>${i === qs.length - 1 ? 'Finish' : 'Next'}</button></div></div></div>`;
    $$('.opt', v).forEach((b) => (b.onclick = () => choose(+b.dataset.i)));
    $('#prev').onclick = () => { session.i--; draw(); };
    $('#next').onclick = next;
  };
  const choose = (k) => {
    const i = session.i; if (mode === 'tutor' && session.ans[i] !== null) return;
    const first = session.ans[i] === null; session.ans[i] = k;
    if (first || mode === 'test') { if (mode === 'tutor') { recordAnswer(qs[i], k === qs[i].answer); save(); } }
    draw();
  };
  const next = () => { if (session.ans[session.i] === null) return; if (session.i < qs.length - 1) { session.i++; draw(); } else finish(); };
  const finish = () => {
    if (mode === 'test') { qs.forEach((q, i) => recordAnswer(q, session.ans[i] === q.answer)); save(); }
    session.done = true;
    const right = qs.filter((q, i) => session.ans[i] === q.answer).length;
    v.innerHTML = resultsHTML({ title: 'Quiz results', qs, ans: session.ans, right, again: location.hash });
    wireReview(v);
  };
  session.key = (e) => {
    const k = e.key.toUpperCase();
    if (LETTERS.includes(k) && k.length === 1 && $('.opt')) choose(LETTERS.indexOf(k));
    else if (e.key === 'Enter' && $('#next') && !$('#next').disabled) next();
  };
  draw();
}
function qCard(q, a, revealed, showTopic = true) {
  const t = D.topicById[q.topic];
  return `${showTopic ? `<div class="row small muted" style="margin-bottom:10px"><span class="dot" style="background:${SEC_COLORS[q.sec]}"></span>${esc(t?.title || '')}</div>` : ''}
    <div class="qtext">${esc(q.q)}</div>
    <div class="opts">${q.choices.map((c, k) => { let cls = ''; if (revealed) { if (k === q.answer) cls = 'right'; else if (k === a) cls = 'wrong'; } else if (k === a) cls = 'sel'; return `<button class="opt ${cls}" data-i="${k}" ${revealed ? 'disabled' : ''}><span class="l">${LETTERS[k]}</span><span>${esc(c)}</span></button>`; }).join('')}</div>
    ${revealed ? `<div class="explain ${a === q.answer ? 'good' : 'bad'}"><strong>${a === q.answer ? 'Correct.' : `Not quite — the answer is ${LETTERS[q.answer]}.`}</strong> ${esc(q.explanation)}<div class="small" style="margin-top:8px"><a href="#/read/${q.topic}">Review the lesson →</a></div></div>` : ''}`;
}
function resultsHTML({ title, qs, ans, right, again, extra = '' }) {
  const by = {}; qs.forEach((q, i) => { by[q.sec] = by[q.sec] || [0, 0]; by[q.sec][1]++; if (ans[i] === q.answer) by[q.sec][0]++; });
  const wrong = qs.map((q, i) => [q, i]).filter(([q, i]) => ans[i] !== q.answer);
  return `<div style="max-width:820px;margin:0 auto">
    <div class="card"><div class="row between"><div><div class="eyebrow">${esc(title)}</div><div class="big">${right} / ${qs.length} <span class="muted" style="font-size:1.1rem">(${pct(right, qs.length)}%)</span></div></div>${extra}</div>
      <div class="kv" style="margin-top:16px">${Object.keys(by).sort((a, b) => SECTION_IDS.indexOf(a) - SECTION_IDS.indexOf(b)).map((s) => `<span class="row" style="gap:6px"><span class="dot" style="background:${SEC_COLORS[s]}"></span>${esc(D.secById[s].title)}</span><div class="bar"><i style="width:${pct(by[s][0], by[s][1])}%;background:${SEC_COLORS[s]}"></i></div><span>${by[s][0]}/${by[s][1]}</span>`).join('')}</div>
      <div class="row" style="margin-top:16px"><a class="btn" href="#/">Dashboard</a><button class="btn primary" id="againBtn" data-h="${esc(again)}">Try another set</button></div></div>
    <div class="row between" style="margin:22px 0 8px"><h2 style="margin:0">Review</h2><div class="seg" id="revSeg"><button class="on" data-f="wrong">Missed (${wrong.length})</button><button data-f="all">All</button></div></div>
    <div class="card" id="revList"></div></div>`;
}
function wireReview(v) {
  const qs = session.qs, ans = session.ans;
  const render = (f) => {
    const items = qs.map((q, i) => [q, i]).filter(([q, i]) => f === 'all' || ans[i] !== q.answer);
    $('#revList').innerHTML = items.length ? items.map(([q, i]) => `<div class="review-item"><div class="small muted">#${i + 1}</div>${qCard(q, ans[i] ?? -1, true)}</div>`).join('') : '<div class="empty">Perfect — nothing missed.</div>';
  };
  render('wrong');
  $$('#revSeg button').forEach((b) => (b.onclick = () => { $$('#revSeg button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); render(b.dataset.f); }));
  $('#againBtn').onclick = () => { const h = $('#againBtn').dataset.h; if (location.hash === h) route(); else location.hash = h; };
}

/* ---------- practice exam ---------- */
function buildExam() {
  const qs = [];
  SECTION_IDS.forEach((s) => { qs.push(...pickQuestions(D.qs.filter((q) => q.sec === s), EXAM_MIX[s], 'all')); });
  return { id: uid(), qids: shuffle(qs).map((q) => q.id), ans: Array(qs.length).fill(null), flags: [], i: 0, start: Date.now(), limit: EXAM_MIN * 60 };
}
function viewExam(v, parts) {
  let ip = null; try { ip = JSON.parse(lsGet(LS_EXAM) || 'null'); } catch {}
  if (parts[0] === 'go' && ip) return runExam(v, ip);
  const hist = S.exams.slice(-5).reverse();
  v.innerHTML = `<h1>Practice exam</h1>
  <div class="grid g2"><div class="card"><h3>Full-length, timed</h3>
    <ul class="muted" style="padding-left:1.1em;margin:8px 0 16px"><li><strong>130 questions</strong>, weighted like the real exam: Economics 20 · Investment Vehicles 32 · Client Strategies 39 · Laws & Ethics 39</li><li><strong>180 minutes</strong>, with a countdown timer</li><li><strong>92 correct</strong> (about 71%) is a pass</li><li>Flag questions and jump around with the navigator. Answers are revealed at the end.</li><li>Your place is saved if you close the tab.</li></ul>
    <div class="row">${ip ? `<a class="btn primary" href="#/exam/go">Resume exam (${ip.ans.filter((a) => a !== null).length}/${ip.qids.length} answered)</a><button class="btn" id="newExam">Start over</button>` : `<button class="btn primary" id="newExam">${icon('exam')}Start exam</button>`}</div></div>
    <div class="card"><h3>Recent attempts</h3>${hist.length ? hist.map((e) => `<div class="row between" style="padding:8px 0;border-top:1px solid var(--border)"><span>${new Date(e.t).toLocaleDateString()} <span class="muted small">· ${fmtTime(e.secs)}</span></span><span class="pill ${e.score >= PASS ? 'good' : 'bad'}">${e.score}/${e.total} · ${e.score >= PASS ? 'Pass' : 'Below pass'}</span></div>`).join('') + `<div style="margin-top:8px"><a class="small" href="#/history">Full history →</a></div>` : '<p class="muted small">No exams yet. Take one to see where you stand.</p>'}</div></div>`;
  $('#newExam').onclick = async () => {
    if (ip) { const ok = await modal('<h3>Start a new exam?</h3><p class="muted">Your in-progress exam will be discarded.</p>', [{ label: 'Cancel', value: false }, { label: 'Start new', value: true, cls: 'primary' }]); if (!ok) return; }
    lsSet(LS_EXAM, JSON.stringify(buildExam())); location.hash = '#/exam/go';
  };
}
function runExam(v, ex) {
  const qs = ex.qids.map((id) => D.qById[id]).filter(Boolean);
  session = { kind: 'exam', done: false };
  const persist = () => lsSet(LS_EXAM, JSON.stringify(ex));
  const remaining = () => ex.limit - (Date.now() - ex.start) / 1000;
  const draw = () => {
    const i = ex.i, q = qs[i], a = ex.ans[i], answered = ex.ans.filter((x) => x !== null).length;
    v.innerHTML = `<div class="exam-layout"><div>
      <div class="row between" style="margin-bottom:10px"><span class="muted small">Question ${i + 1} of ${qs.length}</span><span class="timer" id="timer"></span></div>
      <div class="progress-line"><i style="width:${pct(answered, qs.length)}%"></i></div>
      <div class="card">${qCard(q, a, false, false)}
        <div class="row between" style="margin-top:18px"><div class="row"><button class="btn" id="prev" ${i === 0 ? 'disabled' : ''}>Back</button><button class="btn" id="flag">${ex.flags.includes(i) ? '★ Flagged' : '☆ Flag'}</button></div>
        <button class="btn primary" id="next">${i === qs.length - 1 ? 'Review & submit' : 'Next'}</button></div></div></div>
      <aside class="card"><div class="row between"><strong>Navigator</strong><span class="small muted">${answered}/${qs.length}</span></div>
        <div class="qnav" style="margin-top:12px">${qs.map((_, k) => `<button data-k="${k}" class="${ex.ans[k] !== null ? 'ans' : ''} ${ex.flags.includes(k) ? 'flag' : ''} ${k === i ? 'cur' : ''}">${k + 1}</button>`).join('')}</div>
        <div class="small muted" style="margin-top:12px">Blue = answered · dot = flagged</div>
        <div class="row" style="margin-top:14px"><button class="btn sm" id="pause">Save & exit</button><button class="btn sm primary" id="submit">Submit exam</button></div></aside></div>`;
    $$('.opt', v).forEach((b) => (b.onclick = () => { ex.ans[i] = +b.dataset.i; persist(); draw(); }));
    $('#prev').onclick = () => { ex.i--; persist(); draw(); };
    $('#next').onclick = () => { if (ex.i < qs.length - 1) { ex.i++; persist(); draw(); } else submit(); };
    $('#flag').onclick = () => { ex.flags = ex.flags.includes(i) ? ex.flags.filter((x) => x !== i) : [...ex.flags, i]; persist(); draw(); };
    $$('.qnav button', v).forEach((b) => (b.onclick = () => { ex.i = +b.dataset.k; persist(); draw(); }));
    $('#pause').onclick = () => { persist(); location.hash = '#/exam'; };
    $('#submit').onclick = submit;
    tick();
  };
  const tick = () => { const r = remaining(), el = $('#timer'); if (!el) return; el.textContent = fmtTime(r); el.classList.toggle('low', r < 600); if (r <= 0) grade(true); };
  const submit = async () => {
    const blank = ex.ans.filter((x) => x === null).length;
    const ok = await modal(`<h3>Submit exam?</h3><p class="muted">${blank ? `You have <strong>${blank} unanswered</strong> question${blank === 1 ? '' : 's'}${ex.flags.length ? ` and ${ex.flags.length} flagged` : ''}. Unanswered questions count as wrong.` : `All questions answered${ex.flags.length ? `, ${ex.flags.length} flagged for review` : ''}.`}</p>`, [{ label: 'Keep working', value: false }, { label: 'Submit', value: true, cls: 'primary' }]);
    if (ok) grade(false);
  };
  const grade = (timeout) => {
    clearInterval(examTick);
    const right = qs.filter((q, i) => ex.ans[i] === q.answer).length;
    const by = {}; qs.forEach((q, i) => { by[q.sec] = by[q.sec] || [0, 0]; by[q.sec][1]++; if (ex.ans[i] === q.answer) by[q.sec][0]++; });
    const secs = Math.min(ex.limit, (Date.now() - ex.start) / 1000);
    qs.forEach((q, i) => { if (ex.ans[i] !== null) recordAnswer(q, ex.ans[i] === q.answer); });
    S.exams.push({ id: ex.id, t: Date.now(), score: right, total: qs.length, secs: Math.round(secs), by });
    save(); lsSet(LS_EXAM, null);
    session = { kind: 'exam', qs, ans: ex.ans, done: true };
    const passed = right >= PASS;
    v.innerHTML = resultsHTML({ title: (timeout ? 'Time expired · ' : '') + 'Practice exam', qs, ans: ex.ans, right, again: '#/exam',
      extra: `<div style="text-align:right"><span class="pill ${passed ? 'good' : 'bad'}" style="font-size:.9rem;padding:5px 12px">${passed ? 'PASS' : 'Below passing'}</span><div class="small muted" style="margin-top:6px">Need ${PASS}/${EXAM_Q} · Time ${fmtTime(secs)}</div></div>` });
    wireReview(v);
  };
  session.key = (e) => {
    const k = e.key.toUpperCase();
    if (LETTERS.includes(k) && k.length === 1 && $('.opt')) { ex.ans[ex.i] = LETTERS.indexOf(k); persist(); draw(); }
    else if (e.key === 'ArrowRight' && ex.i < qs.length - 1) { ex.i++; persist(); draw(); }
    else if (e.key === 'ArrowLeft' && ex.i > 0) { ex.i--; persist(); draw(); }
  };
  if (remaining() <= 0) return grade(true);
  draw();
  examTick = setInterval(tick, 1000);
}

/* ---------- videos ---------- */
function viewVideos(v) {
  const general = [
    { title: 'Series 65 Complete Course (playlist)', url: 'https://www.youtube.com/playlist?list=PLT9ng_7TzM_jw9hgiUXXa-2b7-5OwLKs8' },
    { title: 'FINRA Series 65 Exam Prep: Full Course', url: 'https://www.youtube.com/watch?v=pZ2xmtj8Zw4' },
    { title: 'Series 7 Guru – Series 65 IAR exam playlist', url: 'https://www.youtube.com/playlist?list=PLK1IazV_JQbGn7K_gBAD_TWW_TLrlRxA5' },
    { title: 'Series 65 free practice tests (playlist)', url: 'https://www.youtube.com/playlist?list=PLK1IazV_JQbEKhC3iQqzTRfXuWNpE3p_e' },
    { title: 'How to Pass the Series 65 by Knowing the Test Specifications', url: 'https://www.youtube.com/watch?v=gz1kOCRtcZA' },
    { title: 'Series 65 Practice Test Explicated', url: 'https://www.youtube.com/watch?v=YBxsd5CV6pk' }
  ];
  v.innerHTML = `<h1>Videos</h1><p class="muted">Hand-picked YouTube lessons plus a topic search for every lesson. Videos open on YouTube in a new tab.</p>
    <h2 style="margin-top:20px">Full courses & practice-test walkthroughs</h2><div class="vids">${general.map(vidCard).join('')}</div>
    ${D.sections.map((s) => `<h2 style="margin-top:30px"><span class="dot" style="background:${SEC_COLORS[s.id]};margin-right:8px"></span>Section ${s.num}: ${esc(s.title)}</h2>
      ${s.topics.map((t) => `<div style="margin:16px 0 8px" class="row between"><strong>${esc(t.title)}</strong><a class="small" href="#/read/${t.id}">Reading →</a></div><div class="vids">${(t.videos || []).map(vidCard).join('')}</div>`).join('')}`).join('')}`;
}

/* ---------- history ---------- */
function viewHistory(v) {
  const ex = S.exams.slice().reverse();
  v.innerHTML = `<h1>Exam history</h1>${ex.length ? `<div class="card">${ex.map((e) => `<div class="review-item"><div class="row between"><strong>${new Date(e.t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</strong><span class="pill ${e.score >= PASS ? 'good' : 'bad'}">${e.score}/${e.total} (${pct(e.score, e.total)}%)</span></div>
    <div class="kv" style="margin-top:10px">${SECTION_IDS.filter((s) => e.by?.[s]).map((s) => `<span class="muted">${esc(D.secById[s].title)}</span><div class="bar"><i style="width:${pct(e.by[s][0], e.by[s][1])}%;background:${SEC_COLORS[s]}"></i></div><span>${e.by[s][0]}/${e.by[s][1]}</span>`).join('')}</div></div>`).join('')}</div>` : '<div class="card empty">No practice exams yet. <a href="#/exam">Take one</a>.</div>'}`;
}

/* ---------- sync & settings ---------- */
function viewSync(v) {
  v.innerHTML = `<h1>Sync & settings</h1>
  <div class="grid g2">
  <div class="card"><h3>Sync across devices</h3>
    <p class="muted small">Choose a private sync code and enter the same code on your phone, laptop, or any browser. Your progress (cards, quiz history, exams, readings) merges automatically. Treat the code like a password: anyone who has it can see your study progress.</p>
    ${syncKey ? `<div class="row between" style="margin:12px 0"><span><span class="sync-dot ${syncStatus === 'ok' ? 'ok' : syncStatus === 'err' ? 'err' : ''}"></span>${esc(syncMsg || 'Sync is on')}</span></div>
      <div class="eyebrow">Your sync code</div><div class="row" style="flex-wrap:nowrap"><input type="password" id="shownKey" value="${esc(syncKey)}" readonly><button class="btn sm" id="showKey">Show</button></div>
      <div class="row" style="margin-top:14px"><button class="btn primary" id="syncNow">${icon('sync')}Sync now</button><button class="btn" id="syncOff">Turn off on this device</button></div>`
    : `<div class="eyebrow" style="margin-top:12px">Sync code (8+ characters)</div><div class="row" style="flex-wrap:nowrap"><input type="text" id="keyIn" placeholder="e.g. a long phrase only you know" autocomplete="off"><button class="btn sm" id="gen">Generate</button></div>
      <div class="row" style="margin-top:14px"><button class="btn primary" id="syncOn">Turn on sync</button></div>`}
  </div>
  <div class="card"><h3>Exam date</h3><p class="muted small">Used for the countdown on your dashboard.</p><input type="date" id="examDate" value="${esc(S.settings.examDate || '')}">
    <hr><h3>Appearance</h3><div class="seg" id="theme">${['auto', 'light', 'dark'].map((t) => `<button data-v="${t}" class="${(lsGet(LS_THEME) || 'auto') === t ? 'on' : ''}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
    <hr><h3>Reset</h3><p class="muted small">Clear all progress on this device${syncKey ? ' and in sync' : ''}.</p><button class="btn" id="reset" style="color:var(--bad)">Reset progress</button></div>
  </div>
  <div class="card" style="margin-top:16px"><h3>About this exam</h3><p class="muted small" style="margin:0">NASAA Series 65 (Uniform Investment Adviser Law Exam): 130 scored + 10 unscored questions, 180 minutes, 92 correct to pass. Content outline effective June 12, 2023, with SECURE 2.0 updates. Dollar limits in the readings use 2026 figures; exam items may lag a year behind, so learn the concept as well as the number. Sources: <a href="https://www.nasaa.org/exams/general-exam-information/series-65-exam-content-outline/" target="_blank" rel="noopener">NASAA outline</a> · <a href="https://www.finra.org/registration-exams-ce/qualification-exams/series65" target="_blank" rel="noopener">FINRA exam page</a>.</p></div>`;
  $('#examDate').onchange = (e) => { S.settings = { examDate: e.target.value, t: Date.now() }; save(); toast('Exam date saved'); };
  $$('#theme button').forEach((b) => (b.onclick = () => { lsSet(LS_THEME, b.dataset.v === 'auto' ? null : b.dataset.v); applyTheme(); route(); }));
  $('#reset').onclick = async () => {
    const ok = await modal('<h3>Reset all progress?</h3><p class="muted">This clears flashcard schedules, quiz history, readings and exam scores. It can’t be undone.</p>', [{ label: 'Cancel', value: false }, { label: 'Reset', value: true, cls: 'bad' }]);
    if (!ok) return;
    const date = S.settings; S = blank(); S.settings = date;
    if (syncKey) { S.updatedAt = Date.now(); lsSet(LS_STATE, JSON.stringify(S)); try { await fetch('/api/progress', { method: 'PUT', headers: { 'x-sync-key': syncKey, 'content-type': 'application/json' }, body: JSON.stringify({ data: S, replace: true }) }); } catch {} }
    else save();
    toast('Progress reset'); route();
  };
  if (syncKey) {
    $('#showKey').onclick = () => { const i = $('#shownKey'); i.type = i.type === 'password' ? 'text' : 'password'; };
    $('#syncNow').onclick = () => sync(true).then(() => route());
    $('#syncOff').onclick = () => { syncKey = ''; lsSet(LS_KEY, null); syncStatus = 'off'; syncMsg = ''; route(); };
  } else {
    $('#gen').onclick = () => { const w = crypto.getRandomValues(new Uint32Array(4)); $('#keyIn').value = [...w].map((x) => x.toString(36)).join('-'); };
    $('#syncOn').onclick = async () => {
      const k = $('#keyIn').value.trim(); if (k.length < 8) return toast('Use at least 8 characters');
      syncKey = k; lsSet(LS_KEY, k); await sync(true); route();
    };
  }
}
function applyTheme() { const t = lsGet(LS_THEME); if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }

/* ---------- boot ---------- */
document.addEventListener('keydown', (e) => { if (e.target.matches('input,select,textarea') || e.metaKey || e.ctrlKey || e.altKey) return; session?.key?.(e); });
applyTheme();
loadData().then(() => { route(); if (syncKey) sync(); }).catch((e) => { $('#view').innerHTML = `<div class="card empty">Couldn't load study content (${esc(e.message)}). Refresh to try again.</div>`; });
})();
