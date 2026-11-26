import {
  STEMS, BRANCHES, ELEMENT_LABEL, ANIMALS, CITIES, JIE_MAP,
  LUNAR_DAYS, GENDER_LABEL, CLIMATE,
} from './data.js?v=20261149';
import {
  computeChart, todayOverview, beijingNowParts, elementOfStem, elementOfBranch,
  analyzeInteractions, periodTable, hourPeriod,
} from './bazi.js?v=20261149';
import {
  lunarMonthList, lunarToSolar, solarToLunar, formatLunar, lunarYearLabel, formatDate,
  getSolarTermTs, getSolarTermName,
} from './astro.js?v=20261149';
import {
  isNative, haptic, shareNative, notificationPermission,
  requestNotificationPermission, scheduleNotifications, cancelNotifications, syncStatusBar,
} from './native.js?v=20261149';
import { ARTICLES } from './learn.js?v=20261149';
import { GLOSSARY } from './glossary.js?v=20261149';
import { esc, icon } from './ui.js?v=20261149';
import { BRAND, PAGES, articlePath, notFoundMarkup } from './pages.js?v=20261149';

const STORAGE = {
  records: 'zhiming.records.v3',
  legacyRecords: 'zhiming.records.v2',
  backup: 'zhiming.backup.v1',
  lastInput: 'zhiming.lastInput.v2',
  theme: 'zhiming.theme.v1',
  recordsSort: 'zhiming.recordsSort.v1',
  reminders: 'zhiming.reminders.v1',
};

const MAX_RECORDS = 500;

const DEFAULT_INPUT = {
  name: '',
  gender: 'male',
  calendar: 'solar',
  solar: { y: 1995, m: 6, d: 15 },
  lunar: null,
  time: { h: 10, min: 30 },
  trueSolar: false,
  city: '北京',
  lateZi: true,
  shareHideName: false,
};

const SAMPLE_INPUT = {
  name: '張三',
  gender: 'male',
  calendar: 'solar',
  solar: { y: 1990, m: 1, d: 1 },
  lunar: null,
  time: { h: 12, min: 0 },
  trueSolar: false,
  city: '北京',
  lateZi: true,
};

const state = {
  chart: null,
  formInput: null,
  selectedLuck: 0,
  period: null,
  compact: false,
  records: [],
  recordQuery: '',
  recordTag: '',
  recordFolder: '',
  recordDupOnly: false,
  recordSort: 'newest',
  recordSelect: false,
  recordSelection: [],
  compare: { a: null, b: null },
};

const app = document.getElementById('app');

function termTag(term, className = '') {
  const known = Boolean(GLOSSARY[term]);
  const cls = `${className}${known ? ' term-tag' : ''}`.trim();
  return known
    ? `<button class="${cls}" type="button" data-term="${esc(term)}" aria-haspopup="dialog">${esc(term)}</button>`
    : `<span class="${cls}">${esc(term)}</span>`;
}

function elClass(element) {
  return `el-${element}`;
}

function two(n) {
  return String(n).padStart(2, '0');
}

function solarDateText(chart) {
  const { y, m, d, h, min } = chart.solarDate;
  const clock = chart.timeUnknown ? '時辰未知' : `${two(h)}:${two(min)}`;
  return `${y}年${m}月${d}日 ${clock}`;
}

function dateInputValue(solar) {
  return `${solar.y}-${two(solar.m)}-${two(solar.d)}`;
}

function timeInputValue(time) {
  return time ? `${two(time.h)}:${two(time.min)}` : '';
}

function shortDate(text) {
  return String(text || '').replace(/年|月/g, '.').replace(/日/g, '');
}

function ageText(decYears) {
  const y = Math.floor(decYears + 1e-9);
  const m = Math.round((decYears - y) * 12);
  if (m === 12) return `${y + 1}歲`;
  return m > 0 ? `${y}歲${m}個月` : `${y}歲`;
}

function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => el.classList.remove('is-visible'), 2600);
}

// ---- Term glossary ----

let termAnchor = null;

function placeTermPop(anchor, pop) {
  if (window.innerWidth <= 640) return;
  const rect = anchor.getBoundingClientRect();
  const width = pop.offsetWidth;
  const height = pop.offsetHeight;
  const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 12);
  let top = rect.bottom + 8;
  if (top + height > window.innerHeight - 12) top = Math.max(12, rect.top - height - 8);
  pop.style.left = `${Math.round(left)}px`;
  pop.style.top = `${Math.round(top)}px`;
}

function openTerm(term, anchor) {
  const info = GLOSSARY[term];
  const pop = document.getElementById('term-pop');
  if (!info || !pop) return;
  const article = info.article ? ARTICLES.find((a) => a.id === info.article) : null;
  pop.innerHTML = `
    <button class="term-pop-close" type="button" aria-label="關閉">${icon('x', 14)}</button>
    <h3 id="term-pop-title">${esc(term)}</h3>
    <p>${esc(info.text)}</p>
    ${article ? `<a class="term-more" href="${linkFor('/learn/' + article.id)}">學堂：${esc(article.title)} ${icon('arrowRight', 12)}</a>` : ''}
  `;
  pop.hidden = false;
  termAnchor = anchor;
  placeTermPop(anchor, pop);
  pop.focus({ preventScroll: true });
}

function closeTerm(restoreFocus = false) {
  const pop = document.getElementById('term-pop');
  if (!pop || pop.hidden) return;
  pop.hidden = true;
  pop.innerHTML = '';
  pop.style.left = '';
  pop.style.top = '';
  if (restoreFocus) termAnchor?.focus({ preventScroll: true });
  termAnchor = null;
}

async function copyText(text, message = '已複製到剪貼板') {
  try {
    await navigator.clipboard.writeText(text);
    haptic('LIGHT');
    toast(message);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      haptic('LIGHT');
      toast(message);
    } catch {
      toast('複製失敗，請手動選擇文本');
    }
    ta.remove();
  }
}

function encodeInput(input) {
  const json = JSON.stringify(input);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeInput(payload) {
  try {
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

// ---- Theme ----

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE.theme, theme);
  } catch {
    // theme still applies for this visit
  }
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = theme === 'dark' ? '#14120E' : '#F4EFE4';
  syncStatusBar(theme === 'dark');
  document.querySelectorAll('[data-theme-icon]').forEach((el) => {
    el.innerHTML = theme === 'dark' ? icon('sun', 18) : icon('moon', 18);
  });
}

function initTheme() {
  let stored = null;
  try {
    stored = localStorage.getItem(STORAGE.theme);
  } catch {
    // storage may be unavailable
  }
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(stored || (systemDark ? 'dark' : 'light'));
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}

// ---- Storage ----

function upgradeRecord(record) {
  if (!record || typeof record !== 'object' || !record.input) return null;
  const rawTags = Array.isArray(record.tags) ? record.tags : [];
  const tags = [...new Set(rawTags.map((t) => String(t).trim()).filter(Boolean))].slice(0, 6);
  return {
    ...record,
    tags,
    note: typeof record.note === 'string' ? record.note : '',
    folder: typeof record.folder === 'string' ? record.folder.trim().slice(0, 20) : '',
  };
}

const RECORD_SORTS = new Set(['newest', 'oldest', 'name', 'birthAsc', 'birthDesc']);
const RECORD_SORT_OPTIONS = [
  ['newest', '最新保存'],
  ['oldest', '最早保存'],
  ['name', '姓名'],
  ['birthAsc', '出生早→晚'],
  ['birthDesc', '出生晚→早'],
];

function loadRecordSort() {
  try {
    const stored = localStorage.getItem(STORAGE.recordsSort);
    return RECORD_SORTS.has(stored) ? stored : 'newest';
  } catch {
    return 'newest';
  }
}

function saveRecordSort(mode) {
  try {
    localStorage.setItem(STORAGE.recordsSort, mode);
  } catch {
    // sorting still works for this session
  }
}

function birthKey(input) {
  return inputSignature({ ...input, name: '' });
}

function recordSolarNumber(input) {
  const solar = normalizedSolar(input) || input.solar || {};
  return (Number(solar.y) || 0) * 10000 + (Number(solar.m) || 0) * 100 + (Number(solar.d) || 0);
}

function sortRecords(records, mode) {
  const list = [...records];
  const created = (record) => Date.parse(record.createdAt || '') || 0;
  const name = (record) => record.input.name || '';
  if (mode === 'oldest') list.sort((a, b) => created(a) - created(b));
  else if (mode === 'name') list.sort((a, b) => name(a).localeCompare(name(b), 'zh-Hant'));
  else if (mode === 'birthAsc') list.sort((a, b) => recordSolarNumber(a.input) - recordSolarNumber(b.input));
  else if (mode === 'birthDesc') list.sort((a, b) => recordSolarNumber(b.input) - recordSolarNumber(a.input));
  else list.sort((a, b) => created(b) - created(a));
  return list;
}

function loadRecords() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE.records) || 'null');
    if (Array.isArray(stored)) return stored.map(upgradeRecord).filter(Boolean);
    const legacy = JSON.parse(localStorage.getItem(STORAGE.legacyRecords) || 'null');
    if (Array.isArray(legacy)) {
      const migrated = legacy.map(upgradeRecord).filter(Boolean);
      try {
        localStorage.setItem(STORAGE.records, JSON.stringify(migrated));
      } catch {
        // storage may be unavailable
      }
      return migrated;
    }
    return [];
  } catch {
    return [];
  }
}

function persistRecords() {
  try {
    localStorage.setItem(STORAGE.records, JSON.stringify(state.records));
    return true;
  } catch {
    return false;
  }
}

function loadBackupMeta() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE.backup) || '{}') || {};
  } catch {
    return {};
  }
}

function saveBackupMeta(meta) {
  try {
    localStorage.setItem(STORAGE.backup, JSON.stringify(meta));
  } catch {
    // storage may be unavailable
  }
}

function backupNoticeDue(records) {
  if (!records.length) return false;
  const meta = loadBackupMeta();
  const now = Date.now();
  const day = 86400000;
  const lastExport = Date.parse(meta.lastExport || '');
  if (!Number.isNaN(lastExport) && now - lastExport < 30 * day) return false;
  const dismissed = Date.parse(meta.dismissedAt || '');
  if (!Number.isNaN(dismissed) && now - dismissed < 7 * day) return false;
  return true;
}

function loadLastInput() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE.lastInput) || 'null');
    return parsed && parsed.solar ? parsed : null;
  } catch {
    return null;
  }
}

function saveLastInput(input) {
  try {
    localStorage.setItem(STORAGE.lastInput, JSON.stringify(input));
  } catch {
    // storage may be disabled; the chart still works
  }
}

function normalizedSolar(input) {
  if (input.calendar === 'solar') return input.solar;
  try {
    return lunarToSolar(input.lunar.y, input.lunar.m, input.lunar.d, input.lunar.isLeap);
  } catch {
    return null;
  }
}

function inputSignature(input) {
  const solar = normalizedSolar(input) || input.solar || {};
  const t = input.time ? `${input.time.h}:${input.time.min}` : 'unknown';
  return [
    String(input.name || '').trim(), solar.y, solar.m, solar.d, t, input.gender,
    input.trueSolar ? 1 : 0, input.trueSolar ? input.city : '', input.lateZi ? 1 : 0,
  ].join('|');
}

// ---- Router ----

// Native builds load the bundle from capacitor://localhost, and app-state routes have no
// prerendered file to fall back on, so both keep hash routing; only hosted content pages
// get real paths, which is what makes them individually crawlable.
const BASE = (document.querySelector('meta[name="app-base"]')?.content || '/').replace(/([^/])$/, '$1/');
const isHosted = () => !isNative();
const PATH_ROUTES = new Set(PAGES.map((page) => page.path));

function linkFor(path) {
  if (!isHosted() || !PATH_ROUTES.has(path)) return `#${path}`;
  if (path === '/') return BASE;
  return `${BASE}${path.slice(1)}/`;
}

function normalizePath(raw) {
  const trimmed = raw.replace(/index\.html$/, '').replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

function currentPath() {
  const hash = location.hash;
  if (hash && hash.length > 1) {
    const fromHash = hash.startsWith('#/') ? hash.slice(1) : `/${hash.slice(1)}`;
    if (fromHash.startsWith('/article-')) return normalizePath(`/learn/${fromHash.slice('/article-'.length)}`);
    return normalizePath(fromHash);
  }
  if (!isHosted()) return '/';
  const pathname = BASE !== '/' && location.pathname.startsWith(BASE)
    ? `/${location.pathname.slice(BASE.length)}`
    : location.pathname;
  return normalizePath(pathname);
}

function navigate(path) {
  const target = linkFor(path);
  if (!isHosted()) {
    if (location.hash === target) route();
    else location.hash = target;
    return;
  }
  // App-state routes have no prerendered file: anchor them to the app root so a pushed
  // URL reads /#/records rather than /learn/jieqi/#/records.
  const url = target.startsWith('#') ? `${BASE}${target}` : target;
  if (location.pathname + location.hash === url) {
    route();
    return;
  }
  history.pushState({}, '', url);
  route();
}

const metaKey = (event) => event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;

// Prerendered pages ship real-path hrefs, which the native shell cannot resolve, so both
// forms are funnelled through navigate() and each platform picks its own URL style.
document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || metaKey(event)) return;
  const anchor = event.target.closest('a[href]');
  if (!anchor || anchor.target) return;
  const href = anchor.getAttribute('href');
  if (href.startsWith('#') || !href.startsWith(BASE) || href.endsWith('.html')) return;
  event.preventDefault();
  navigate(normalizePath(`/${href.slice(BASE.length)}`));
});

const HEAD_BY_PATH = new Map(PAGES.map((page) => [page.path, page]));

function setMetaTag(attr, key, value) {
  let tag = document.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.append(tag);
  }
  tag.content = value;
}

function setLinkTag(rel, href) {
  let tag = document.querySelector(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.rel = rel;
    document.head.append(tag);
  }
  tag.href = href;
}

function setJsonLd(page) {
  document.getElementById('page-jsonld')?.remove();
  if (!page.jsonLd) return;
  const absoluteLink = (path) => location.origin + linkFor(path);
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'page-jsonld';
  script.textContent = JSON.stringify(page.jsonLd({
    homeUrl: absoluteLink('/'),
    absoluteUrl: absoluteLink(page.path),
    absoluteLink,
  })).replace(/</g, '\\u003c');
  document.head.append(script);
}

function setHead(page) {
  document.title = page.title;
  setMetaTag('name', 'description', page.description);
  const noindex = page.robots === 'noindex';
  setMetaTag('name', 'robots', page.robots || 'index,follow');
  setMetaTag('property', 'og:type', page.ogType || 'website');
  setMetaTag('property', 'og:title', page.title);
  setMetaTag('property', 'og:description', page.description);
  setMetaTag('name', 'twitter:title', page.title);
  setMetaTag('name', 'twitter:description', page.description);
  if (noindex) {
    document.querySelector('link[rel="canonical"]')?.remove();
    setMetaTag('property', 'og:url', '');
    return;
  }
  const absoluteUrl = location.origin + linkFor(page.path);
  setMetaTag('property', 'og:url', absoluteUrl);
  setLinkTag('canonical', absoluteUrl);
  setJsonLd(page);
}

// Routes that only ever show this device's own data stay out of the index.
function setAppHead(title, description) {
  setHead({ path: currentPath(), title, description, robots: 'noindex' });
}

