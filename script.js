// ============================================================
// frameless.studio — landing v2 script
// Константы вытащены из исходников браузера (b:\code\SourceCode)
// ============================================================

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

// ---------- helpers ----------
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

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

// ---------- определение ОС ----------
function detectOS() {
  const ua = navigator.userAgent;
  if (/Mac/i.test(ua)) return 'macos';
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return 'linux';
  return 'windows';
}
const userOS = detectOS();
const OS_NAMES = {
  windows: 'windows',
  macos: 'macos',
  linux: 'linux'
};
$$('[data-os-note]').forEach(el => {
  el.textContent = 'у вас: ' + OS_NAMES[userOS];
});

// ---------- загрузка релиза ----------
let latestRelease = null;

async function loadRelease() {
  const status = $('#update-status');
  status.className = 'status mono checking';
  status.innerHTML = '<span class="st-dot"></span>checking latest release…';
  try {
    const res = await fetch(RELEASES_API, {
      headers: {
        'Accept': 'application/vnd.github+json'
      }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const releases = await res.json();
    // как в updater.js: релиз с .exe-ассетом, без draft
    const rel = releases.find(r => !r.draft && (r.assets || []).some(a => /\.exe$/i.test(a.name || '')));
    if (!rel) throw new Error('no release with .exe asset');
    const asset = rel.assets.find(a => /\.exe$/i.test(a.name));
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
    $('#terminal-json').textContent =
      `GET ${RELEASES_API}\n→ ${err.message}\n\nоткрой вручную:\n${GITHUB_WEB}/releases/latest`;
    $$('.js-download').forEach(a => a.href = GITHUB_WEB + '/releases/latest');
  }
}

function onReleaseLoaded() {
  const r = latestRelease;
  const size = fmtSize(r.size);

  $$('.js-download').forEach(a => a.href = r.url);
  $$('.js-dl-version').forEach(el => el.textContent = r.version);
  $$('.js-dl-size').forEach(el => el.textContent = size || '…MB');

  $('#t-version').textContent = r.version;
  $('#t-size').textContent = size || '—';
  $('#t-date').textContent = fmtDate(r.publishedAt);
  $('#t-asset').textContent = r.url.split('/').pop();
  $('#release-notes-link').href = GITHUB_WEB + '/releases/tag/' + encodeURIComponent(r.tag);

  // терминал: только статические поля
  const snippet = {
    tag_name: r.tag,
    name: 'frameless ' + r.version,
    prerelease: false,
    published_at: r.publishedAt,
    assets: [{
      name: r.url.split('/').pop(),
      size: r.size,
      content_type: 'application/x-msdownload'
    }]
  };
  $('#terminal-json').textContent = 'GET ' + RELEASES_API + '\n200 OK\n\n' + JSON.stringify(snippet, null, 2);

  // сравнение версий (compareVersions из updater.js)
  const cur = FALLBACK_VERSION.split('.').map(Number);
  const rel = r.version.split('.').map(Number);
  let cmp = 0;
  for (let i = 0; i < Math.max(cur.length, rel.length); i++) {
    const d = (rel[i] || 0) - (cur[i] || 0);
    if (d !== 0) {
      cmp = d;
      break;
    }
  }
  const status = $('#update-status');
  if (cmp === 0) {
    status.className = 'status mono ok';
    status.innerHTML = `<span class="st-dot"></span>you are on the latest build · ${r.version}`;
  } else if (cmp > 0) {
    status.className = 'status mono warn';
    status.innerHTML = `<span class="st-dot"></span>update available · ${r.version} → <a class="js-download" href="${r.url}" style="color:inherit">скачать</a>`;
  } else {
    status.className = 'status mono ok';
    status.innerHTML = `<span class="st-dot"></span>latest release: ${r.version}`;
  }

  // What's new — весь changelog, лимит только по длине текста
  const lines = r.body.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const full = mdToText(lines.join('\n'));
  $('#whats-new-body').textContent = full.length > 2000 ? full.slice(0, 2000) + '…' : full;
  $('#whats-new-ver').textContent = r.tag;
  $('#whats-new').hidden = false;
}

// ---------- кнопки ----------
$('#copy-release').addEventListener('click', async () => {
  const url = latestRelease ? latestRelease.url : GITHUB_WEB + '/releases/latest';
  const btn = $('#copy-release');
  try {
    await navigator.clipboard.writeText(url);
    btn.textContent = '[ ✓ скопировано ]';
  } catch (e) {
    btn.textContent = '[ ошибка доступа ]';
  }
  setTimeout(() => {
    btn.textContent = '[ копировать ссылку ]';
  }, 2000);
});

$('#check-updates').addEventListener('click', () => loadRelease());

// ---------- плавный скролл ----------
$$('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length > 1) {
      const target = $(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: 'smooth'
        });
      }
    }
  });
});

// ---------- подвал ----------
$('#footer-meta').textContent =
  `frameless.studio · build channel: ${CHANNEL} · source: GitHub Releases`;

// ---------- тема: авто (system) / dark / light с запоминанием ----------
const THEME_KEY = 'frameless-theme'; // 'auto' | 'dark' | 'light'

