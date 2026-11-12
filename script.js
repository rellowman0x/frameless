// ============================================================
// frameless — landing script
// Та же механика, что и у портфолио: тема, три акцента,
// кастомный курсор, бегущие строки, глитч, лайтбокс.
// ============================================================

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;

// --- GitHub owner/repo ---
// Источник: scripts/updater.js → const GITHUB_REPO = 'rellowman0x/frameless--updater'
const GITHUB_REPO = 'rellowman0x/frameless--updater';
const GITHUB_WEB = 'https://github.com/' + GITHUB_REPO;

// --- Формат тегов релиза ---
// Источник: RELEASING.md → «тег, совпадающий с версией: v1.0.1» → формат v1.2.3.
const TAG_PREFIX = 'v';

// --- Шаблон имени .exe-ассета ---
// Источник: package.json → build.nsis.artifactName = "frameless-Setup-${version}.${ext}"
const ARTIFACT_TEMPLATE = 'frameless-Setup-${version}.exe';

// --- Версия приложения (fallback) ---
// Источник: package.json → "version": "1.2.0", "appBuild": "45-1a955f6"
const FALLBACK_VERSION = '1.2.0';
const FALLBACK_BUILD = '45-1a955f6';

// --- Endpoint обновлений ---
// Источник: scripts/updater.js — api.github.com/repos/<repo>/releases,
// резерв — releases.atom. Кастомного сервера нет.
const RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=1`;

// --- Канал и платформа ---
const CHANNEL = 'stable';
const PLATFORM = 'Windows x64';

// ============================================================
// тема и акцент
// ============================================================
const THEME_KEY = 'frameless-theme';   // auto | dark | light
const ACCENT_KEY = 'frameless-accent'; // orange | violet | lime
const ACCENTS = ['orange', 'violet', 'lime'];
const ACCENT_NAMES = { orange: 'оранжевый', violet: 'фиолетовый', lime: 'лаймовый' };

function resolvedTheme(mode) {
  return mode === 'auto'
    ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : mode;
}

function applyTheme(mode) {
  const resolved = resolvedTheme(mode);
  root.dataset.theme = resolved;
  root.classList.remove('mode-auto', 'mode-dark', 'mode-light');
  root.classList.add('mode-' + mode);

  const tc = $('meta[name="theme-color"]');
  if (tc) tc.content = resolved === 'light' ? '#f2f2ec' : '#060606';

  const lbl = $('#theme-lbl');
  if (lbl) lbl.textContent = mode;

  const btn = $('#theme-toggle');
  if (btn) btn.title = 'Тема: ' + ({ auto: 'авто', dark: 'тёмная', light: 'светлая' }[mode]);

  // без ручного выбора акцент подстраивается под тему
  let savedAccent = null;
  try { savedAccent = localStorage.getItem(ACCENT_KEY); } catch (e) { }
  if (!savedAccent) root.dataset.accent = resolved === 'light' ? 'lime' : 'orange';
  setAccent(root.dataset.accent || 'orange', false);
}

function cycleTheme() {
  const order = ['auto', 'dark', 'light'];
  let cur = 'auto';
  try { cur = localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) { }
  const next = order[(order.indexOf(cur) + 1) % order.length];
  try { localStorage.setItem(THEME_KEY, next); } catch (e) { }
  applyTheme(next);
}

function setAccent(acc, persist = true) {
  root.dataset.accent = acc;
  if (persist) {
    try { localStorage.setItem(ACCENT_KEY, acc); } catch (e) { }
  }
  const btn = $('#accent-toggle');
  if (btn) btn.title = 'Акцент: ' + ACCENT_NAMES[acc];
}

function cycleAccent() {
  const cur = root.dataset.accent || 'orange';
  setAccent(ACCENTS[(ACCENTS.indexOf(cur) + 1) % ACCENTS.length]);
}

try { applyTheme(localStorage.getItem(THEME_KEY) || 'auto'); } catch (e) { applyTheme('auto'); }
$('#theme-toggle')?.addEventListener('click', cycleTheme);
$('#accent-toggle')?.addEventListener('click', cycleAccent);
setAccent(root.dataset.accent || 'orange', false);
matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
  let mode = 'auto';
  try { mode = localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) { }
  if (mode === 'auto') applyTheme('auto');
});

// ============================================================
// мобильное меню
// ============================================================
const menuBtn = $('#menu-toggle');
const mobileMenu = $('#mobile-menu');
if (menuBtn && mobileMenu) {
  const closeMenu = () => {
    menuBtn.setAttribute('aria-expanded', 'false');
    mobileMenu.hidden = true;
  };
  menuBtn.addEventListener('click', () => {
    const open = menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.setAttribute('aria-expanded', String(!open));
    mobileMenu.hidden = open;
  });
  $$('a', mobileMenu).forEach((a) => a.addEventListener('click', closeMenu));
  document.addEventListener('click', (e) => {
    if (!mobileMenu.hidden && !mobileMenu.contains(e.target) && !menuBtn.contains(e.target)) closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !mobileMenu.hidden) closeMenu();
  });
  addEventListener('resize', () => { if (innerWidth > 1080) closeMenu(); });
}

// ============================================================
// helpers
// ============================================================
function fmtSize(bytes) {
  if (bytes == null) return null;
  const mb = bytes / (1024 * 1024);
  return (mb >= 100 ? mb.toFixed(0) : mb.toFixed(1)) + 'MB';
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return iso || '—';
  }
}

// markdown → читаемый текст
function mdToText(text) {
  return text
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*]\s+/gm, '› ');
}

// ============================================================
// определение ОС
// ============================================================
function detectOS() {
  const ua = navigator.userAgent;
  if (/Mac/i.test(ua)) return 'macos';
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return 'linux';
  return 'windows';
}
const userOS = detectOS();
$$('[data-os-note]').forEach((el) => {
  el.textContent = 'у вас: ' + userOS;
});

// ============================================================
// загрузка релиза
// ============================================================
let latestRelease = null;

async function loadRelease() {
  const status = $('#update-status');
  if (!status) return;
  status.className = 'status mono checking';
  status.innerHTML = '<span class="st-dot"></span>checking latest release…';
  try {
    const res = await fetch(RELEASES_API, {
      headers: { 'Accept': 'application/vnd.github+json' }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const releases = await res.json();
    // как в updater.js: релиз с .exe-ассетом, без draft
    const rel = releases.find((r) => !r.draft && (r.assets || []).some((a) => /\.exe$/i.test(a.name || '')));
    if (!rel) throw new Error('no release with .exe asset');
    const asset = rel.assets.find((a) => /\.exe$/i.test(a.name));
    latestRelease = {
      tag: rel.tag_name,
      version: rel.tag_name.replace(/^v/i, ''),
      url: asset.browser_download_url,
      size: asset.size,
      publishedAt: rel.published_at,
      body: rel.body || ''
    };
    onReleaseLoaded();
  } catch (err) {
    // fallback — как в updater.js: API недоступен → GitHub Releases
    status.className = 'status mono error';
    status.innerHTML = '<span class="st-dot"></span>fallback: open GitHub releases';
    const term = $('#terminal-json');
    if (term) {
      term.textContent =
        `GET ${RELEASES_API}\n→ ${err.message}\n\nоткрой вручную:\n${GITHUB_WEB}/releases/latest`;
    }
    $$('.js-download').forEach((a) => { a.href = GITHUB_WEB + '/releases/latest'; });
  }
}

function onReleaseLoaded() {
  const r = latestRelease;
  const size = fmtSize(r.size);
  const assetName = r.url.split('/').pop();

  $$('.js-download').forEach((a) => { a.href = r.url; });
  $$('.js-dl-version').forEach((el) => { el.textContent = r.version; });
  $$('.js-dl-size').forEach((el) => { el.textContent = size || '…MB'; });

  const setText = (sel, val) => { const el = $(sel); if (el) el.textContent = val; };
  setText('#t-version', r.version);
  setText('#t-size', size || '—');
  setText('#t-date', fmtDate(r.publishedAt));
  setText('#t-asset', assetName);

  const notes = $('#release-notes-link');
  if (notes) notes.href = GITHUB_WEB + '/releases/tag/' + encodeURIComponent(r.tag);

  // терминал: только статические поля
  const snippet = {
    tag_name: r.tag,
    name: 'frameless ' + r.version,
    prerelease: false,
    published_at: r.publishedAt,
    assets: [{
      name: assetName,
      size: r.size,
      content_type: 'application/x-msdownload'
    }]
  };
  const term = $('#terminal-json');
  if (term) term.textContent = 'GET ' + RELEASES_API + '\n200 OK\n\n' + JSON.stringify(snippet, null, 2);

  // сравнение версий (compareVersions из updater.js)
  const cur = FALLBACK_VERSION.split('.').map(Number);
  const rel = r.version.split('.').map(Number);
  let cmp = 0;
  for (let i = 0; i < Math.max(cur.length, rel.length); i++) {
    const d = (rel[i] || 0) - (cur[i] || 0);
    if (d !== 0) { cmp = d; break; }
  }

  const status = $('#update-status');
  if (status) {
    if (cmp === 0) {
      status.className = 'status mono ok';
      status.innerHTML = `<span class="st-dot"></span>you are on the latest build · ${r.version}`;
    } else if (cmp > 0) {
      status.className = 'status mono warn';
      status.innerHTML = `<span class="st-dot"></span>update available · ${r.version} → <a class="js-download" href="${r.url}">скачать</a>`;
    } else {
      status.className = 'status mono ok';
      status.innerHTML = `<span class="st-dot"></span>latest release: ${r.version}`;
    }
  }

  // What's new — весь changelog, лимит только по длине текста
  const lines = r.body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const full = mdToText(lines.join('\n'));
  const body = $('#whats-new-body');
  if (body) body.textContent = full.length > 2000 ? full.slice(0, 2000) + '…' : full;
  setText('#whats-new-ver', r.tag);
  const wn = $('#whats-new');
  if (wn) wn.hidden = false;
}

// ============================================================
// кнопки tech
// ============================================================
$('#copy-release')?.addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const url = latestRelease ? latestRelease.url : GITHUB_WEB + '/releases/latest';
  const label = btn.textContent;
  try {
    await navigator.clipboard.writeText(url);
    btn.textContent = '✓ скопировано';
  } catch (err) {
    btn.textContent = 'ошибка доступа';
  }
  setTimeout(() => { btn.textContent = label; }, 2000);
});

$('#check-updates')?.addEventListener('click', () => loadRelease());

// ============================================================
// плавный скролл
// ============================================================
$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = $(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });
});

// ============================================================
// подвал
// ============================================================
const footerMeta = $('#footer-meta');
if (footerMeta) {
  footerMeta.textContent =
    `build channel: ${CHANNEL} · source: GitHub Releases · © 2026 rellowman`;
}

// ============================================================
// прогресс скролла + активный раздел
// ============================================================
const navProgress = $('#nav-progress');
const navLinks = $$('.nav-links a[href^="#"]');
const sections = navLinks
  .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
  .filter(Boolean);

function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  if (navProgress) navProgress.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(4) : 0);

  const y = scrollY + innerHeight * 0.35;
  let current = '';
  sections.forEach((s) => { if (s.offsetTop <= y) current = s.id; });
  navLinks.forEach((a) => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + current);
  });
}

addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });
addEventListener('resize', onScroll);
onScroll();

// ============================================================
// reveal при скролле
// ============================================================
const revealIO = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (en.isIntersecting) {
      en.target.classList.add('in');
      revealIO.unobserve(en.target);
    }
  });
}, { threshold: 0.12 });

function initReveal() {
  const groups = [
    ['.sec-head', 0],
    ['.feat', 70],
    ['.shot', 110],
    ['.step', 90],
    ['.kv', 0],
    ['.term', 0],
    ['.install-side', 0],
    ['.qa', 60]
  ];
  groups.forEach(([sel, step]) => {
    $$(sel).forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = (i % 8) * step + 'ms';
      revealIO.observe(el);
    });
  });
}
initReveal();

// ============================================================
// кастомный курсор
// ============================================================
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const cursorDot = $('.cursor-dot');
const cursorRing = $('.cursor-ring');

if (cursorDot && cursorRing && finePointer) {
  let x = -40, y = -40, rx = -40, ry = -40;
  let tx = -40, ty = -40;
  let shown = false;
  const dotLerp = reduceMotion ? 1 : 0.4;
  const ringLerp = reduceMotion ? 1 : 0.16;

  addEventListener('mousemove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
    if (!shown) {
      shown = true;
      cursorDot.classList.add('on');
      cursorRing.classList.add('on');
    }
    const hot = !!(e.target.closest && e.target.closest('a, button, summary, input, textarea, .feat, .shot, .tile, .qa'));
    cursorDot.classList.toggle('hot', hot);
    cursorRing.classList.toggle('hot', hot);
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    shown = false;
    cursorDot.classList.remove('on');
    cursorRing.classList.remove('on');
  });

  (function loop() {
    x += (tx - x) * dotLerp;
    y += (ty - y) * dotLerp;
    rx += (tx - rx) * ringLerp;
    ry += (ty - ry) * ringLerp;
    cursorDot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    cursorRing.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  })();
}

// ============================================================
// spotlight по фону
// ============================================================
const spot = $('#bg-spot');
if (spot && finePointer && !reduceMotion) {
  let sx = innerWidth / 2, sy = innerHeight / 2;
  let cx = sx, cy = sy;
  addEventListener('mousemove', (e) => {
    sx = e.clientX;
    sy = e.clientY;
  }, { passive: true });
  (function loop() {
    cx += (sx - cx) * 0.08;
    cy += (sy - cy) * 0.08;
    spot.style.setProperty('--mx', cx.toFixed(1) + 'px');
    spot.style.setProperty('--my', cy.toFixed(1) + 'px');
    requestAnimationFrame(loop);
  })();
}

// ============================================================
// бегущая строка
// ============================================================
function setupTickers() {
  $$('.ticker').forEach((ticker) => {
    const track = $('.ticker-track', ticker);
    const first = track && $('.ticker-group', track);
    if (!track || !first) return;

    $$('.ticker-group', track).slice(1).forEach((g) => g.remove());

    const width = first.getBoundingClientRect().width;
    if (!width) return;

    // нужно столько копий, чтобы после сдвига на одну группу строка
    // всё ещё закрывала весь вьюпорт (иначе на стыке цикла видна дыра)
    const needed = Math.min(24, Math.max(2, Math.ceil(ticker.clientWidth / width) + 1));
    for (let i = 1; i < needed; i++) {
      const clone = first.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    }

    const speed = Number(ticker.dataset.speed) || 26;
    track.style.setProperty('--tick-shift', width + 'px');
    track.style.animationDuration = (width / speed).toFixed(2) + 's';
  });
}

setupTickers();
let tickerRaf = 0;
const queueTickers = () => {
  if (tickerRaf) return;
  tickerRaf = requestAnimationFrame(() => {
    tickerRaf = 0;
    setupTickers();
  });
};
addEventListener('resize', queueTickers);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueTickers);

// ============================================================
// глитч заголовка
// ============================================================
const heroWord = $('#hero-word');
if (heroWord && !reduceMotion) {
  const fire = () => {
    heroWord.classList.add('glitch-on');
    setTimeout(() => heroWord.classList.remove('glitch-on'), 620);
  };
  setTimeout(fire, 1100);
  setInterval(() => {
    if (Math.random() > 0.35) return;
    fire();
  }, 3000);
}

// ============================================================
// подсветка карточек за курсором
// ============================================================
$$('.feat').forEach((card) => {
  card.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
});

// ============================================================
// печатающийся текст в мокапе
// ============================================================
const typeEl = $('.mock-type');
if (typeEl) {
  const phrase = typeEl.textContent.replace('▌', '').replace(/\s+/g, ' ').trim();
  let i = phrase.length;
  typeEl.innerHTML = '<span class="tcur">▌</span>';
  if (!reduceMotion) {
    setInterval(() => {
      i = (i + 1) % (phrase.length + 14); // пауза в конце цикла
      const shown = phrase.slice(0, Math.min(i, phrase.length));
      typeEl.innerHTML = shown + '<span class="tcur">▌</span>';
    }, 110);
  }
}

// ============================================================
// параллакс фонового свечения
// ============================================================
const glow = $('.bg-glow');
if (glow && !reduceMotion) {
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      glow.style.transform = `translateY(${scrollY * 0.12}px)`;
      ticking = false;
    });
  }, { passive: true });
}

// ============================================================
// лайтбокс скриншотов
// ============================================================
const lb = $('#lightbox');
const shots = $$('.shot');

if (lb && shots.length) {
  const lbImg = $('.lb-stage img', lb);
  const lbCap = $('.lb-cap', lb);
  let lbIndex = 0;

  const lbShow = (i) => {
    const shot = shots[i];
    const img = shot && $('.shot-img img', shot);
    if (!img) return; // пустой плейсхолдер — не открываем
    lbIndex = i;
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    const cap = $('.shot-cap', shot);
    lbCap.textContent = cap ? cap.textContent.replace(/^>\s*/, '> ') : '';
    lb.hidden = false;
    requestAnimationFrame(() => lb.classList.add('show'));
    document.body.style.overflow = 'hidden';
  };

  const lbHide = () => {
    lb.classList.remove('show');
    document.body.style.overflow = '';
    setTimeout(() => { lb.hidden = true; }, 250);
  };

  shots.forEach((shot, i) => {
    const area = $('.shot-img', shot);
    if (area) area.addEventListener('click', () => lbShow(i));
  });
  $('.lb-close', lb)?.addEventListener('click', lbHide);
  lb.addEventListener('click', (e) => { if (e.target === lb) lbHide(); });
  $('.lb-prev', lb)?.addEventListener('click', (e) => {
    e.stopPropagation();
    lbShow((lbIndex - 1 + shots.length) % shots.length);
  });
  $('.lb-next', lb)?.addEventListener('click', (e) => {
    e.stopPropagation();
    lbShow((lbIndex + 1) % shots.length);
  });
  addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') lbHide();
    if (e.key === 'ArrowLeft') lbShow((lbIndex - 1 + shots.length) % shots.length);
    if (e.key === 'ArrowRight') lbShow((lbIndex + 1) % shots.length);
  });
}

// ============================================================
// старт
// ============================================================
loadRelease();