function route(options = {}) {
  const path = currentPath();
  closeTerm();
  updateNav(path);
  window.scrollTo({ top: 0 });
  const page = HEAD_BY_PATH.get(path);
  if (page) {
    setHead(page);
    renderPage(page);
  } else if (path === '/chart') {
    renderChartPage();
  } else if (path.startsWith('/view/')) {
    renderShared(path.slice('/view/'.length));
  } else if (path === '/records') {
    renderRecords();
  } else if (path === '/compare') {
    renderCompare();
  } else {
    renderError('這個地址沒有對應的頁面，可能是舊鏈接，或輸入有誤。', '頁面不存在', '頁面不存在');
  }
  if (options.focus) app.focus({ preventScroll: true });
}

function updateNav(path) {
  const key = path.startsWith('/records') || path.startsWith('/compare') ? 'records'
    : path.startsWith('/learn') || path.startsWith('/article-') ? 'learn'
      : path.startsWith('/about') || path.startsWith('/privacy') ? 'about'
        : 'home';
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.classList.toggle('is-active', a.dataset.nav === key);
  });
}

// ---- Home ----

const HOME_PAGE = PAGES.find((page) => page.path === '/');

function homeContext() {
  state.formInput = state.formInput || loadLastInput() || DEFAULT_INPUT;
  const today = todayOverview();
  return {
    ...pageContext(),
    formHtml: renderForm(),
    today: { ...today, lunarText: formatLunar(today.lunar.year, today.lunar.month, today.lunar.day, today.lunar.isLeap) },
  };
}

function renderHome() {
  renderPage(HOME_PAGE);
}

function renderForm() {
  const cityOptions = CITIES.map((c) => `<option value="${esc(c.name)}">${esc(c.name)} · ${c.longitude}°E</option>`).join('');
  return `
    <form id="chart-form" class="chart-form" novalidate>
      <div class="form-head">
        <div>
          <p class="form-kicker">起盤</p>
          <h2>輸入出生信息</h2>
        </div>
        <button type="button" class="link-btn" data-action="sample">載入示例</button>
      </div>

      <div class="field-row two">
        <div class="field">
          <label for="f-name">姓名 <span class="optional">選填</span></label>
          <input id="f-name" name="name" type="text" maxlength="20" placeholder="可留空" autocomplete="off">
        </div>
        <div class="field">
          <span class="field-label">性別</span>
          <div class="seg" role="radiogroup" aria-label="性別">
            <label><input type="radio" name="gender" value="male" checked><span>男</span></label>
            <label><input type="radio" name="gender" value="female"><span>女</span></label>
          </div>
        </div>
      </div>

      <div class="field">
        <span class="field-label">曆法</span>
        <div class="seg seg-wide" role="radiogroup" aria-label="曆法">
          <label><input type="radio" name="calendar" value="solar" checked><span>公曆</span></label>
          <label><input type="radio" name="calendar" value="lunar"><span>農曆</span></label>
        </div>
      </div>

      <div id="solar-fields" class="cal-fields">
        <div class="field">
          <label for="f-solar">出生日期</label>
          <input id="f-solar" type="date" min="1900-01-31" max="2100-12-31">
        </div>
      </div>

      <div id="lunar-fields" class="cal-fields" hidden>
        <div class="field-row lunar-row">
          <div class="field">
            <label for="f-lunar-year">農曆年</label>
            <select id="f-lunar-year">${lunarYearOptions()}</select>
          </div>
          <div class="field">
            <label for="f-lunar-month">月</label>
            <select id="f-lunar-month"></select>
          </div>
          <div class="field">
            <label for="f-lunar-day">日</label>
            <select id="f-lunar-day"></select>
          </div>
        </div>
        <p class="hint" id="lunar-hint"></p>
      </div>

      <div class="field-row time-row">
        <div class="field">
          <label for="f-time">出生時間</label>
          <input id="f-time" type="time">
        </div>
        <div class="field">
          <span class="field-label">時辰</span>
          <div class="time-readout" id="shichen-hint">—</div>
          <label class="check compact-check"><input type="checkbox" id="f-time-unknown"> 時辰未知</label>
        </div>
      </div>

      <details class="advanced">
        <summary><span>高級選項</span><small>真太陽時 · 子時換日</small>${icon('chevron', 15)}</summary>
        <div class="advanced-body">
          <label class="check"><input type="checkbox" id="f-true-solar"> 啟用真太陽時校正</label>
          <div class="field city-field" id="city-field" hidden>
            <label for="f-city">出生城市</label>
            <select id="f-city">${cityOptions}</select>
            <p class="hint">按城市經度與出生日均時差校正鐘錶時間，結果會標註在命盤頂部。</p>
          </div>
          <label class="check"><input type="checkbox" id="f-late-zi" checked> 晚子時（23:00 後）按次日日柱</label>
          <label class="check"><input type="checkbox" id="f-share-private"> 分享與複製時隱藏姓名</label>
        </div>
      </details>

      <button class="btn btn-primary form-submit" type="submit">
        <span>排盤 · 觀象</span>${icon('arrowRight', 18)}
      </button>
      <p class="form-privacy">${icon('compass', 14)} 所有計算與保存均在瀏覽器本地完成</p>
    </form>
  `;
}

function lunarYearOptions() {
  let html = '';
  for (let y = 1900; y <= 2100; y++) {
    html += `<option value="${y}">${y} · ${lunarYearLabel(y)}</option>`;
  }
  return html;
}

function initHomeForm() {
  const form = document.getElementById('chart-form');
  if (!form) return;
  const solarInput = document.getElementById('f-solar');
  const timeInput = document.getElementById('f-time');
  const unknown = document.getElementById('f-time-unknown');
  const trueSolar = document.getElementById('f-true-solar');
  const cityField = document.getElementById('city-field');
  const citySelect = document.getElementById('f-city');
  const lateZi = document.getElementById('f-late-zi');
  const lunarYear = document.getElementById('f-lunar-year');
  const lunarMonth = document.getElementById('f-lunar-month');
  const lunarDay = document.getElementById('f-lunar-day');
  const lunarHint = document.getElementById('lunar-hint');
  const shichenHint = document.getElementById('shichen-hint');

  const input = state.formInput || DEFAULT_INPUT;
  const solarForForm = input.calendar === 'lunar' && input.lunar
    ? (() => { try { return lunarToSolar(input.lunar.y, input.lunar.m, input.lunar.d, input.lunar.isLeap); } catch { return DEFAULT_INPUT.solar; } })()
    : (input.solar || DEFAULT_INPUT.solar);

  form.querySelector(`input[name="gender"][value="${input.gender}"]`).checked = true;
  form.querySelector(`input[name="calendar"][value="${input.calendar}"]`).checked = true;
  document.getElementById('f-name').value = input.name || '';
  solarInput.value = dateInputValue(solarForForm);
  timeInput.value = timeInputValue(input.time);
  unknown.checked = !input.time;
  trueSolar.checked = !!input.trueSolar;
  citySelect.value = input.city || '北京';
  lateZi.checked = input.lateZi !== false;
  document.getElementById('f-share-private').checked = !!input.shareHideName;

  lunarYear.value = String(solarForForm.y);
  syncLunarFromSolar(solarForForm, null, false);
  if (input.calendar === 'lunar' && input.lunar) {
    setLunarSelects(input.lunar.year, input.lunar.month, input.lunar.day, input.lunar.isLeap);
  }

  let lastCalendar = form.querySelector('input[name="calendar"]:checked').value;

  const syncSolarFromLunar = () => {
    try {
      const mv = lunarMonth.value;
      if (!mv) return;
      const solar = lunarToSolar(
        Number(lunarYear.value),
        Number(mv.replace('L', '')),
        Number(lunarDay.value),
        mv.endsWith('L'),
      );
      solarInput.value = dateInputValue(solar);
    } catch {
      // keep previous solar value
    }
  };

  const setCalendarUI = () => {
    const calendar = form.querySelector('input[name="calendar"]:checked').value;
    if (calendar === 'lunar' && lastCalendar === 'solar') {
      const [y, m, d] = solarInput.value.split('-').map(Number);
      if (y && m && d) syncLunarFromSolar({ y, m, d }, null, true);
    } else if (calendar === 'solar' && lastCalendar === 'lunar') {
      syncSolarFromLunar();
    }
    lastCalendar = calendar;
    document.getElementById('solar-fields').hidden = calendar !== 'solar';
    document.getElementById('lunar-fields').hidden = calendar !== 'lunar';
    if (calendar === 'lunar') updateLunarHint();
  };

  const updateTimeUI = () => {
    const isUnknown = unknown.checked;
    timeInput.disabled = isUnknown;
    if (isUnknown) {
      shichenHint.textContent = '時辰未知';
      shichenHint.classList.add('muted');
    } else {
      shichenHint.classList.remove('muted');
      updateShichen();
    }
  };

  const updateShichen = () => {
    if (!timeInput.value) {
      shichenHint.textContent = '請選擇時間';
      return;
    }
    const [h, min] = timeInput.value.split(':').map(Number);
    const b = Math.floor(((h + 1) % 24) / 2);
    const start = (b * 2 + 23) % 24;
    const end = (b * 2) % 24;
    shichenHint.textContent = `${BRANCHES[b]}時 · ${two(start)}:00–${two(end)}:59`;
  };

  function updateLunarHint() {
    try {
      const year = Number(lunarYear.value);
      const mv = lunarMonth.value;
      if (!mv) return;
      const isLeap = mv.endsWith('L');
      const month = Number(mv.replace('L', ''));
      const day = Number(lunarDay.value);
      const solar = lunarToSolar(year, month, day, isLeap);
      lunarHint.textContent = `對應公曆：${solar.y}年${solar.m}月${solar.d}日`;
    } catch (err) {
      lunarHint.textContent = err.message;
    }
  }

  function rebuildMonths(year, preferred, preferredLeap = false) {
    const list = lunarMonthList(year);
    lunarMonth.innerHTML = list.map((item) => {
      const value = item.isLeap ? `${item.month}L` : String(item.month);
      return `<option value="${value}">${item.isLeap ? '閏' : ''}${item.label.replace('閏', '')}</option>`;
    }).join('');
    let target = preferred;
    if (preferredLeap && list.some((i) => i.isLeap && i.month === preferred)) target = `${preferred}L`;
    if (target != null && [...lunarMonth.options].some((o) => o.value === String(target))) {
      lunarMonth.value = String(target);
    }
    rebuildDays(year, Number(lunarMonth.value.replace('L', '')), lunarMonth.value.endsWith('L'), null);
  }

  function rebuildDays(year, month, isLeap, preferredDay) {
    const item = lunarMonthList(year).find((i) => i.month === month && i.isLeap === isLeap);
    const days = item ? item.days : 30;
    let html = '';
    for (let d = 1; d <= days; d++) {
      html += `<option value="${d}">${LUNAR_DAYS[d - 1]}</option>`;
    }
    lunarDay.innerHTML = html;
    if (preferredDay && preferredDay <= days) lunarDay.value = String(preferredDay);
    else if (Number(lunarDay.value) > days) lunarDay.value = String(days);
  }

  function setLunarSelects(year, month, day, isLeap) {
    lunarYear.value = String(year);
    rebuildMonths(year, month, isLeap);
    try {
      rebuildDays(year, month, isLeap, day);
    } catch (err) {
      // fall through to hint
    }
    updateLunarHint();
  }

  function syncLunarFromSolar(solar, preferredDay, updateHint) {
    try {
      const lunar = solarToLunar(solar.y, solar.m, solar.d);
      setLunarSelects(lunar.year, lunar.month, preferredDay || lunar.day, lunar.isLeap);
      if (updateHint) updateLunarHint();
    } catch {
      // ignore
    }
  }

  form.querySelectorAll('input[name="calendar"]').forEach((radio) => {
    radio.addEventListener('change', setCalendarUI);
  });
  solarInput.addEventListener('change', () => {
    const [y, m, d] = solarInput.value.split('-').map(Number);
    if (y && m && d) syncLunarFromSolar({ y, m, d }, null, true);
  });
  lunarYear.addEventListener('change', () => {
    rebuildMonths(Number(lunarYear.value), 1, false);
    updateLunarHint();
  });
  lunarMonth.addEventListener('change', () => {
    const year = Number(lunarYear.value);
    const isLeap = lunarMonth.value.endsWith('L');
    rebuildDays(year, Number(lunarMonth.value.replace('L', '')), isLeap, 1);
    updateLunarHint();
  });
  lunarDay.addEventListener('change', updateLunarHint);
  unknown.addEventListener('change', updateTimeUI);
  timeInput.addEventListener('input', updateShichen);
  trueSolar.addEventListener('change', () => {
    cityField.hidden = !trueSolar.checked;
  });

  updateTimeUI();
  setCalendarUI();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    let inputData;
    try {
      inputData = readFormInput(form);
    } catch (err) {
      toast(err.message);
      return;
    }
    try {
      const chart = computeChart(inputData);
      state.chart = chart;
      state.formInput = inputData;
      state.selectedLuck = defaultLuckIndex(chart);
      state.period = null;
      saveLastInput(inputData);
      navigate('/chart');
    } catch (err) {
      toast(err.message || '排盤失敗，請檢查輸入');
    }
  });
}

function readFormInput(form) {
  const data = new FormData(form);
  const calendar = data.get('calendar');
  const gender = data.get('gender');
  const name = String(data.get('name') || '').trim();
  const timeUnknown = document.getElementById('f-time-unknown').checked;
  const timeValue = document.getElementById('f-time').value;
  let time = null;
  if (!timeUnknown) {
    if (!timeValue) throw new Error('請選擇出生時間，或勾選「時辰未知」');
    const [h, min] = timeValue.split(':').map(Number);
    time = { h, min };
  }

  let solar;
  let lunar;
  if (calendar === 'solar') {
    const value = document.getElementById('f-solar').value;
    if (!value) throw new Error('請選擇出生日期');
    const [y, m, d] = value.split('-').map(Number);
    if (y < 1900 || y > 2100) throw new Error('出生日期需在 1900–2100 年之間');
    solar = { y, m, d };
    lunar = solarToLunar(y, m, d);
  } else {
    const y = Number(document.getElementById('f-lunar-year').value);
    const mv = document.getElementById('f-lunar-month').value;
    const d = Number(document.getElementById('f-lunar-day').value);
    const isLeap = mv.endsWith('L');
    const m = Number(mv.replace('L', ''));
    solar = lunarToSolar(y, m, d, isLeap);
    if (solar.y < 1900 || solar.y > 2100) {
      throw new Error('該農曆日期對應的公曆已超出 1900–2100 年範圍');
    }
    lunar = { y, m, d, isLeap };
  }

  return {
    name,
    gender,
    calendar,
    solar,
    lunar,
    time,
    trueSolar: document.getElementById('f-true-solar').checked,
    city: document.getElementById('f-city').value,
    lateZi: document.getElementById('f-late-zi').checked,
    shareHideName: document.getElementById('f-share-private').checked,
  };
}

function fillForm(input) {
  state.formInput = input;
  renderHome();
  toast('已載入，可直接排盤');
}

function fillToday() {
  const now = beijingNowParts();
  const base = state.formInput || DEFAULT_INPUT;
  const typedName = document.getElementById('f-name')?.value.trim();
  const checkedGender = document.querySelector('input[name="gender"]:checked')?.value;
  fillForm({
    ...base,
    name: typedName || base.name || '',
    gender: checkedGender || base.gender,
    calendar: 'solar',
    solar: { y: now.y, m: now.m, d: now.d },
    lunar: null,
    time: { h: now.h, min: now.min },
    lateZi: base.lateZi !== false,
  });
}