function applyTheme(mode) {
  const resolved = mode === 'auto'
    ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : mode;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.classList.remove('mode-auto', 'mode-dark', 'mode-light');
  document.documentElement.classList.add('mode-' + mode); // управляет глифом кнопки
  const tc = document.querySelector('meta[name="theme-color"]');
  if (tc) tc.content = resolved === 'light' ? '#f4f4ef' : '#050505';
  $('#theme-lbl').textContent = mode; // auto | dark | light
  $('#theme-toggle').title = 'Тема: ' + ({ auto: 'авто (как в системе)', dark: 'тёмная', light: 'светлая' }[mode]);
}

function cycleTheme() {
  const order = ['auto', 'dark', 'light'];
  const cur = localStorage.getItem(THEME_KEY) || 'auto';
  const next = order[(order.indexOf(cur) + 1) % order.length];
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

// применяем режим (inline-скрипт в <head> уже выставил тему до отрисовки —
// здесь только синхронизируем кнопку/глиф)
applyTheme(localStorage.getItem(THEME_KEY) || 'auto');
$('#theme-toggle').addEventListener('click', cycleTheme);
// реакция на смену системной темы в режиме «авто»
matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
  if ((localStorage.getItem(THEME_KEY) || 'auto') === 'auto') applyTheme('auto');
});

// ---------- reveal-анимации при скролле ----------
const revealIO = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      en.target.classList.add('in');
      revealIO.unobserve(en.target);
    }
  });
}, { threshold: 0.12 });

// помечаем целевые блоки с каскадной задержкой
function initReveal() {
  const groups = [
    ['.feat', 70],
    ['.shot', 110],
    ['.step', 90],
    ['.kv', 0], ['.term', 0], ['.qa', 60],
    ['.sec-head', 0], ['.install-side', 0]
  ];
  groups.forEach(([sel, step]) => {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = (i % 8) * step + 'ms';
      revealIO.observe(el);
    });
  });
}
initReveal();

// ---------- подсветка строк фич за курсором ----------
document.querySelectorAll('.feat').forEach(row => {
  row.addEventListener('mousemove', (e) => {
    const r = row.getBoundingClientRect();
    row.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
});

// ---------- печатающийся текст в мокапе ----------
const typeEl = document.querySelector('.mock-type');
if (typeEl) {
  const phrase = typeEl.textContent.replace('▌', '').trim();
  let i = phrase.length;
  typeEl.innerHTML = '<span class="tcur">▌</span>';
  setInterval(() => {
    i = (i + 1) % (phrase.length + 14); // пауза в конце цикла
    const shown = phrase.slice(0, Math.min(i, phrase.length));
    typeEl.innerHTML = shown + '<span class="tcur">▌</span>';
  }, 110);
}

// ---------- параллакс фонового свечения ----------
const glow = document.querySelector('.bg-glow');
if (glow && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
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

// ---------- навигация: прогресс скролла, тень, активный раздел ----------
const nav = $('.nav');
const navProgress = $('#nav-progress');
function onNavScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  navProgress.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(4) : 0);
  nav.classList.toggle('scrolled', scrollY > 8);
  // в hero ни один раздел не активен
  const first = document.querySelector('section.section[id]');
  if (first && scrollY + innerHeight * 0.5 < first.offsetTop) {
    $$('.nav-links a.active').forEach(a => a.classList.remove('active'));
  }
}
addEventListener('scroll', () => requestAnimationFrame(onNavScroll), { passive: true });
addEventListener('resize', onNavScroll);
onNavScroll();

const navLinks = [...$$('.nav-links a[href^="#"]')];
const sectionIO = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
$$('section.section[id]').forEach(s => sectionIO.observe(s));

// ---------- лайтбокс скриншотов ----------
const lb = $('#lightbox');
const lbImg = lb.querySelector('.lb-stage img');
const lbCap = lb.querySelector('.lb-cap');
const shots = [...document.querySelectorAll('.shot')];
let lbIndex = 0;

function lbShow(i) {
  const shot = shots[i];
  const img = shot.querySelector('.shot-img img');
  if (!img) return; // пустой плейсхолдер — не открываем
  lbIndex = i;
  lbImg.src = img.src;
  lbImg.alt = img.alt;
  lbCap.textContent = shot.querySelector('.shot-cap').textContent.replace(/^>\s*/, '> ');
  lb.hidden = false;
  requestAnimationFrame(() => lb.classList.add('show'));
  document.body.style.overflow = 'hidden';
}

function lbHide() {
  lb.classList.remove('show');
  document.body.style.overflow = '';
  setTimeout(() => { lb.hidden = true; }, 250);
}

shots.forEach((shot, i) => {
  shot.querySelector('.shot-img').addEventListener('click', () => lbShow(i));
});
lb.querySelector('.lb-close').addEventListener('click', lbHide);
lb.addEventListener('click', e => { if (e.target === lb) lbHide(); });
lb.querySelector('.lb-prev').addEventListener('click', e => { e.stopPropagation(); lbShow((lbIndex - 1 + shots.length) % shots.length); });
lb.querySelector('.lb-next').addEventListener('click', e => { e.stopPropagation(); lbShow((lbIndex + 1) % shots.length); });
addEventListener('keydown', e => {
  if (lb.hidden) return;
  if (e.key === 'Escape') lbHide();
  if (e.key === 'ArrowLeft') lbShow((lbIndex - 1 + shots.length) % shots.length);
  if (e.key === 'ArrowRight') lbShow((lbIndex + 1) % shots.length);
});

loadRelease();