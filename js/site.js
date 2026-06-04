/* ============================================================
   MS STUDIO — shared behaviour
   ============================================================ */
(function () {
  const root = document.documentElement;
  const LS_KEY = 'ms-studio-tweaks';

  const DEFAULTS = { theme: 'cinema', accent: 'amber', grain: 0.5 };
  let state = { ...DEFAULTS };
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    state = { ...state, ...saved };
  } catch (e) {}

  function applyTweaks() {
    root.setAttribute('data-theme', state.theme === 'cinema' ? '' : state.theme);
    root.setAttribute('data-accent', state.accent === 'amber' ? '' : state.accent);
    root.style.setProperty('--grain-opacity', state.grain);
    // reflect into panel controls if present
    document.querySelectorAll('.tw-row').forEach(row => {
      const key = row.dataset.key;
      row.querySelectorAll('button').forEach(b =>
        b.classList.toggle('active', b.dataset.val === String(state[key])));
    });
    const grain = document.getElementById('tw-grain');
    const grainV = document.getElementById('tw-grain-v');
    if (grain) { grain.value = state.grain; }
    if (grainV) { grainV.textContent = Math.round(state.grain * 100) + '%'; }
  }
  function persist() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {} }

  /* ---- mobile menu ---- */
  const toggle = document.querySelector('.menu-toggle');
  const links = document.querySelector('.navlinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => links.classList.remove('open')));
  }

  /* ---- clock ---- */
  const clock = document.getElementById('clock');
  function tick() {
    if (!clock) return;
    const now = new Date();
    const p = n => String(n).padStart(2, '0');
    clock.textContent = `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
  }
  if (clock) { tick(); setInterval(tick, 1000); }

  /* ---- scroll → SMPTE timecode + scrubber ---- */
  const heroTc = document.getElementById('hero-tc');
  const scrubTc = document.getElementById('scrub-tc');
  const fps = 24;
  function frameToTc(f) {
    const secs = Math.floor(f / fps);
    const ff = f % fps, ss = secs % 60, mm = Math.floor(secs / 60) % 60, hh = Math.floor(secs / 3600);
    const p = n => String(n).padStart(2, '0');
    return `${p(hh)}:${p(mm)}:${p(ss)}:${p(ff)}`;
  }
  function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = Math.min(1, Math.max(0, window.scrollY / Math.max(1, max)));
    const total = fps * 134;
    const tc = frameToTc(Math.floor(pct * total));
    if (heroTc) heroTc.textContent = tc;
    if (scrubTc) scrubTc.textContent = tc;
    root.style.setProperty('--played', (pct * 100) + '%');
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* ---- works filter (work page only) ---- */
  const filterBar = document.querySelector('.filters');
  if (filterBar) {
    const items = [...document.querySelectorAll('.work[data-cat]')];
    filterBar.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        filterBar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.filter;
        items.forEach(it => {
          const show = cat === 'all' || it.dataset.cat.split(' ').includes(cat);
          it.style.display = show ? '' : 'none';
        });
      });
    });
  }

  /* ---- contact form chips + fake submit ---- */
  document.querySelectorAll('.chips').forEach(group => {
    const multi = group.dataset.multi === 'true';
    group.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!multi) group.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.toggle('active');
      });
    });
  });
  const form = document.querySelector('.form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const note = form.querySelector('.form-note');
      if (note) note.textContent = '✓ Message queued — Malak will reply within 1 business day.';
      const btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.textContent = 'Sent'; btn.classList.add('amber'); }
    });
  }

  /* ---- tweaks panel ---- */
  const tw = document.getElementById('tweaks');
  if (tw) {
    const close = document.getElementById('tw-close');
    if (close) close.addEventListener('click', () => {
      tw.classList.remove('open');
      window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
    });
    tw.querySelectorAll('.tw-row').forEach(row => {
      const key = row.dataset.key;
      row.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          state[key] = btn.dataset.val;
          applyTweaks(); persist();
          window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: btn.dataset.val } }, '*');
        });
      });
    });
    const grain = document.getElementById('tw-grain');
    if (grain) grain.addEventListener('input', () => {
      state.grain = parseFloat(grain.value);
      applyTweaks(); persist();
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { grain: state.grain } }, '*');
    });
    window.addEventListener('message', (e) => {
      if (!e.data) return;
      if (e.data.type === '__activate_edit_mode') tw.classList.add('open');
      if (e.data.type === '__deactivate_edit_mode') tw.classList.remove('open');
    });
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
  }

  applyTweaks();
})();