// ---- Chart page ----

function defaultLuckIndex(chart) {
  const y = beijingNowParts().y;
  const steps = chart.luck.steps;
  const idx = steps.findIndex((step) => y >= step.startYear && y < step.startYear + 10);
  if (idx >= 0) return idx;
  return y >= steps[steps.length - 1].startYear ? steps.length - 1 : 0;
}

function viewFromState() {
  const p = state.period;
  if (!p) return { luck: state.selectedLuck };
  return {
    luck: state.selectedLuck,
    year: p.year,
    month: p.monthIndex,
    day: p.dayIndex,
    hour: p.hourBranch,
  };
}

function restoreView(chart, view) {
  const steps = chart.luck.steps;
  const luck = Number.isInteger(view?.luck) && view.luck >= 0 && view.luck < steps.length
    ? view.luck
    : defaultLuckIndex(chart);
  state.selectedLuck = luck;
  const years = steps[luck].years.map((y) => y.year);
  if (view && years.includes(view.year)) {
    state.period = {
      year: view.year,
      monthIndex: Number.isInteger(view.month) ? view.month : null,
      dayIndex: Number.isInteger(view.day) ? view.day : null,
      hourBranch: Number.isInteger(view.hour) ? view.hour : null,
    };
  } else {
    state.period = null;
  }
}

function renderChartPage() {
  if (!state.chart) {
    const stored = loadLastInput();
    if (stored) {
      try {
        state.chart = computeChart(stored);
        state.formInput = stored;
        state.selectedLuck = defaultLuckIndex(state.chart);
        state.period = null;
      } catch {
        state.chart = null;
      }
    }
  }
  if (!state.chart) {
    renderHome();
    return;
  }
  renderChart(state.chart);
}

function renderShared(payload) {
  const raw = decodeInput(payload);
  if (!raw) {
    renderError('這枚分享鏈接似乎不完整');
    return;
  }
  const input = raw.v === 2 && raw.input ? raw.input : raw;
  const view = raw.v === 2 ? raw.view : null;
  try {
    const chart = computeChart(input);
    state.chart = chart;
    state.formInput = input;
    restoreView(chart, view);
    renderChart(chart);
  } catch (err) {
    renderError(err.message || '無法解讀這枚鏈接');
  }
}

function renderError(message, heading = '鏈接未能起盤', pageTitle = '鏈接無效') {
  setAppHead(`${BRAND} · ${pageTitle}`, '這個鏈接未能完成排盤，可能是舊連結或內容已被修改。');
  app.innerHTML = `
    <div class="wrap error-page">
      <span class="error-seal">空</span>
      <h1>${esc(heading)}</h1>
      <p>${esc(message)}</p>
      <a class="btn btn-primary" href="${linkFor('/')}">重新排盤 ${icon('arrowRight', 16)}</a>
    </div>
  `;
}

function climateAdvice(chart) {
  const info = CLIMATE[chart.monthInfo.branch] || CLIMATE[0];
  const favorable = chart.dayMaster.favorable.map((f) => f.key);
  const overlap = info.keys.filter((key) => favorable.includes(key));
  const compare = overlap.length
    ? `與上方五行喜用同向（${overlap.map((key) => ELEMENT_LABEL[key]).join('、')}），可作加強印證。`
    : '與上方五行喜用方向不同，屬另一層參考；先看全局平衡，再看寒暖。';
  return { ...info, compare };
}

function renderChart(chart) {
  const name = chart.input.name || '未具名';
  setAppHead(`${BRAND} · ${name}的命盤`, '四柱、十神、藏干與大運流年的完整命盤，資料來自本機輸入。');
  const solarText = solarDateText(chart);
  const gender = GENDER_LABEL[chart.input.gender];
  const dm = chart.dayMaster;
  const structure = chart.structure;
  const selected = chart.luck.steps[state.selectedLuck] || chart.luck.steps[0];
  const climate = climateAdvice(chart);
  const printWatch = watchData(chart, selected);
  const printPeriodText = printWatch.day && printWatch.hour
    ? `${printWatch.day.y}年${printWatch.day.m}月${printWatch.day.d}日 ${BRANCHES[printWatch.hour.branch]}時`
    : '未選擇';
  const printJoin = (list, empty) => (list.length ? list.map((item) => item.text).join('；') : empty);

  app.innerHTML = `
    <div class="wrap result-page">
      <div class="result-bar reveal">
        <a class="back-link" href="${linkFor('/')}">${icon('arrowLeft', 16)} 重新排盤</a>
        <div class="result-actions">
          <button class="chip-btn" type="button" data-action="edit">${icon('edit', 15)} 修改</button>
          <button class="chip-btn" type="button" data-action="save">${icon('save', 15)} 保存</button>
          <button class="chip-btn" type="button" data-action="share">${icon('link', 15)} 分享</button>
          <button class="chip-btn" type="button" data-action="copy" aria-label="複製命盤文字">${icon('copy', 15)} 複製</button>
          <button class="chip-btn" type="button" data-action="png">${icon('image', 15)} 存圖</button>
          <button class="chip-btn" type="button" data-action="print">${icon('print', 15)} 打印</button>
          <button class="chip-btn" type="button" data-action="print-compact">${icon('print', 15)} 精簡列印</button>
        </div>
      </div>

      <section class="identity reveal">
        <div class="identity-main">
          <span class="identity-seal">${esc(Array.from(name)[0] || '命')}</span>
          <div class="identity-text">
            <div class="identity-name">${esc(name)}<small>${gender}命</small></div>
            <div class="identity-meta">
              <span>公曆 ${solarText}</span>
              <span>農曆 ${chart.lunarText}</span>
            </div>
          </div>
        </div>
        <div class="identity-facts">
          <div><span>生肖</span><strong>${chart.animal}</strong></div>
          <div><span>日主</span><strong class="${elClass(dm.element)}">${dm.char}${dm.elementLabel}</strong></div>
          <div><span>格局</span><strong>${structure.primary.name}</strong></div>
          <div><span>四柱</span><strong class="identity-pillars">${chart.fourPillarsText}</strong></div>
        </div>
      </section>

      ${chart.solarCorrection ? `
        <div class="correction-note reveal">
          ${icon('compass', 15)}
          <span>真太陽時：${esc(chart.solarCorrection.text)}（${esc(chart.solarCorrection.city)} ${chart.solarCorrection.longitude}°E，校正 ${chart.solarCorrection.rounded > 0 ? '+' : ''}${chart.solarCorrection.rounded} 分鐘）</span>
        </div>` : ''}
      ${chart.timeUnknown ? `<div class="correction-note warn reveal">${icon('info', 15)}<span>時辰未知：時柱、命宮、身宮已略去；起運時間按正午估算。</span></div>` : ''}

      <div class="chart-layout">
        <div class="chart-main">
          <section class="card chart-card ${state.compact ? 'is-compact' : ''} reveal" aria-labelledby="chart-title">
            <div class="card-head">
              <div>
                <p class="card-kicker">命盤</p>
                <h2 id="chart-title">四柱八字</h2>
              </div>
              <button class="chip-btn subtle" type="button" data-action="compact" id="compact-btn">${state.compact ? '展開詳盤' : '切換簡盤'}</button>
            </div>
            ${renderPillarChart(chart)}
            <p class="chart-foot">年柱為根基與少年，月柱為環境與青年，日柱為自身與伴侶，時柱為子女與歸途。以日干為「我」，其餘干支的關係即十神。</p>
          </section>

          <section class="card structure-card reveal" style="--delay: 40ms" aria-labelledby="structure-title">
            <div class="card-head">
              <div>
                <p class="card-kicker">取格</p>
                <h2 id="structure-title">格局與用神</h2>
              </div>
              <span class="mini-tag">${structure.primary.name}</span>
            </div>
            <div class="structure-grid">
              <div class="structure-block">
                <p class="structure-eyebrow">格局</p>
                <div class="structure-head">
                  <strong class="structure-name">${structure.primary.name}</strong>
                  <span class="structure-confidence">取格把握 ${structure.primary.confidenceText}</span>
                </div>
                <p class="structure-reason">${structure.primary.reason}</p>
                ${structure.candidates.length > 1 ? `
                  <div class="structure-candidates">
                    <span class="favor-label">兼格</span>
                    ${structure.candidates.slice(1).map((candidate) => `
                      <span class="structure-chip">${candidate.name}<i>${candidate.confidenceText}</i></span>
                    `).join('')}
                  </div>` : ''}
              </div>
              <div class="structure-block">
                <p class="structure-eyebrow">用神</p>
                <div class="useful-head">
                  <span class="useful-element ${elClass(structure.useful.primary.element)}">${structure.useful.primary.label}</span>
                  <div class="useful-copy">
                    <div class="useful-meta">
                      <strong>${structure.useful.primary.methods.join('・')}</strong>
                      <span class="structure-confidence">把握 ${structure.useful.primary.confidenceText}</span>
                    </div>
                    <p class="structure-reason">${structure.useful.primary.reason}</p>
                  </div>
                </div>
                ${structure.useful.candidates.length > 1 ? `
                  <div class="useful-list">
                    ${structure.useful.candidates.slice(1).map((candidate) => `
                      <div class="useful-row">
                        <b class="${elClass(candidate.element)}">${candidate.label}</b>
                        <span>${candidate.methods.join('・')}</span>
                        <i>${candidate.confidenceText}</i>
                      </div>
                    `).join('')}
                  </div>` : ''}
                ${structure.useful.avoid.length ? `
                  <div class="favor-row">
                    <span class="favor-label">較忌</span>
                    ${structure.useful.avoid.map((row) => `<span class="favor-chip ${elClass(row.element)}">${row.label}</span>`).join('')}
                  </div>` : ''}
              </div>
            </div>
            <p class="tiny-note">${structure.notes.join(' ')}</p>
          </section>

          <section class="card luck-panel reveal" style="--delay: 60ms" id="luck-section">
            <div class="card-head luck-head">
              <div>
                <p class="card-kicker">大運</p>
                <h2>十年一運</h2>
              </div>
              <div class="luck-meta">
                <span>${chart.luck.directionLabel}</span>
                <span>${chart.luck.startLabel}起運</span>
                <span>${chart.luck.jiaoyunText}交運</span>
              </div>
            </div>
            <div class="luck-rail" role="tablist" aria-label="大運，使用左右方向鍵切換">
              ${chart.luck.steps.map((step, i) => renderLuckCard(step, i, state.selectedLuck === i)).join('')}
            </div>
            <div id="liunian-body" role="tabpanel" aria-labelledby="luck-tab-${state.selectedLuck}" tabindex="0">${renderLiunian(chart, selected)}</div>
          </section>

          <section class="card watch-card reveal" style="--delay: 80ms" aria-labelledby="watch-title">
            <div class="card-head">
              <div>
                <p class="card-kicker">運勢</p>
                <h2 id="watch-title">互動與神煞</h2>
              </div>
              <span class="mini-tag">隨大運切換</span>
            </div>
            <div id="watch-body">${renderWatch(chart, selected)}</div>
          </section>

          <section class="card palace-card reveal" style="--delay: 100ms">
            <div class="card-head">
              <div>
                <p class="card-kicker">附盤</p>
                <h2>命宮 · 胎元 · 身宮</h2>
              </div>
              <div class="kong-info">日空 <b>${chart.kongwang.day.join('')}</b> · 年空 <b>${chart.kongwang.year.join('')}</b></div>
            </div>
            <div class="palace-grid">
              ${renderPalace('命宮', chart.palaces.ming, '立命之所')}
              ${renderPalace('胎元', chart.palaces.tai, '受氣之初')}
              ${renderPalace('身宮', chart.palaces.shen, '身之所寄')}
            </div>
            <div class="jie-info">
              <div><span>節氣</span>生於 <b>${chart.monthInfo.prevJie.name}</b>（${chart.monthInfo.prevJie.text}）後 ${chart.monthInfo.prevJie.days.toFixed(1)} 天，距 <b>${chart.monthInfo.nextJie.name}</b>（${chart.monthInfo.nextJie.text}）${chart.monthInfo.nextJie.days.toFixed(1)} 天</div>
              <div><span>月令</span>${chart.monthInfo.branchChar}月 · ${ELEMENT_LABEL[chart.monthInfo.element]}當令</div>
              <div><span>校正</span>${chart.solarCorrection ? `真太陽時 ${chart.solarCorrection.rounded > 0 ? '+' : ''}${chart.solarCorrection.rounded} 分鐘` : '按北京時間'} · ${chart.input.lateZi !== false ? '晚子時換日' : '晚子時不換日'}</div>
            </div>
          </section>
        </div>

        <aside class="chart-side">
          <div class="chart-side-col">
          <section class="card daymaster-card reveal" style="--delay: 40ms">
            <div class="dm-top">
              <span class="dm-big ${elClass(dm.element)}">${dm.char}</span>
              <div class="dm-title">
                <p class="card-kicker">日主</p>
                <h2>${dm.polarity}${dm.elementLabel}</h2>
                <span class="strength-badge">${dm.strength}</span>
              </div>
            </div>
            <p class="dm-summary">${chart.summary.dayMaster}</p>
            <div class="strength-meter" title="同黨佔比 ${(dm.supportRatio * 100).toFixed(1)}%">
              <span style="width:${Math.min(100, Math.max(0, dm.supportRatio * 100))}%"></span>
            </div>
            <div class="meter-labels"><span>同黨 ${(dm.supportRatio * 100).toFixed(0)}%</span><span>異黨 ${(100 - dm.supportRatio * 100).toFixed(0)}%</span></div>
            <p class="dm-note">${chart.summary.elements}</p>
            <div class="favor-row">
              <span class="favor-label">五行參考</span>
              ${dm.favorable.map((f) => `<span class="favor-chip ${elClass(f.key)}">${f.label}</span>`).join('')}
            </div>
            <p class="tiny-note">${chart.summary.favorableNote}</p>
          </section>

          <section class="card gods-card reveal" style="--delay: 130ms">
            <div class="card-head">
              <div>
                <p class="card-kicker">關係</p>
                <h2>十神分佈</h2>
              </div>
            </div>
            <div class="god-bars">
              ${chart.tenGods.map((g) => `
                <div class="god-row">
                  <span class="god-title">${termTag(g.name)}<i>${g.group}</i></span>
                  <div class="bar"><span class="fill god" style="width:${g.percent}%"></span></div>
                  <b>${g.percent}%</b>
                </div>`).join('')}
            </div>
          </section>
          </div>

          <div class="chart-side-col">
          <section class="card elements-card reveal" style="--delay: 90ms">
            <div class="card-head">
              <div>
                <p class="card-kicker">分佈</p>
                <h2>五行比例</h2>
              </div>
              <span class="mini-tag">季節加權</span>
            </div>
            ${radarChart(chart.elements)}
            <div class="element-bars">
              ${chart.elements.map((row) => `
                <div class="element-row">
                  <span class="element-name ${elClass(row.key)}">${row.label}</span>
                  <div class="bar"><span class="fill ${elClass(row.key)}" style="width:${row.percent}%"></span></div>
                  <b>${row.percent}%</b>
                </div>`).join('')}
            </div>
          </section>

          <section class="card climate-card reveal" style="--delay: 150ms">
            <div class="card-head">
              <div>
                <p class="card-kicker">調候</p>
                <h2>寒暖燥濕</h2>
              </div>
              <span class="mini-tag">${climate.label}</span>
            </div>
            <p class="climate-text">${climate.text}</p>
            <div class="favor-row">
              <span class="favor-label">調候參考</span>
              ${climate.keys.map((key) => `<span class="favor-chip ${elClass(key)}">${ELEMENT_LABEL[key]}</span>`).join('')}
            </div>
            <p class="tiny-note">${climate.compare}</p>
          </section>

          <section class="card almanac-card reveal" style="--delay: 170ms">
            <p class="card-kicker">曆法</p>
            <h2>起盤依據</h2>
            <dl class="almanac-list">
              <div><dt>農曆</dt><dd>${chart.lunarText}</dd></div>
              <div><dt>生肖</dt><dd>${chart.animal}</dd></div>
              <div><dt>節氣</dt><dd>${chart.monthInfo.prevJie.name} ${chart.monthInfo.prevJie.text}</dd></div>
              <div><dt>下節</dt><dd>${chart.monthInfo.nextJie.name} ${chart.monthInfo.nextJie.text}</dd></div>
              <div><dt>起運</dt><dd>${chart.luck.startLabel} · ${chart.luck.directionLabel}</dd></div>
              <div><dt>交運</dt><dd>${chart.luck.jiaoyunText}</dd></div>
            </dl>
            <a href="${linkFor('/learn')}" class="card-link">讀懂命盤裏的術語 ${icon('arrowRight', 14)}</a>
          </section>
          </div>
        </aside>
      </div>

      <section class="print-summary">
        <h1>知命 · ${esc(name)}的命盤</h1>
        <p>${gender}命 · 公曆 ${solarText} · 農曆 ${chart.lunarText}</p>
        <p>四柱：${chart.fourPillarsText} · 日主 ${dm.char}${dm.elementLabel} · ${dm.strength}</p>
        <p>格局：${structure.primary.name}（${structure.primary.confidenceText}）　用神：${structure.useful.primary.label}（${structure.useful.primary.methods.join('、')}）</p>
        <p>大運：${chart.luck.directionLabel}　${selected.startText} 至 ${selected.endText}（${selected.stemChar}${selected.branchChar}）</p>
        <p>所選時點：${printPeriodText}</p>
        <p>天干留意：${printJoin(printWatch.interactions.stems, '無合沖')}</p>
        <p>地支留意：${printJoin(printWatch.interactions.branches, '無沖合刑害')}</p>
        <p>流年：${printWatch.year.stemChar}${printWatch.year.branchChar}（${printWatch.year.year}）　神煞：${printWatch.year.shensha.join('、') || '無'}</p>
      </section>

      <p class="disclaimer">命盤為傳統術數的結構化呈現，五行比例與喜用提示僅為通俗參考，不構成命運判斷或任何現實決策建議。</p>
    </div>
  `;

  bindResultEvents();
}

