// Genesis dashboard — vanilla, no build. Reads live state over SSE; posts intents/keys back.
const TOKEN = new URLSearchParams(location.search).get('token') || '';
const q = (id) => document.getElementById(id);
const api = (path, opts = {}) => fetch(path + (path.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(TOKEN),
  { headers: { 'content-type': 'application/json' }, ...opts });

// env-key hints for "Connect" by integration id (mirrors integrations/registry/*.yaml)
const KEYS = {
  stripe: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET'],
  supabase: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  clerk: ['CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY'],
  resend: ['RESEND_API_KEY'], 'cloudflare-r2': ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'],
  sentry: ['SENTRY_DSN'], openai: ['OPENAI_API_KEY'], 'google-gemini': ['GOOGLE_API_KEY'],
  vercel: ['VERCEL_TOKEN'], fly: ['FLY_API_TOKEN'], render: ['RENDER_API_KEY'],
};

function render(s) {
  q('project').textContent = s.project ? ' · ' + s.project : '';
  q('activity').textContent = s.activity || '';

  // usage meter
  const u = s.usage || {};
  q('usage').innerHTML = u.known
    ? `<span class="bar"><span style="width:${Math.min(100, u.pct || 0)}%;background:${(u.pct || 0) >= (u.threshold || 85) ? '#e0564f' : '#4fd18b'}"></span></span> ${u.pct || 0}%`
    : `<span class="muted">usage: n/a</span>`;
  q('pauseBtn').textContent = s.paused ? 'Resume' : 'Pause';

  // phases timeline
  q('phases').innerHTML = (s.phases || []).map((p) =>
    `<li class="ph ${p.status}"><span class="bullet"></span>${p.label}</li>`).join('');

  // todo
  const r = s.todo || s.roadmap || [];
  q('roadmapCount').textContent = r.length ? `${r.filter(i => i.test === 'done').length}/${r.length} done` : '';
  q('roadmap').innerHTML = r.map((i) =>
    `<li><span class="chip ${i.build}">build</span><span class="chip ${i.test}">test</span> ${i.title}</li>`).join('')
    || '<li class="muted">No items yet.</li>';

  // integrations
  q('integrations').innerHTML = (s.integrations || []).map((i) => {
    const connected = i.status === 'connected';
    return `<div class="intg ${i.status}">
      <div class="intg-h">${i.label}<small>${i.category || ''}</small></div>
      <div class="intg-s">${connected ? '✓ connected' : i.status === 'needs-key' ? 'needs key' : (i.status || '')}</div>
      <button class="btn ${connected ? '' : 'primary'}" data-connect="${i.id}">${connected ? 'Reconnect' : 'Connect'}</button>
    </div>`;
  }).join('') || '<p class="muted">No integrations chosen yet.</p>';
  document.querySelectorAll('[data-connect]').forEach((b) =>
    b.onclick = () => connect(b.getAttribute('data-connect')));

  // needs-human
  if (s.needsHuman) { q('needsHuman').hidden = false; q('needsHumanText').textContent = s.needsHuman; }
  else q('needsHuman').hidden = true;
}

async function connect(id) {
  const keys = KEYS[id] || [];
  for (const k of keys) {
    const v = prompt(`Paste value for ${k} (stays on your machine, written to .env):`);
    if (v == null) return;                 // cancelled
    if (v.trim() === '') continue;
    const res = await api('/api/env', { method: 'POST', body: JSON.stringify({ key: k, value: v.trim() }) });
    if (!res.ok) { alert('Could not save ' + k); return; }
  }
  await api('/api/intent', { method: 'POST', body: JSON.stringify({ type: 'connect-integration', id }) });
  flash(`Connecting ${id}… the AI will wire it.`);
}

function flash(msg) { const a = q('activity'); a.textContent = msg; a.classList.add('flash'); setTimeout(() => a.classList.remove('flash'), 1200); }

q('pauseBtn').onclick = async () => {
  const paused = q('pauseBtn').textContent === 'Resume';
  await api('/api/intent', { method: 'POST', body: JSON.stringify({ type: paused ? 'resume' : 'pause' }) });
  flash(paused ? 'Resuming…' : 'Pausing after the current step…');
};
q('answerBtn').onclick = async () => {
  const text = q('answer').value.trim(); if (!text) return;
  await api('/api/intent', { method: 'POST', body: JSON.stringify({ type: 'answer', text }) });
  q('answer').value = ''; flash('Sent.');
};

// live connection
function connectStream() {
  const es = new EventSource('/api/events?token=' + encodeURIComponent(TOKEN));
  es.onmessage = (e) => { q('dot').className = 'dot on'; try { render(JSON.parse(e.data)); } catch {} };
  es.onerror = () => { q('dot').className = 'dot'; es.close(); setTimeout(connectStream, 2000); };
}
connectStream();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