function renderPillarChart(chart) {
  const cols = [
    { key: 'year', label: '年柱', sub: '根基' },
    { key: 'month', label: '月柱', sub: '環境' },
    { key: 'day', label: '日柱', sub: '自身' },
    { key: 'hour', label: '時柱', sub: '歸途' },
  ];
  const pillar = (key) => chart.pillars[key];
  const cell = (content, cls = '', pillarKey = '') => `<div class="pc-cell ${cls} ${pillarKey === 'day' ? 'is-day' : ''}">${content}</div>`;

  const rows = [];

  rows.push(`<div class="pc-row row-god">
    <div class="pc-label">十神</div>
    ${cols.map((c) => cell(pillar(c.key) ? termTag(pillar(c.key).tenGod, `tg${pillar(c.key).tenGod === '日主' ? ' is-self' : ''}`) : '<span class="muted">—</span>', '', c.key)).join('')}
  </div>`);

  rows.push(`<div class="pc-row row-stem">
    <div class="pc-label">天干</div>
    ${cols.map((c) => cell(pillar(c.key) ? `<span class="big-char ${elClass(pillar(c.key).stemElement)}">${pillar(c.key).stemChar}</span>` : '<span class="big-char muted">—</span>', '', c.key)).join('')}
  </div>`);

  rows.push(`<div class="pc-row row-branch">
    <div class="pc-label">地支</div>
    ${cols.map((c) => cell(pillar(c.key) ? `<span class="big-char ${elClass(pillar(c.key).branchElement)}">${pillar(c.key).branchChar}</span>` : '<span class="big-char muted">—</span>', '', c.key)).join('')}
  </div>`);

  rows.push(`<div class="pc-row row-hidden">
    <div class="pc-label">藏干</div>
    ${cols.map((c) => cell(pillar(c.key)
      ? `<div class="hidden-list">${pillar(c.key).hidden.map((h) => `<span class="hidden-item"><b class="${elClass(h.element)}">${h.char}</b><i>${h.god}</i></span>`).join('')}</div>`
      : '<span class="muted">—</span>', '', c.key)).join('')}
  </div>`);

  rows.push(`<div class="pc-row row-stage">
    <div class="pc-label">星運</div>
    ${cols.map((c) => cell(pillar(c.key) ? `<span class="stage">${pillar(c.key).stage}</span>` : '<span class="muted">—</span>', '', c.key)).join('')}
  </div>`);

  rows.push(`<div class="pc-row row-nayin">
    <div class="pc-label">納音</div>
    ${cols.map((c) => cell(pillar(c.key) ? `<span class="nayin">${pillar(c.key).nayin}</span>` : '<span class="muted">—</span>', '', c.key)).join('')}
  </div>`);

  rows.push(`<div class="pc-row row-shensha">
    <div class="pc-label">神煞</div>
    ${cols.map((c) => cell(pillar(c.key)
      ? (pillar(c.key).shensha.length
        ? `<div class="ss-list">${pillar(c.key).shensha.map((s) => termTag(s, `ss-tag${s === '空亡' || s === '年空' ? ' is-kong' : ''}`)).join('')}</div>`
        : '<span class="muted">—</span>')
      : '<span class="muted">—</span>', '', c.key)).join('')}
  </div>`);

  return `
    <div class="pillar-chart" role="table" aria-label="四柱八字">
      <div class="pc-row pc-head-row">
        <div class="pc-label pc-corner">四柱</div>
        ${cols.map((c) => `<div class="pc-head ${c.key === 'day' ? 'is-day' : ''}"><span>${c.label}</span><small>${c.sub}</small></div>`).join('')}
      </div>
      ${rows.join('')}
    </div>
    <div class="pillar-key">
      <span>日主</span>${chart.dayMaster.char}${chart.dayMaster.elementLabel}
      <i></i>
      <span>月令</span>${chart.monthInfo.branchChar}月
      <i></i>
      <span>空亡</span>${chart.kongwang.day.join('')}
    </div>
  `;
}

function renderLuckCard(step, index, active) {
  return `
    <button class="luck-card ${active ? 'is-active' : ''}" type="button" role="tab" id="luck-tab-${index}" aria-controls="liunian-body" aria-selected="${active}" tabindex="${active ? '0' : '-1'}" data-luck-index="${index}">
      <span class="luck-top"><span>${step.ageLabel}</span><span>${step.startYear}</span></span>
      <strong class="luck-chars">
        <b class="${elClass(step.stemElement)}">${step.stemChar}</b><b class="${elClass(step.branchElement)}">${step.branchChar}</b>
      </strong>
      <span class="luck-god">${step.tenGod}</span>
      <span class="luck-nayin">${step.nayin}</span>
      <span class="luck-dates" title="${esc(`${step.startText} 至 ${step.endText}`)}">${shortDate(step.startText)}–${shortDate(step.endText)}</span>
    </button>
  `;
}

const DAY_MS = 86400000;

function resolvePeriod(chart, step) {
  if (!state.period) state.period = { year: null, monthIndex: null, dayIndex: null };
  const years = step.years.map((y) => y.year);
  if (!years.includes(state.period.year)) {
    const currentYear = step.years.find((y) => y.isCurrent);
    state.period.year = currentYear ? currentYear.year : years[0];
    state.period.monthIndex = null;
    state.period.dayIndex = null;
  }
  const table = periodTable(chart, state.period.year);
  const nowTs = chart.current.ts;
  const month = table.months[state.period.monthIndex];
  if (!month || !month.days.length) {
    const idx = table.months.findIndex((mo) => mo.startTs != null && nowTs >= mo.startTs && nowTs < mo.endTs);
    state.period.monthIndex = idx >= 0 ? idx : 0;
    state.period.dayIndex = null;
    state.period.hourBranch = null;
  }
  const days = table.months[state.period.monthIndex].days;
  if (state.period.dayIndex == null || !days[state.period.dayIndex]) {
    const todayTs = Math.floor(nowTs / DAY_MS) * DAY_MS;
    const idx = days.findIndex((d) => d.ts === todayTs);
    state.period.dayIndex = idx >= 0 ? idx : 0;
    state.period.hourBranch = null;
  }
  const day = days[state.period.dayIndex] || null;
  const hours = day ? BRANCHES.map((_, i) => hourPeriod(chart, day.stem, i)) : [];
  if (day && (state.period.hourBranch == null || !hours[state.period.hourBranch])) {
    const todayTs = Math.floor(nowTs / DAY_MS) * DAY_MS;
    if (day.ts === todayTs) {
      const h = new Date(nowTs).getUTCHours();
      state.period.hourBranch = Math.floor(((h + 1) % 24) / 2);
    } else {
      state.period.hourBranch = 0;
    }
  }
  return {
    table,
    month: table.months[state.period.monthIndex],
    day,
    hours,
    hour: day ? hours[state.period.hourBranch] : null,
  };
}

function renderPeriodPicker(table, month, day, hours) {
  const monthIndex = table.months.indexOf(month);
  const nextMonth = table.months[monthIndex + 1];
  const jieRange = month.startTs != null
    ? `${month.name} ${formatDate(month.startTs)}${month.endTs != null ? ` 至 ${nextMonth ? `${nextMonth.name} ` : ''}${formatDate(month.endTs)}` : ''}`
    : '';
  return `
    <div class="period-picker">
      <div class="period-head"><b>流月</b><small>${table.year.year}年 · 按十二節</small></div>
      ${jieRange ? `<p class="period-jie">${jieRange}</p>` : ''}
      <div class="period-rail" data-rail="month" role="group" aria-label="選擇流月">
        ${table.months.map((mo, i) => `
          <button class="period-chip ${i === state.period.monthIndex ? 'is-active' : ''}" type="button" data-month="${i}" aria-pressed="${i === state.period.monthIndex}">
            <span class="p-name">${mo.name}</span>
            <strong><b class="${elClass(elementForStemChar(mo.stemChar))}">${mo.stemChar}</b><b class="${elClass(elementForBranchChar(mo.branchChar))}">${mo.branchChar}</b></strong>
          </button>`).join('')}
      </div>
      <div class="period-head"><b>流日</b><small>${month.name} · 共 ${month.days.length} 日</small></div>
      <div class="period-rail day-rail" data-rail="day" role="group" aria-label="選擇流日">
        ${month.days.map((dp, i) => `
          <button class="period-chip day-chip ${i === state.period.dayIndex ? 'is-active' : ''}" type="button" data-day="${i}" aria-pressed="${i === state.period.dayIndex}">
            <span class="p-name">${dp.m}/${dp.d}</span>
            <strong><b class="${elClass(elementForStemChar(dp.stemChar))}">${dp.stemChar}</b><b class="${elClass(elementForBranchChar(dp.branchChar))}">${dp.branchChar}</b></strong>
          </button>`).join('')}
      </div>
      ${day ? `
      <div class="period-head"><b>流時</b><small>${day.m}/${day.d} · 子時起算</small></div>
      <div class="period-rail hour-rail" data-rail="hour" role="group" aria-label="選擇流時">
        ${hours.map((h, i) => `
          <button class="period-chip hour-chip ${i === state.period.hourBranch ? 'is-active' : ''}" type="button" data-hour="${i}" aria-pressed="${i === state.period.hourBranch}">
            <span class="p-name">${BRANCHES[i]}時</span>
            <strong><b class="${elClass(elementForStemChar(h.stemChar))}">${h.stemChar}</b><b class="${elClass(elementForBranchChar(h.branchChar))}">${h.branchChar}</b></strong>
          </button>`).join('')}
      </div>` : ''}
    </div>
  `;
}

function renderLiunian(chart, step) {
  const nextAge = step.startAge + 10;
  const { table, month, day, hours } = resolvePeriod(chart, step);
  return `
    <div class="liunian-head">
      <div>
        <h3>${step.stemChar}${step.branchChar}運 <small>${step.tenGod}</small></h3>
        <p>${ageText(step.startAge)} 至 ${ageText(nextAge)} · ${step.startYear}–${step.startYear + 9}</p>
        <p class="liunian-dates">${step.startText} 至 ${step.endText}</p>
      </div>
      <div class="liunian-tools">
        <button class="chip-btn subtle" type="button" data-action="go-today">回今天</button>
        <label class="year-jump">跳至
          <select id="year-jump" aria-label="跳至流年">
            ${step.years.map((y) => `<option value="${y.year}" ${state.period.year === y.year ? 'selected' : ''}>${y.year} ${y.stemChar}${y.branchChar}</option>`).join('')}
          </select>
        </label>
      </div>
    </div>
    <div class="year-grid">
      ${step.years.map((y) => `
        <button class="year-cell ${y.isCurrent ? 'is-now' : ''} ${state.period.year === y.year ? 'is-selected' : ''}" type="button" data-year="${y.year}" aria-pressed="${state.period.year === y.year}">
          <span class="year-num">${y.year}${y.isCurrent ? '<i>今</i>' : ''}</span>
          <strong class="year-chars">
            <b class="${elClass(elementForStemChar(y.stemChar))}">${y.stemChar}</b><b class="${elClass(elementForBranchChar(y.branchChar))}">${y.branchChar}</b>
          </strong>
          <span class="year-god">${y.tenGod}</span>
        </button>`).join('')}
    </div>
    ${renderPeriodPicker(table, month, day, hours)}
  `;
}

const WATCH_PILLAR_KEYS = ['year', 'month', 'day', 'hour'];
const WATCH_PILLAR_LABELS = ['年柱', '月柱', '日柱', '時柱'];

function watchData(chart, step) {
  const { table, month, day, hour } = resolvePeriod(chart, step);
  const year = table.year;
  const natal = WATCH_PILLAR_KEYS
    .map((key, i) => {
      const pillar = chart.pillars[key];
      return pillar ? { stem: pillar.stem, branch: pillar.branch, source: WATCH_PILLAR_LABELS[i] } : null;
    })
    .filter(Boolean);
  const periods = [
    { stem: year.stem, branch: year.branch, source: '流年' },
    month ? { stem: month.stem, branch: month.branch, source: '流月' } : null,
    day ? { stem: day.stem, branch: day.branch, source: '流日' } : null,
    hour ? { stem: hour.stem, branch: hour.branch, source: '流時' } : null,
  ].filter(Boolean);
  const interactions = analyzeInteractions([
    ...natal,
    { stem: step.stem, branch: step.branch, source: '大運' },
    ...periods,
  ]);
  return { year, month, day, hour, interactions };
}

function renderWatch(chart, step) {
  const { year, month, day, hour, interactions } = watchData(chart, step);
  const items = (list, empty) => {
    if (!list.length) return `<span class="muted">${empty}</span>`;
    return list.map((item) => {
      const cls = item.kind === 'he' || item.kind === 'sanhe' || item.kind === 'anhe' ? '' : ' is-harm';
      return `<span class="watch-item${cls}" title="${esc(item.sources.join('、'))}">${item.text}</span>`;
    }).join('');
  };
  const stars = (list) => (list.length
    ? list.map((s) => termTag(s, `ss-tag${s === '空亡' || s === '年空' ? ' is-kong' : ''}`)).join('')
    : '<span class="muted">—</span>');
  const row = (label, sub, content, isStars = false) => `
    <div class="watch-row" role="row">
      <span class="watch-label" role="rowheader">${label}${sub ? `<small>${sub}</small>` : ''}</span>
      <div class="watch-value${isStars ? ' is-stars' : ''}" role="cell">${content}</div>
    </div>`;

  return `
    <div class="watch-table" role="table" aria-label="天干地支互動與各期神煞">
      ${row('天干留意', '', items(interactions.stems, '無合沖'))}
      ${row('地支留意', '', items(interactions.branches, '無沖合刑害'))}
      ${row('大運神煞', `${step.stemChar}${step.branchChar}`, stars(step.shensha), true)}
      ${row('流年神煞', `${year.stemChar}${year.branchChar} · ${year.year}`, stars(year.shensha), true)}
      ${month ? row('流月神煞', `${month.stemChar}${month.branchChar} · ${month.name}`, stars(month.shensha), true) : ''}
      ${day ? row('流日神煞', `${day.stemChar}${day.branchChar} · ${day.m}/${day.d}`, stars(day.shensha), true) : ''}
      ${hour ? row('流時神煞', `${hour.stemChar}${hour.branchChar} · ${BRANCHES[hour.branch]}時`, stars(hour.shensha), true) : ''}
    </div>
    <p class="watch-note">取四柱、大運、流年、流月、流日、流時。所選時點：${day && hour ? `${day.y}年${day.m}月${day.d}日 ${BRANCHES[hour.branch]}時（北京時間）` : '—'}。</p>
  `;
}

function renderPalace(label, palace, note) {
  if (!palace) {
    return `
      <div class="palace-item is-empty">
        <span class="palace-label">${label}</span>
        <strong class="palace-chars muted">—</strong>
        <small>時辰未知</small>
      </div>`;
  }
  return `
    <div class="palace-item">
      <span class="palace-label">${label}<i>${note}</i></span>
      <strong class="palace-chars">
        <b class="${elClass(elementForStemChar(palace.stemChar))}">${palace.stemChar}</b><b class="${elClass(elementForBranchChar(palace.branchChar))}">${palace.branchChar}</b>
      </strong>
      <small>${palace.tenGod} · ${palace.nayin}</small>
    </div>
  `;
}

function elementForStemChar(char) {
  return elementOfStem(STEMS.indexOf(char));
}

function elementForBranchChar(char) {
  return elementOfBranch(BRANCHES.indexOf(char));
}

function radarChart(elements) {
  const order = ['wood', 'fire', 'earth', 'metal', 'water'];
  const labels = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
  const values = Object.fromEntries(elements.map((e) => [e.key, e.percent]));
  const cx = 130;
  const cy = 120;
  const R = 78;
  const angle = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / 5;
  const pt = (i, r) => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r];
  const polygon = (r) => order.map((_, i) => pt(i, r).map((n) => n.toFixed(2)).join(',')).join(' ');
  const rings = [0.25, 0.5, 0.75, 1].map((level) => `<polygon points="${polygon(R * level)}" class="radar-grid"/>`).join('');
  const axes = order.map((_, i) => {
    const [x, y] = pt(i, R);
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" class="radar-axis"/>`;
  }).join('');
  const peak = Math.max(1, ...order.map((key) => values[key] || 0));
  const dataPoints = order.map((key, i) => {
    const value = Math.max(0, values[key] || 0);
    return pt(i, Math.max(R * 0.16, (R * value) / peak));
  });
  const dataPolygon = dataPoints.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const dots = dataPoints.map(([x, y]) => `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3.2" class="radar-dot"/>`).join('');
  const textLabels = order.map((key, i) => {
    const [x, y] = pt(i, R + 24);
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="radar-label ${elClass(key)}" text-anchor="middle" dominant-baseline="middle">${labels[key]}</text>`;
  }).join('');

  return `
    <svg class="radar" viewBox="0 0 260 250" role="img" aria-label="五行比例雷達圖">
      ${rings}${axes}
      <polygon points="${dataPolygon}" class="radar-area"/>
      ${dots}${textLabels}
    </svg>
  `;
}

function revealLuckCard(card) {
  if (!card) return;
  const rail = card.closest('.luck-rail');
  if (!rail) return;
  const railRect = rail.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  if (cardRect.left < railRect.left) {
    rail.scrollLeft += cardRect.left - railRect.left - 8;
  } else if (cardRect.right > railRect.right) {
    rail.scrollLeft += cardRect.right - railRect.right + 8;
  }
}

function bindPeriodSwipe(container) {
  let start = null;
  container.addEventListener('touchstart', (event) => {
    const rail = event.target.closest('[data-rail]');
    if (!rail || event.touches.length !== 1) {
      start = null;
      return;
    }
    start = { kind: rail.dataset.rail, x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });
  container.addEventListener('touchend', (event) => {
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const kind = start.kind;
    start = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    const rail = container.querySelector(`[data-rail="${kind}"]`);
    if (!rail) return;
    const items = [...rail.querySelectorAll('button')];
    const current = items.findIndex((btn) => btn.classList.contains('is-active'));
    if (current < 0) return;
    const next = (current + (dx < 0 ? 1 : -1) + items.length) % items.length;
    items[next].click();
  }, { passive: true });
}

function bindResultEvents() {
  const compactBtn = document.getElementById('compact-btn');
  if (compactBtn) {
    compactBtn.setAttribute('aria-pressed', String(state.compact));
  }
  const rail = document.querySelector('.luck-rail');
  revealLuckCard(rail?.querySelector('.luck-card.is-active'));
  const liunianBody = document.getElementById('liunian-body');
  if (liunianBody) {
    liunianBody.addEventListener('keydown', (event) => {
      const chip = event.target.closest('[data-month],[data-day],[data-hour]');
      if (!chip) return;
      const attr = chip.dataset.month != null ? 'data-month' : chip.dataset.day != null ? 'data-day' : 'data-hour';
      const chips = [...liunianBody.querySelectorAll(`[${attr}]`)];
      const current = chips.indexOf(chip);
      let next = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % chips.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + chips.length) % chips.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = chips.length - 1;
      if (next != null) {
        event.preventDefault();
        chips[next].click();
      }
    });
    liunianBody.addEventListener('change', (event) => {
      const jump = event.target.closest('#year-jump');
      if (!jump || !state.chart || !state.period) return;
      state.period = { ...state.period, year: Number(jump.value), monthIndex: null, dayIndex: null, hourBranch: null };
      refreshPeriod();
    });
    bindPeriodSwipe(liunianBody);
  }
  if (!rail) return;
  rail.addEventListener('keydown', (event) => {
    const card = event.target.closest('.luck-card');
    if (!card) return;
    const current = Number(card.dataset.luckIndex);
    const last = state.chart.luck.steps.length - 1;
    let next = null;
    if (event.key === 'ArrowRight') next = current === last ? 0 : current + 1;
    else if (event.key === 'ArrowLeft') next = current === 0 ? last : current - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next != null) {
      event.preventDefault();
      selectLuck(next, { focus: true });
    }
  });
}

function focusChip(selector) {
  requestAnimationFrame(() => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
}

function refreshPeriod() {
  const step = state.chart.luck.steps[state.selectedLuck];
  if (!step) return;
  const body = document.getElementById('liunian-body');
  if (body) {
    body.innerHTML = renderLiunian(state.chart, step);
    body.setAttribute('aria-labelledby', `luck-tab-${state.selectedLuck}`);
  }
  const watchBody = document.getElementById('watch-body');
  if (watchBody) watchBody.innerHTML = renderWatch(state.chart, step);
}

function applyLuck(index, options = {}) {
  state.selectedLuck = index;
  let activeCard = null;
  document.querySelectorAll('.luck-card').forEach((card) => {
    const active = Number(card.dataset.luckIndex) === index;
    card.classList.toggle('is-active', active);
    card.setAttribute('aria-selected', String(active));
    card.tabIndex = active ? 0 : -1;
    if (active) activeCard = card;
  });
  refreshPeriod();
  revealLuckCard(activeCard);
  if (options.focus) activeCard?.focus({ preventScroll: true });
}

function selectLuck(index, options = {}) {
  if (!state.chart || !state.chart.luck.steps[index]) return;
  state.period = null;
  applyLuck(index, options);
}

function goToday() {
  const chart = state.chart;
  if (!chart) return;
  const { year } = chart.current.year;
  const index = chart.luck.steps.findIndex((step) => step.years.some((y) => y.year === year));
  if (index < 0) {
    toast('今年不在所排大運範圍內');
    return;
  }
  state.period = { year, monthIndex: null, dayIndex: null, hourBranch: null };
  applyLuck(index);
  focusChip(`[data-year="${year}"]`);
}

// ---- Records ----

const PILLAR_LABELS = ['年', '月', '日', '時'];

function compareCandidates() {
  const list = loadRecords().map((record) => ({
    id: record.id,
    label: `${record.input.name || '未具名'} · ${compareDateText(record.input)}`,
    input: record.input,
  }));
  if (state.chart) {
    list.push({
      id: 'current',
      label: `當前排盤 · ${compareDateText(state.chart.input)}`,
      input: state.chart.input,
    });
  }
  return list;
}

function compareDateText(input) {
  if (input.calendar === 'lunar' && input.lunar) {
    return `${input.lunar.y}.${two(input.lunar.m)}.${two(input.lunar.d)}（農曆）`;
  }
  const s = input.solar || {};
  return `${s.y || '----'}.${two(s.m || 0)}.${two(s.d || 0)}`;
}

function compareAnalysis(chartA, chartB) {
  const items = [];
  [['A', chartA], ['B', chartB]].forEach(([key, chart]) => {
    chart.pillarList.forEach((pillar, i) => {
      items.push({ stem: pillar.stem, branch: pillar.branch, source: `${key}${PILLAR_LABELS[i]}` });
    });
  });
  const { stems, branches } = analyzeInteractions(items);
  const isCross = (item) => item.sources.some((s) => s.startsWith('A'))
    && item.sources.some((s) => s.startsWith('B'));
  return { stems: stems.filter(isCross), branches: branches.filter(isCross) };
}

function compareInteractionList(list, labels) {
  if (!list.length) return '<p class="compare-none">未見。</p>';
  return `<div class="compare-chips">${list.map((item) => {
    const harm = item.kind === 'he' || item.kind === 'sanhe' || item.kind === 'anhe' ? '' : ' is-harm';
    const from = item.sources
      .map((s) => `${labels[s[0]]}${s.slice(1)}`)
      .join('、');
    return `<span class="watch-item${harm}" title="${esc(from)}">${item.text}<small>${esc(from)}</small></span>`;
  }).join('')}</div>`;
}

function compareSelect(key, value, candidates) {
  return `<label class="compare-select"><span>${key === 'a' ? '盤一' : '盤二'}</span>
    <select data-compare="${key}">
      ${candidates.map((c) => `<option value="${esc(c.id)}" ${c.id === value ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}
    </select>
  </label>`;
}

function comparePanel(side, label, chart) {
  const solarText = `${chart.solarDate.y}.${two(chart.solarDate.m)}.${two(chart.solarDate.d)}`;
  const master = chart.dayMaster;
  return `
    <article class="compare-panel reveal" data-side="${side}">
      <header class="compare-panel-head">
        <span class="compare-side">${side === 'A' ? '盤一' : '盤二'}</span>
        <h2>${esc(label)}</h2>
        <p>${GENDER_LABEL[chart.input.gender]} · ${solarText} · ${esc(chart.lunarText)}</p>
      </header>
      <div class="compare-pillars">
        ${chart.pillarList.map((pillar, i) => `
          <div class="compare-pillar">
            <span class="pillar-label">${PILLAR_LABELS[i]}</span>
            <b class="${elClass(pillar.stemElement)}">${pillar.stemChar}</b>
            <b class="${elClass(pillar.branchElement)}">${pillar.branchChar}</b>
            <small>${pillar.nayin}</small>
          </div>`).join('')}
      </div>
      <p class="compare-master">日主 <b>${master.char}${master.elementLabel}</b> · ${master.strength} · 喜${master.favorable.map((f) => f.label).join('、')}</p>
    </article>`;
}

function renderCompare() {
  setAppHead('知命 · 雙盤合參', '比較兩組四柱的干支、十神與大運對應。');
  const candidates = compareCandidates();
  if (candidates.length < 2) {
    app.innerHTML = `
      <div class="wrap page">
        <header class="page-head reveal">
          <p class="eyebrow"><span class="eyebrow-line"></span>合參</p>
          <h1>雙盤合參</h1>
        </header>
        <div class="empty-state reveal">
          <span class="empty-seal">合</span>
          <h2>至少需要兩張命盤</h2>
          <p>先保存第二張命盤，或在排盤後直接回到這裡，就能把兩盤放在一起看天干地支的合沖刑害。</p>
          <a class="btn btn-primary" href="${linkFor('/')}">去排盤 ${icon('arrowRight', 16)}</a>
        </div>
      </div>`;
    return;
  }
  if (!candidates.some((c) => c.id === state.compare.a)) state.compare.a = candidates[0].id;
  if (!candidates.some((c) => c.id === state.compare.b) || state.compare.b === state.compare.a) {
    state.compare.b = candidates.find((c) => c.id !== state.compare.a).id;
  }
  const left = candidates.find((c) => c.id === state.compare.a);
  const right = candidates.find((c) => c.id === state.compare.b);
  let chartA;
  let chartB;
  try {
    chartA = computeChart(left.input);
    chartB = computeChart(right.input);
  } catch (err) {
    app.innerHTML = `<div class="wrap page"><p class="form-error">${esc(err.message || '命盤無法起局')}</p></div>`;
    return;
  }
  const labelA = left.input.name || '盤一';
  const labelB = right.input.name || '盤二';
  const { stems, branches } = compareAnalysis(chartA, chartB);

  app.innerHTML = `
    <div class="wrap page">
      <header class="page-head reveal">
        <p class="eyebrow"><span class="eyebrow-line"></span>合參</p>
        <h1>雙盤合參</h1>
        <p class="page-lede">並置兩張命盤，只看兩盤之間的合、沖、刑、害。各自盤內的互動，仍以單盤結果為準。</p>
      </header>
      <div class="compare-toolbar reveal">
        ${compareSelect('a', state.compare.a, candidates)}
        <span class="compare-vs" aria-hidden="true">合</span>
        ${compareSelect('b', state.compare.b, candidates)}
      </div>
      <div class="compare-grid">
        ${comparePanel('A', labelA, chartA)}
        ${comparePanel('B', labelB, chartB)}
      </div>
      <section class="card compare-card reveal">
        <h2>兩盤交會</h2>
        <div class="compare-block">
          <h3>天干</h3>
          ${compareInteractionList(stems, { A: labelA, B: labelB })}
        </div>
        <div class="compare-block">
          <h3>地支</h3>
          ${compareInteractionList(branches, { A: labelA, B: labelB })}
        </div>
        <p class="compare-note">合參只看兩盤之間的四柱作用；日主、格局、大運仍需回到各自命盤細看。</p>
      </section>
    </div>
  `;
  document.querySelectorAll('[data-compare]').forEach((select) => {
    select.addEventListener('change', () => {
      state.compare[select.dataset.compare] = select.value;
      renderCompare();
    });
  });
}

function collectRecordTags(records) {
  const counts = new Map();
  records.forEach((record) => {
    (record.tags || []).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }));
}

function collectRecordFolders(records) {
  const counts = new Map();
  records.forEach((record) => {
    const folder = record.folder || '';
    if (folder) counts.set(folder, (counts.get(folder) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'zh-Hant'))
    .map(([name, count]) => ({ name, count }));
}

function duplicateInfo(records) {
  const groups = new Map();
  records.forEach((record) => {
    const key = birthKey(record.input);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  });
  const counts = new Map();
  const ids = new Set();
  groups.forEach((list) => {
    if (list.length < 2) return;
    list.forEach((record) => {
      counts.set(record.id, list.length);
      ids.add(record.id);
    });
  });
  return { counts, ids };
}

function backupNoticeHtml(records) {
  if (!backupNoticeDue(records)) return '';
  const meta = loadBackupMeta();
  const last = Date.parse(meta.lastExport || '');
  const label = Number.isNaN(last)
    ? '尚未導出過備份'
    : `上次備份：${new Date(last).toLocaleDateString('zh-TW')}`;
  return `
    <div class="backup-notice reveal" id="backup-notice">
      <div>
        <strong>命例只存在這台裝置</strong>
        <p>${label}。清除瀏覽器資料或更換裝置都會讓命例消失，建議導出 JSON 備份。</p>
      </div>
      <div class="backup-actions">
        <button class="chip-btn" type="button" data-action="export-records">${icon('download', 15)} 導出備份</button>
        <button class="chip-btn subtle" type="button" data-action="dismiss-backup">稍後提醒</button>
      </div>
    </div>`;
}

function renderRecords() {
  setAppHead('知命 · 命例', '本機保存的命例、標籤與備註。');
  state.records = loadRecords();
  if (!state.records.length) {
    state.recordSelect = false;
    state.recordSelection = [];
    state.recordDupOnly = false;
  }
  state.recordSelection = state.recordSelection.filter((id) => state.records.some((record) => record.id === id));
  const tagList = collectRecordTags(state.records);
  const folders = collectRecordFolders(state.records);
  const duplicates = duplicateInfo(state.records);
  if (state.recordTag && !tagList.some(({ tag }) => tag === state.recordTag)) state.recordTag = '';
  if (state.recordFolder && state.recordFolder !== '__none__' && !folders.some(({ name }) => name === state.recordFolder)) {
    state.recordFolder = '';
  }
  if (state.recordDupOnly && !duplicates.ids.size) state.recordDupOnly = false;
  if (!RECORD_SORTS.has(state.recordSort)) state.recordSort = 'newest';
  const sorted = sortRecords(state.records, state.recordSort);
  const cards = sorted.map((record) => {
    let chart;
    try {
      chart = computeChart(record.input);
    } catch {
      return '';
    }
    const solarText = solarDateText(chart);
    const tags = record.tags || [];
    const folder = record.folder || '';
    const note = record.note || '';
    const selected = state.recordSelection.includes(record.id);
    const dupCount = duplicates.counts.get(record.id) || 0;
    const searchText = [
      record.input.name || '未具名',
      chart.solarDate.y, `${chart.solarDate.m}`.padStart(2, '0'), `${chart.solarDate.d}`.padStart(2, '0'),
      solarText, chart.lunarText, chart.fourPillarsText, chart.animal, chart.timeUnknown ? '時辰未知' : '',
      `${chart.dayMaster.char}${chart.dayMaster.elementLabel}`, chart.dayMaster.strength,
      tags.join(' '), folder, note,
    ].join(' ');
    return `
      <article class="record-card" data-record-id="${esc(record.id)}" data-search="${esc(searchText)}" data-tags="|${esc(tags.join('|'))}|" data-folder="${esc(folder)}" data-dup="${dupCount ? '1' : '0'}">
        <div class="record-head">
          <div>
            <h3>${esc(record.input.name || '未具名')} <small>${GENDER_LABEL[record.input.gender]}</small>${dupCount ? `<span class="dup-badge" title="${dupCount} 張命例的出生資料相同">重複 ${dupCount}</span>` : ''}</h3>
            <p>${solarText} · ${chart.lunarText}</p>
          </div>
          <div class="record-tools">
            ${state.recordSelect ? `<label class="record-check"><input type="checkbox" data-select-id="${esc(record.id)}" ${selected ? 'checked' : ''} aria-label="選取 ${esc(record.input.name || '未具名')}"></label>` : ''}
            <button class="icon-btn" type="button" data-action="edit-record" data-id="${esc(record.id)}" aria-label="編輯資料夾、標籤與備註">${icon('edit', 16)}</button>
            <button class="icon-btn danger" type="button" data-action="delete-record" data-id="${esc(record.id)}" aria-label="刪除命例">${icon('trash', 16)}</button>
          </div>
        </div>
        ${(folder || tags.length) ? `<div class="record-tag-row">
          ${folder ? `<span class="record-folder" title="資料夾">${icon('folder', 12)}${esc(folder)}</span>` : ''}
          ${tags.map((tag) => `<span class="tag-chip is-static">${esc(tag)}</span>`).join('')}
        </div>` : ''}
        <div class="record-pillars">
          ${chart.pillarList.map((p) => `<span><b class="${elClass(p.stemElement)}">${p.stemChar}</b><b class="${elClass(p.branchElement)}">${p.branchChar}</b></span>`).join('')}
        </div>
        ${note ? `<p class="record-note">${esc(note)}</p>` : ''}
        <div class="record-foot">
          <span>${chart.animal}年 · 日主${chart.dayMaster.char}${chart.dayMaster.elementLabel} · ${chart.dayMaster.strength}</span>
          <button class="record-open" type="button" data-action="open-record" data-id="${esc(record.id)}">打開命盤 ${icon('arrowRight', 14)}</button>
        </div>
        <form class="record-editor" data-editor-for="${esc(record.id)}" hidden>
          <label>資料夾 <input name="folder" type="text" maxlength="20" list="record-folders" value="${esc(folder)}" placeholder="選填，例如：家人"></label>
          <label>標籤 <input name="tags" type="text" maxlength="80" value="${esc(tags.join('、'))}" placeholder="家人、客戶、研究，以頓號分隔"></label>
          <label>備註 <textarea name="note" rows="2" maxlength="500" placeholder="選填，只存在本機">${esc(note)}</textarea></label>
          <div class="record-editor-actions">
            <button class="chip-btn subtle" type="button" data-action="cancel-record">取消</button>
            <button class="chip-btn" type="submit">保存</button>
          </div>
        </form>
      </article>
    `;
  }).join('');
  const hasRecords = state.records.length > 0;
  const unclassified = state.records.filter((record) => !record.folder).length;
  const sortOptions = RECORD_SORT_OPTIONS
    .map(([value, label]) => `<option value="${value}" ${state.recordSort === value ? 'selected' : ''}>${label}</option>`)
    .join('');
  const folderOptions = [
    `<option value="" ${state.recordFolder ? '' : 'selected'}>全部資料夾（${state.records.length}）</option>`,
    unclassified ? `<option value="__none__" ${state.recordFolder === '__none__' ? 'selected' : ''}>未分類（${unclassified}）</option>` : '',
    ...folders.map(({ name, count }) => `<option value="${esc(name)}" ${state.recordFolder === name ? 'selected' : ''}>${esc(name)}（${count}）</option>`),
  ].join('');
  const batchBar = state.recordSelect ? `
    <div class="batch-bar reveal" id="batch-bar">
      <div class="batch-head">
        <span id="batch-count" aria-live="polite">已選 ${state.recordSelection.length} 張</span>
        <button class="chip-btn subtle" type="button" data-action="select-visible">選取顯示中的命例</button>
        <button class="chip-btn subtle" type="button" data-action="clear-selection">清除選取</button>
      </div>
      <div class="batch-tools">
        <label class="batch-field"><span>資料夾</span>
          <input id="batch-folder" type="text" maxlength="20" placeholder="留空＝取消分類">
        </label>
        <button class="chip-btn subtle" type="button" data-action="batch-folder">移動</button>
        <label class="batch-field"><span>標籤</span>
          <input id="batch-tag" type="text" maxlength="80" placeholder="可多個，以頓號分隔">
        </label>
        <button class="chip-btn subtle" type="button" data-action="batch-tag">加入</button>
        <button class="chip-btn danger" type="button" data-action="batch-delete" data-confirm="0">刪除所選</button>
      </div>
    </div>` : '';

  app.innerHTML = `
    <div class="wrap page">
      <header class="page-head reveal">
        <p class="eyebrow"><span class="eyebrow-line"></span>命例</p>
        <h1>已存的命盤</h1>
        <p class="page-lede">命例只保存在當前瀏覽器中。清除站點數據或將瀏覽器記錄遷移，都會讓它們消失；可隨時導出 JSON 備份。</p>
      </header>
      ${backupNoticeHtml(state.records)}
      <div class="records-toolbar reveal">
        <div class="records-toolbar-main">
          <span id="record-count" aria-live="polite">共 ${state.records.length} 張命盤</span>
          ${hasRecords ? `<label class="record-search">
            <input id="record-search" type="search" value="${esc(state.recordQuery)}" placeholder="搜索姓名、資料夾、標籤、備註或四柱" aria-label="搜索命例" autocomplete="off">
          </label>` : ''}
          ${hasRecords ? `<div class="record-controls">
            <label class="record-control"><span>資料夾</span>
              <select id="record-folder-filter">${folderOptions}</select>
            </label>
            <label class="record-control"><span>排序</span>
              <select id="record-sort">${sortOptions}</select>
            </label>
            ${duplicates.ids.size ? `<button class="chip-btn subtle ${state.recordDupOnly ? 'is-on' : ''}" type="button" data-action="filter-dup">只看重複 ${duplicates.ids.size}</button>` : ''}
            <button class="chip-btn subtle ${state.recordSelect ? 'is-on' : ''}" type="button" data-action="toggle-select">${state.recordSelect ? '完成批次' : '批次管理'}</button>
          </div>` : ''}
        </div>
        <div class="records-toolbar-actions">
          ${hasRecords && state.records.length + (state.chart ? 1 : 0) >= 2 ? `<a class="chip-btn" href="${linkFor('/compare')}">${icon('spark', 15)} 雙盤合參</a>` : ''}
          <button class="chip-btn" type="button" data-action="import-records">${icon('upload', 15)} 導入 JSON</button>
          ${hasRecords ? `<button class="chip-btn" type="button" data-action="export-records">${icon('download', 15)} 導出 JSON</button>` : ''}
          <a class="chip-btn" href="${linkFor('/')}">${icon('plus', 15)} 新建排盤</a>
        </div>
      </div>
      ${hasRecords ? batchBar : ''}
      ${tagList.length ? `<div class="records-tags reveal" role="group" aria-label="按標籤篩選">
        <button class="tag-chip ${state.recordTag ? '' : 'is-active'}" type="button" data-action="filter-tag" data-tag="">全部</button>
        ${tagList.map(({ tag, count }) => `<button class="tag-chip ${state.recordTag === tag ? 'is-active' : ''}" type="button" data-action="filter-tag" data-tag="${esc(tag)}">${esc(tag)}<i>${count}</i></button>`).join('')}
      </div>` : ''}
      <input type="file" id="records-import" accept="application/json,.json" hidden>
      <datalist id="record-folders">${folders.map(({ name }) => `<option value="${esc(name)}"></option>`).join('')}</datalist>
      <p class="record-empty" id="record-empty" hidden>沒有匹配的命例。</p>
      ${hasRecords ? `<div class="record-grid">${cards}</div>` : `
        <div class="empty-state reveal">
          <span class="empty-seal">錄</span>
          <h2>還沒有存下的命盤</h2>
          <p>起一局盤，在結果頁點「保存」，它就會出現在這裡。也可以導入之前導出的 JSON 備份。</p>
          <a class="btn btn-primary" href="${linkFor('/')}">去排盤 ${icon('arrowRight', 16)}</a>
        </div>`}
    </div>
  `;
  bindRecordTools();
  filterRecords(state.recordQuery);
}

function saveRecordMeta(id) {
  const form = [...document.querySelectorAll('.record-editor')]
    .find((el) => el.dataset.editorFor === id);
  if (!form) return;
  const tags = [...new Set(
    form.querySelector('[name="tags"]').value
      .split(/[、,，\s]+/)
      .map((tag) => tag.trim())
      .filter(Boolean),
  )].slice(0, 6);
  const note = form.querySelector('[name="note"]').value.trim().slice(0, 500);
  const folder = form.querySelector('[name="folder"]').value.trim().slice(0, 20);
  state.records = loadRecords();
  const record = state.records.find((r) => r.id === id);
  if (!record) {
    toast('這條命例已不存在');
    return;
  }
  record.tags = tags;
  record.note = note;
  record.folder = folder;
  if (!persistRecords()) {
    toast('瀏覽器存儲不可用，未能保存');
    return;
  }
  renderRecords();
  toast('已更新命例');
}

function filterRecords(query) {
  state.recordQuery = query;
  const needle = query.trim().toLowerCase();
  const tag = state.recordTag;
  const folder = state.recordFolder;
  const dupOnly = state.recordDupOnly;
  let visible = 0;
  document.querySelectorAll('.record-card').forEach((card) => {
    const textHit = !needle || (card.dataset.search || '').toLowerCase().includes(needle);
    const tagHit = !tag || (card.dataset.tags || '').split('|').includes(tag);
    const cardFolder = card.dataset.folder || '';
    const folderHit = !folder || (folder === '__none__' ? !cardFolder : cardFolder === folder);
    const dupHit = !dupOnly || card.dataset.dup === '1';
    const hit = textHit && tagHit && folderHit && dupHit;
    card.hidden = !hit;
    if (hit) visible += 1;
  });
  const filtered = !!needle || !!tag || !!folder || dupOnly;
  const countEl = document.getElementById('record-count');
  if (countEl) {
    countEl.textContent = filtered
      ? `找到 ${visible} 張 / 共 ${state.records.length} 張`
      : `共 ${state.records.length} 張命盤`;
  }
  const emptyEl = document.getElementById('record-empty');
  if (emptyEl) emptyEl.hidden = !filtered || visible > 0;
}

function bindRecordTools() {
  const search = document.getElementById('record-search');
  if (search) {
    search.addEventListener('input', () => filterRecords(search.value));
    search.addEventListener('search', () => filterRecords(search.value));
    if (state.recordQuery) filterRecords(search.value);
  }
  document.querySelectorAll('.record-editor').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      saveRecordMeta(form.dataset.editorFor);
    });
  });
  const sort = document.getElementById('record-sort');
  if (sort) {
    sort.addEventListener('change', () => {
      state.recordSort = sort.value;
      saveRecordSort(sort.value);
      renderRecords();
    });
  }
  const folderFilter = document.getElementById('record-folder-filter');
  if (folderFilter) {
    folderFilter.addEventListener('change', () => {
      state.recordFolder = folderFilter.value;
      renderRecords();
    });
  }
  document.querySelectorAll('[data-select-id]').forEach((box) => {
    box.addEventListener('change', () => toggleRecordSelection(box.dataset.selectId));
  });
  const fileInput = document.getElementById('records-import');
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (file) importRecords(file);
    });
  }
}

function toggleRecordSelection(id) {
  const set = new Set(state.recordSelection);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  state.recordSelection = [...set];
  updateBatchCount();
}

function updateBatchCount() {
  const count = document.getElementById('batch-count');
  if (count) count.textContent = `已選 ${state.recordSelection.length} 張`;
  const del = document.querySelector('[data-action="batch-delete"]');
  if (del && del.dataset.confirm === '1') {
    del.dataset.confirm = '0';
    del.textContent = '刪除所選';
  }
}

function batchApply(updater, message) {
  if (!state.recordSelection.length) {
    toast('請先選擇命例');
    return;
  }
  const ids = new Set(state.recordSelection);
  state.records = loadRecords();
  let changed = 0;
  state.records.forEach((record) => {
    if (!ids.has(record.id)) return;
    updater(record);
    changed += 1;
  });
  if (!persistRecords()) {
    state.records = loadRecords();
    toast('儲存空間不足，未能更新');
    return;
  }
  state.recordSelection = [];
  renderRecords();
  toast(message(changed));
}

function batchMoveFolder() {
  const folder = (document.getElementById('batch-folder')?.value || '').trim().slice(0, 20);
  batchApply(
    (record) => { record.folder = folder; },
    (count) => (folder ? `已將 ${count} 張移至「${folder}」` : `已取消 ${count} 張的資料夾分類`),
  );
}

function batchAddTag() {
  const raw = document.getElementById('batch-tag')?.value || '';
  const tags = [...new Set(
    raw.split(/[、,，\s]+/).map((tag) => tag.trim()).filter(Boolean),
  )].slice(0, 6);
  if (!tags.length) {
    toast('請先輸入標籤');
    return;
  }
  batchApply(
    (record) => { record.tags = [...new Set([...(record.tags || []), ...tags])].slice(0, 6); },
    (count) => `已為 ${count} 張加入標籤`,
  );
}

function normalizeImportedInput(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const gender = raw.gender === 'female' ? 'female' : raw.gender === 'male' ? 'male' : null;
  if (!gender) return null;
  const calendar = raw.calendar === 'lunar' ? 'lunar' : 'solar';
  let time = null;
  if (raw.time) {
    const h = Number(raw.time.h);
    const min = Number(raw.time.min);
    if (!Number.isInteger(h) || h < 0 || h > 23 || !Number.isInteger(min) || min < 0 || min > 59) return null;
    time = { h, min };
  }
  let solar;
  let lunar;
  if (calendar === 'lunar') {
    const l = raw.lunar;
    if (!l) return null;
    const y = Number(l.y);
    const m = Number(l.m);
    const d = Number(l.d);
    if (![y, m, d].every(Number.isInteger) || y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 30) return null;
    try {
      solar = lunarToSolar(y, m, d, !!l.isLeap);
    } catch {
      return null;
    }
    if (solar.y < 1900 || solar.y > 2100) return null;
    lunar = { y, m, d, isLeap: !!l.isLeap };
  } else {
    const s = raw.solar;
    if (!s) return null;
    const y = Number(s.y);
    const m = Number(s.m);
    const d = Number(s.d);
    if (![y, m, d].every(Number.isInteger) || y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    solar = { y, m, d };
    try {
      lunar = solarToLunar(y, m, d);
      const back = lunarToSolar(lunar.year, lunar.month, lunar.day, lunar.isLeap);
      if (back.y !== y || back.m !== m || back.d !== d) return null;
    } catch {
      return null;
    }
  }
  const input = {
    name: typeof raw.name === 'string' ? raw.name.trim().slice(0, 20) : '',
    gender,
    calendar,
    solar,
    lunar,
    time,
    trueSolar: !!raw.trueSolar,
    city: typeof raw.city === 'string' && CITIES.some((c) => c.name === raw.city) ? raw.city : '北京',
    lateZi: raw.lateZi !== false,
    shareHideName: !!raw.shareHideName,
  };
  try {
    computeChart(input);
  } catch {
    return null;
  }
  return input;
}

async function importRecords(file) {
  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    toast('文件不是有效的 JSON');
    return;
  }
  const items = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.records) ? parsed.records : null);
  if (!items) {
    toast('文件裏沒有命例數組');
    return;
  }
  if (items.length > 500) {
    toast('一次最多導入 500 條命例');
    return;
  }
  state.records = loadRecords();
  const seen = new Set(state.records.map((record) => record.id));
  const additions = [];
  let skipped = 0;
  let sameBirth = 0;
  for (const item of items) {
    const input = normalizeImportedInput(item?.input ?? item);
    if (!input) {
      skipped += 1;
      continue;
    }
    const id = inputSignature(input);
    if (seen.has(id)) {
      skipped += 1;
      continue;
    }
    seen.add(id);
    const stamp = typeof item?.createdAt === 'string' && !Number.isNaN(Date.parse(item.createdAt))
      ? new Date(item.createdAt).toISOString()
      : new Date().toISOString();
    const meta = upgradeRecord({ input, tags: item?.tags, note: item?.note, folder: item?.folder });
    const key = birthKey(input);
    if (state.records.some((record) => birthKey(record.input) === key)
      || additions.some((record) => birthKey(record.input) === key)) {
      sameBirth += 1;
    }
    additions.push({ id, input, createdAt: stamp, tags: meta.tags, note: meta.note, folder: meta.folder });
  }
  if (!additions.length) {
    toast(`沒有新增命例${skipped ? `，跳過 ${skipped} 條` : ''}`);
    return;
  }
  state.records = [...additions, ...state.records];
  if (state.records.length > MAX_RECORDS) {
    state.records = loadRecords();
    toast(`命例最多 ${MAX_RECORDS} 張，請先匯出備份並整理`);
    return;
  }
  if (!persistRecords()) {
    state.records = loadRecords();
    toast('儲存空間不足，未能導入；請先匯出備份');
    return;
  }
  state.recordQuery = '';
  renderRecords();
  toast(`已導入 ${additions.length} 張命例${skipped ? `，跳過 ${skipped} 條` : ''}${sameBirth ? `，其中 ${sameBirth} 張出生資料重複` : ''}`);
}

// ---- Page rendering ----

const pageContext = () => ({ link: linkFor, root: BASE });

// pages.js holds the only copy of this markup, so the prerendered HTML and the
// client-rendered view of a content page cannot drift apart.
function renderPage(page) {
  app.innerHTML = page.build(page.path === '/' ? homeContext() : pageContext());
  if (page.path === '/') {
    initHomeForm();
    return;
  }
  const reminderCard = page.path === '/about' ? app.querySelector('[data-reminder-card]') : null;
  if (reminderCard && isNative()) {
    reminderCard.hidden = false;
    bindReminderSettings();
  }
}

// ---- Solar-term reminders ----

const REMINDERS = { firstId: 260000, slots: 24, horizon: 12 };

function loadReminderPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE.reminders) || '{}');
    return { solarTerms: !!raw.solarTerms };
  } catch {
    return { solarTerms: false };
  }
}

function saveReminderPrefs(prefs) {
  try {
    localStorage.setItem(STORAGE.reminders, JSON.stringify(prefs));
  } catch {
    // Storage may be full; the toggle simply will not persist.
  }
}

function upcomingSolarTerms(count = REMINDERS.horizon) {
  const now = Date.now() + 8 * 3600000;
  const startYear = new Date(now).getUTCFullYear();
  const list = [];
  for (let year = startYear; year <= startYear + 2; year++) {
    for (let index = 0; index < 24; index++) {
      const ts = getSolarTermTs(year, index);
      if (ts != null && ts > now + 60000) list.push({ ts, index, name: getSolarTermName(index) });
    }
  }
  list.sort((a, b) => a.ts - b.ts);
  return list.slice(0, count);
}

function reminderIdList() {
  return Array.from({ length: REMINDERS.slots }, (_, i) => REMINDERS.firstId + i);
}

function solarTermText(term) {
  const when = formatDate(term.ts);
  if (term.index === 2) return `${when} 立春，年、月柱自此更新。`;
  if (JIE_MAP.some(([index]) => index === term.index)) return `${when} 交節，月柱自此更新。`;
  return `${when} 交氣，時序過半。`;
}

function solarTermNotifications() {
  // Term timestamps hold Beijing wall clock in UTC, so shift by -8h for the real instant.
  return upcomingSolarTerms().map((term, i) => ({
    id: REMINDERS.firstId + i,
    title: `節氣 · ${term.name}`,
    body: solarTermText(term),
    schedule: { at: new Date(term.ts - 8 * 3600000) },
  }));
}

async function syncSolarTermReminders({ ask = false } = {}) {
  if (!isNative()) return false;
  if (!loadReminderPrefs().solarTerms) {
    await cancelNotifications(reminderIdList());
    return false;
  }
  const granted = ask
    ? await requestNotificationPermission()
    : (await notificationPermission()) === 'granted';
  if (!granted) return false;
  await cancelNotifications(reminderIdList());
  return scheduleNotifications(solarTermNotifications());
}

function bindReminderSettings() {
  const toggle = document.getElementById('solar-reminder');
  if (!toggle) return;
  const note = document.getElementById('solar-reminder-note');
  const prefs = loadReminderPrefs();
  const setNote = (text) => {
    if (note) note.textContent = text;
  };
  toggle.checked = prefs.solarTerms;
  if (prefs.solarTerms) setNote(`已排定接下來 ${upcomingSolarTerms().length} 個節氣提醒。`);
  toggle.addEventListener('change', async () => {
    haptic('MEDIUM');
    prefs.solarTerms = toggle.checked;
    saveReminderPrefs(prefs);
    if (!prefs.solarTerms) {
      await cancelNotifications(reminderIdList());
      setNote('已關閉節氣提醒。');
      toast('已關閉節氣提醒');
      return;
    }
    const ok = await syncSolarTermReminders({ ask: true });
    if (!ok) {
      toggle.checked = false;
      prefs.solarTerms = false;
      saveReminderPrefs(prefs);
      setNote('未取得通知權限，可到系統設定允許通知後再試。');
      toast('未取得通知權限');
      return;
    }
    setNote(`已排定接下來 ${upcomingSolarTerms().length} 個節氣提醒。`);
    toast('已開啟節氣提醒');
  });
}

// ---- Actions ----

function chartToText(chart, options = {}) {
  const lines = [];
  lines.push(`知命 · 四柱排盤`);
  const displayName = options.hideName ? '未具名' : chart.input.name || '未具名';
  lines.push(`${displayName} ${GENDER_LABEL[chart.input.gender]}命`);
  lines.push(`公曆：${solarDateText(chart)}`);
  lines.push(`農曆：${chart.lunarText}`);
  lines.push(`四柱：${chart.fourPillarsText}`);
  lines.push(`日主：${chart.dayMaster.char}${chart.dayMaster.elementLabel} · ${chart.dayMaster.strength}`);
  lines.push(`格局：${chart.structure.primary.name}（取格把握 ${chart.structure.primary.confidenceText}）`);
  lines.push(`用神：${chart.structure.useful.primary.label} · ${chart.structure.useful.primary.methods.join('、')}（把握 ${chart.structure.useful.primary.confidenceText}）`);
  lines.push(`大運：${chart.luck.directionLabel}，${chart.luck.startLabel}起運，${chart.luck.jiaoyunText}交運`);
  const step = chart.luck.steps[state.selectedLuck] || chart.luck.steps[0];
  const watch = watchData(chart, step);
  const joinWatch = (list, empty) => (list.length ? list.map((item) => item.text).join('；') : empty);
  lines.push(`天干留意：${joinWatch(watch.interactions.stems, '無合沖')}`);
  lines.push(`地支留意：${joinWatch(watch.interactions.branches, '無沖合刑害')}`);
  lines.push(`大運神煞（${step.stemChar}${step.branchChar}）：${step.shensha.join('、') || '無'}`);
  lines.push(`流年神煞（${watch.year.stemChar}${watch.year.branchChar} ${watch.year.year}）：${watch.year.shensha.join('、') || '無'}`);
  if (watch.isCurrentStep) {
    lines.push(`流月神煞（${watch.current.month.stemChar}${watch.current.month.branchChar}）：${watch.current.month.shensha.join('、') || '無'}`);
    lines.push(`流日神煞（${watch.current.day.stemChar}${watch.current.day.branchChar}）：${watch.current.day.shensha.join('、') || '無'}`);
  }
  chart.pillarList.forEach((p, i) => {
    const label = ['年柱', '月柱', '日柱', '時柱'][i];
    lines.push(`${label}：${p.stemChar}${p.branchChar} · ${p.tenGod} · ${p.nayin} · ${p.stage}${p.shensha.length ? ` · ${p.shensha.join('、')}` : ''}`);
  });
  lines.push(`五行：${chart.elements.map((e) => `${e.label}${e.percent}%`).join(' ')}`);
  lines.push(`說明：五行比例與喜用僅為參考，不作命斷。`);
  return lines.join('\n');
}

function saveCurrent() {
  if (!state.chart) return;
  const input = state.chart.input;
  const id = inputSignature(input);
  state.records = loadRecords();
  if (state.records.some((r) => r.id === id)) {
    toast('這張命盤已在命例中');
    return;
  }
  if (state.records.length >= MAX_RECORDS) {
    toast(`命例已達 ${MAX_RECORDS} 張，請先匯出備份並刪除部分`);
    return;
  }
  const key = birthKey(input);
  const twin = state.records.find((record) => birthKey(record.input) === key);
  state.records.unshift({
    id,
    input,
    createdAt: new Date().toISOString(),
    tags: [],
    note: '',
    folder: '',
  });
  if (!persistRecords()) {
    state.records = loadRecords();
    toast('儲存空間不足，未能保存；請先匯出備份');
    return;
  }
  haptic('MEDIUM');
  toast(twin
    ? `已保存；與「${twin.input.name || '未具名'}」出生資料相同`
    : '已保存到命例');
}

async function shareCurrent() {
  if (!state.chart) return;
  const hide = !!state.chart.input.shareHideName;
  if (isNative()) {
    const ok = await shareNative({
      title: '知命 · 四柱排盤',
      text: chartToText(state.chart, { hideName: hide }),
    });
    if (ok) {
      haptic('LIGHT');
      toast('已開啟分享');
    } else {
      toast('未能開啟分享');
    }
    return;
  }
  const input = hide ? { ...state.chart.input, name: '' } : state.chart.input;
  const payload = encodeInput({ v: 2, input, view: viewFromState() });
  const url = `${location.origin}${BASE}#/view/${payload}`;
  copyText(url, hide ? '已複製分享鏈接（不含姓名）' : '已複製分享鏈接');
}

function copyCurrent() {
  if (!state.chart) return;
  const hide = !!state.chart.input.shareHideName;
  copyText(chartToText(state.chart, { hideName: hide }), hide ? '已複製（不含姓名）' : '已複製到剪貼板');
}

const ELEMENT_INK = {
  wood: '#4c7350',
  fire: '#a63d30',
  earth: '#8a6a42',
  metal: '#6d675b',
  water: '#3d5f78',
};

function exportChartImage() {
  const chart = state.chart;
  if (!chart) return;
  const step = chart.luck.steps[state.selectedLuck] || chart.luck.steps[0];
  const watch = watchData(chart, step);
  const name = chart.input.shareHideName ? '未具名' : chart.input.name || '未具名';
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1180;
  const ctx = canvas.getContext('2d');
  const serif = '"Songti TC", "Noto Serif TC", "STSong", serif';
  const sans = '"PingFang TC", "Noto Sans TC", sans-serif';
  ctx.fillStyle = '#f4efe4';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#d8ccb6';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);

  ctx.fillStyle = '#2b2520';
  ctx.font = `600 44px ${serif}`;
  ctx.fillText('知命', 76, 112);
  ctx.font = `16px ${sans}`;
  ctx.fillStyle = '#8a7f72';
  ctx.fillText('四柱八字 · 本地排盤', 76, 142);

  ctx.fillStyle = '#2b2520';
  ctx.font = `600 30px ${serif}`;
  ctx.fillText(name, 76, 214);
  const nameWidth = ctx.measureText(name).width;
  ctx.font = `16px ${sans}`;
  ctx.fillStyle = '#5c534a';
  ctx.fillText(`${GENDER_LABEL[chart.input.gender]}命`, 76 + nameWidth + 14, 214);
  ctx.fillText(`公曆 ${solarDateText(chart)}`, 76, 248);
  ctx.fillText(`農曆 ${chart.lunarText}`, 76, 276);

  const labels = ['年柱', '月柱', '日柱', '時柱'];
  const keys = ['year', 'month', 'day', 'hour'];
  const colWidth = 188;
  const startX = 76;
  const top = 320;
  ctx.strokeStyle = '#ded3bf';
  ctx.lineWidth = 1;
  ctx.strokeRect(startX, top, colWidth * 4, 300);
  keys.forEach((key, i) => {
    const x = startX + colWidth * i + colWidth / 2;
    const pillar = chart.pillars[key];
    ctx.fillStyle = '#8a7f72';
    ctx.font = `16px ${serif}`;
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x, top + 36);
    if (pillar) {
      ctx.fillStyle = ELEMENT_INK[elementOfStem(pillar.stem)] || '#2b2520';
      ctx.font = `600 76px ${serif}`;
      ctx.fillText(pillar.stemChar, x, top + 128);
      ctx.fillStyle = ELEMENT_INK[elementOfBranch(pillar.branch)] || '#2b2520';
      ctx.fillText(pillar.branchChar, x, top + 210);
      ctx.fillStyle = '#5c534a';
      ctx.font = `15px ${sans}`;
      ctx.fillText(pillar.tenGod, x, top + 248);
      ctx.fillStyle = '#8a7f72';
      ctx.font = `13px ${sans}`;
      ctx.fillText(pillar.nayin, x, top + 274);
    } else {
      ctx.fillStyle = '#8a7f72';
      ctx.font = `600 60px ${serif}`;
      ctx.fillText('—', x, top + 160);
    }
    if (i > 0) {
      ctx.strokeStyle = '#e7ddcb';
      ctx.beginPath();
      ctx.moveTo(startX + colWidth * i, top);
      ctx.lineTo(startX + colWidth * i, top + 300);
      ctx.stroke();
    }
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = '#2b2520';
  ctx.font = `600 20px ${serif}`;
  ctx.fillText(`日主 ${chart.dayMaster.char}${chart.dayMaster.elementLabel} · ${chart.dayMaster.strength}`, 76, 678);
  ctx.font = `16px ${sans}`;
  ctx.fillStyle = '#5c534a';
  ctx.fillText(`五行：${chart.elements.map((e) => `${e.label}${e.percent}%`).join('　')}`, 76, 710);
  ctx.fillText(`大運：${chart.luck.directionLabel} · ${chart.luck.startLabel}起運 · ${chart.luck.jiaoyunText}交運`, 76, 742);
  ctx.fillText(`運程：${step.startText} 至 ${step.endText}（${step.stemChar}${step.branchChar} ${step.tenGod}）`, 76, 774);
  ctx.fillText(`格局：${chart.structure.primary.name}（${chart.structure.primary.confidenceText}）· 用神：${chart.structure.useful.primary.label}（${chart.structure.useful.primary.methods.join('、')}）`, 76, 806);

  ctx.fillStyle = '#2b2520';
  ctx.font = `600 18px ${serif}`;
  ctx.fillText('所選時點', 76, 828);
  ctx.font = `15px ${sans}`;
  ctx.fillStyle = '#5c534a';
  const periodText = watch.day && watch.hour
    ? `${watch.day.y}年${watch.day.m}月${watch.day.d}日 ${BRANCHES[watch.hour.branch]}時（${watch.hour.stemChar}${watch.hour.branchChar}）`
    : '—';
  ctx.fillText(periodText, 76, 856);
  const join = (list, empty) => (list.length ? list.map((item) => item.text).join('；') : empty);
  const drawParagraph = (text, x, y, lineHeight) => {
    let line = '';
    for (const ch of Array.from(text)) {
      if (line && ctx.measureText(line + ch).width > canvas.width - x - 76) {
        ctx.fillText(line, x, y);
        line = ch;
        y += lineHeight;
      } else {
        line += ch;
      }
    }
    if (line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
    }
    return y;
  };
  let notesY = drawParagraph(`天干留意：${join(watch.interactions.stems, '無合沖')}`, 76, 884, 22);
  drawParagraph(`地支留意：${join(watch.interactions.branches, '無沖合刑害')}`, 76, notesY, 22);

  ctx.fillStyle = '#8a7f72';
  ctx.font = `13px ${sans}`;
  ctx.fillText('五行比例、調候與喜用僅為傳統術數的通俗參考，不構成任何現實決策建議。', 76, 1116);

  canvas.toBlob((blob) => {
    if (!blob) {
      toast('圖片生成失敗');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const now = new Date();
    a.href = url;
    a.download = `知命-${name}-${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('命盤圖片已生成');
  }, 'image/png');
}

function printCompact() {
  document.body.classList.add('print-compact');
  const done = () => {
    document.body.classList.remove('print-compact');
    window.removeEventListener('afterprint', done);
  };
  window.addEventListener('afterprint', done);
  setTimeout(() => window.print(), 60);
  setTimeout(done, 4000);
}

function editCurrent() {
  if (!state.chart) return;
  state.formInput = state.chart.input;
  navigate('/');
}

function exportRecords() {
  state.records = loadRecords();
  const blob = new Blob([JSON.stringify(state.records, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  a.href = url;
  a.download = `知命-命例-${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  const meta = loadBackupMeta();
  saveBackupMeta({ ...meta, lastExport: new Date().toISOString(), dismissedAt: '' });
  toast('命例已導出');
}

function openRecord(id) {
  state.records = loadRecords();
  const record = state.records.find((r) => r.id === id);
  if (!record) {
    toast('這條命例已不存在');
    return;
  }
  try {
    const chart = computeChart(record.input);
    state.chart = chart;
    state.formInput = record.input;
    state.selectedLuck = defaultLuckIndex(chart);
    state.period = null;
    navigate('/chart');
  } catch (err) {
    toast(err.message || '命例無法起盤');
  }
}

function deleteRecord(id, button) {
  state.records = loadRecords();
  const record = state.records.find((r) => r.id === id);
  if (!record) return;
  if (button?.dataset.confirm === '1') {
    state.records = state.records.filter((r) => r.id !== id);
    persistRecords();
    renderRecords();
    toast('命例已刪除');
    return;
  }
  if (button) {
    button.dataset.confirm = '1';
    button.classList.add('is-confirm');
    const original = button.innerHTML;
    button.innerHTML = icon('check', 16);
    button.setAttribute('aria-label', '再次點擊確認刪除');
    setTimeout(() => {
      if (!button.isConnected) return;
      button.dataset.confirm = '0';
      button.classList.remove('is-confirm');
      button.innerHTML = original;
      button.setAttribute('aria-label', '刪除命例');
    }, 2600);
  }
}

function handleAction(action, target) {
  switch (action) {
    case 'theme': toggleTheme(); break;
    case 'sample': fillForm(SAMPLE_INPUT); break;
    case 'fill-today': fillToday(); break;
    case 'save': saveCurrent(); break;
    case 'share': shareCurrent(); break;
    case 'copy': copyCurrent(); break;
    case 'print': window.print(); break;
    case 'print-compact': printCompact(); break;
    case 'png': exportChartImage(); break;
    case 'go-today': goToday(); break;
    case 'edit': editCurrent(); break;
    case 'dismiss-backup': {
      const meta = loadBackupMeta();
      saveBackupMeta({ ...meta, dismissedAt: new Date().toISOString() });
      document.getElementById('backup-notice')?.remove();
      break;
    }
    case 'compact': {
      state.compact = !state.compact;
      const card = document.querySelector('.chart-card');
      if (card) card.classList.toggle('is-compact', state.compact);
      if (target) target.textContent = state.compact ? '展開詳盤' : '切換簡盤';
      break;
    }
    case 'export-records': exportRecords(); break;
    case 'import-records': document.getElementById('records-import')?.click(); break;
    case 'open-record': openRecord(target.dataset.id); break;
    case 'delete-record': deleteRecord(target.dataset.id, target); break;
    case 'edit-record': {
      const form = target.closest('.record-card')?.querySelector('.record-editor');
      if (!form) break;
      const opening = form.hidden;
      document.querySelectorAll('.record-editor').forEach((el) => { el.hidden = true; });
      form.hidden = !opening;
      if (opening) form.querySelector('[name="tags"]')?.focus();
      break;
    }
    case 'cancel-record': {
      const form = target.closest('.record-editor');
      if (form) form.hidden = true;
      break;
    }
    case 'filter-tag': {
      state.recordTag = target.dataset.tag || '';
      renderRecords();
      break;
    }
    case 'filter-dup': {
      state.recordDupOnly = !state.recordDupOnly;
      renderRecords();
      break;
    }
    case 'toggle-select': {
      state.recordSelect = !state.recordSelect;
      if (!state.recordSelect) state.recordSelection = [];
      renderRecords();
      break;
    }
    case 'select-visible': {
      const ids = [...document.querySelectorAll('.record-card:not([hidden])')].map((card) => card.dataset.recordId);
      const set = new Set(state.recordSelection);
      const allSelected = ids.length > 0 && ids.every((id) => set.has(id));
      ids.forEach((id) => {
        if (allSelected) set.delete(id);
        else set.add(id);
      });
      state.recordSelection = [...set];
      renderRecords();
      break;
    }
    case 'clear-selection': {
      state.recordSelection = [];
      renderRecords();
      break;
    }
    case 'batch-folder': batchMoveFolder(); break;
    case 'batch-tag': batchAddTag(); break;
    case 'batch-delete': {
      if (!state.recordSelection.length) {
        toast('請先選擇命例');
        break;
      }
      if (target.dataset.confirm !== '1') {
        target.dataset.confirm = '1';
        target.textContent = `確認刪除 ${state.recordSelection.length} 張`;
        setTimeout(() => {
          if (target.isConnected && target.dataset.confirm === '1') {
            target.dataset.confirm = '0';
            target.textContent = '刪除所選';
          }
        }, 3000);
        break;
      }
      const ids = new Set(state.recordSelection);
      state.records = loadRecords().filter((record) => !ids.has(record.id));
      if (!persistRecords()) {
        state.records = loadRecords();
        toast('儲存空間不足，未能刪除');
        break;
      }
      state.recordSelection = [];
      renderRecords();
      toast(`已刪除 ${ids.size} 張命例`);
      break;
    }
    default: break;
  }
}

document.addEventListener('click', (event) => {
  const skipLink = event.target.closest('.skip-link');
  if (skipLink) {
    event.preventDefault();
    app.focus();
    return;
  }
  const termEl = event.target.closest('[data-term]');
  if (termEl) {
    event.preventDefault();
    openTerm(termEl.dataset.term, termEl);
    return;
  }
  const popEl = document.getElementById('term-pop');
  if (popEl && !popEl.hidden) {
    if (event.target.closest('.term-pop-close')) {
      event.preventDefault();
      closeTerm(true);
      return;
    }
    if (!event.target.closest('#term-pop')) closeTerm();
  }
  const actionEl = event.target.closest('[data-action]');
  if (actionEl) {
    if (actionEl.dataset.action === 'delete-record') event.stopPropagation();
    handleAction(actionEl.dataset.action, actionEl);
  }
  const luckEl = event.target.closest('[data-luck-index]');
  if (luckEl) {
    selectLuck(Number(luckEl.dataset.luckIndex));
    return;
  }
  const yearEl = event.target.closest('[data-year]');
  if (yearEl && state.chart) {
    state.period = { ...state.period, year: Number(yearEl.dataset.year), monthIndex: null, dayIndex: null, hourBranch: null };
    refreshPeriod();
    focusChip(`[data-year="${state.period.year}"]`);
    return;
  }
  const monthEl = event.target.closest('[data-month]');
  if (monthEl && state.chart && state.period) {
    state.period = { ...state.period, monthIndex: Number(monthEl.dataset.month), dayIndex: null, hourBranch: null };
    refreshPeriod();
    focusChip(`[data-month="${state.period.monthIndex}"]`);
    return;
  }
  const dayEl = event.target.closest('[data-day]');
  if (dayEl && state.chart && state.period) {
    state.period = { ...state.period, dayIndex: Number(dayEl.dataset.day), hourBranch: null };
    refreshPeriod();
    focusChip(`[data-day="${state.period.dayIndex}"]`);
    return;
  }
  const hourEl = event.target.closest('[data-hour]');
  if (hourEl && state.chart && state.period) {
    state.period = { ...state.period, hourBranch: Number(hourEl.dataset.hour) };
    refreshPeriod();
    focusChip(`[data-hour="${state.period.hourBranch}"]`);
    return;
  }
  const recordCard = event.target.closest('.record-card');
  if (recordCard && !event.target.closest('button, input, textarea, label, form')) {
    if (state.recordSelect) {
      const id = recordCard.dataset.recordId;
      toggleRecordSelection(id);
      const box = recordCard.querySelector('[data-select-id]');
      if (box) box.checked = state.recordSelection.includes(id);
    } else {
      openRecord(recordCard.dataset.recordId);
    }
  }
});

window.addEventListener('hashchange', () => route({ focus: true }));
window.addEventListener('popstate', () => route({ focus: true }));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !document.getElementById('term-pop')?.hidden) {
    event.preventDefault();
    closeTerm(true);
  }
});

window.addEventListener('scroll', () => closeTerm(), { passive: true });
window.addEventListener('resize', () => closeTerm());

// ---- Boot ----

initTheme();
state.records = loadRecords();
state.recordSort = loadRecordSort();
document.querySelectorAll('[data-route]').forEach((a) => { a.href = linkFor(a.dataset.route); });
// Old bookmarks and share links carry #/learn/…; move them onto the indexable path form.
if (isHosted() && location.hash.length > 1 && PATH_ROUTES.has(currentPath())) {
  history.replaceState({}, '', linkFor(currentPath()));
}
route();
syncSolarTermReminders().catch(() => {});

function setupServiceWorker() {
  if (window.Capacitor?.isNativePlatform?.()) return;
  if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;
  const banner = document.getElementById('update-banner');
  const reloadBtn = banner?.querySelector('[data-update-action="reload"]');
  const laterBtn = banner?.querySelector('[data-update-action="later"]');
  let waiting = null;
  let reloading = false;
  let lastCheck = Date.now();

  const prompt = (worker) => {
    waiting = worker;
    if (banner) banner.hidden = false;
  };

  reloadBtn?.addEventListener('click', () => {
    if (!waiting) {
      location.reload();
      return;
    }
    reloading = true;
    waiting.postMessage({ type: 'SKIP_WAITING' });
  });

  laterBtn?.addEventListener('click', () => {
    if (banner) banner.hidden = true;
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) location.reload();
  });

  window.addEventListener('load', async () => {
    let registration;
    try {
      registration = await navigator.serviceWorker.register(`${BASE}sw.js`, { scope: BASE });
    } catch {
      return;
    }
    if (registration.waiting) prompt(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) prompt(worker);
      });
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastCheck < 30 * 60 * 1000) return;
      lastCheck = Date.now();
      registration.update().catch(() => {});
    });
  });
}

setupServiceWorker();
