import {
  STEMS, BRANCHES, ELEMENT_LABEL, ANIMALS, CITIES,
  LUNAR_DAYS, GENDER_LABEL,
} from './data.js?v=20261135';
import {
  computeChart, todayOverview, beijingNowParts, elementOfStem, elementOfBranch,
  analyzeInteractions, periodTable, hourPeriod,
} from './bazi.js?v=20261135';
import {
  lunarMonthList, lunarToSolar, solarToLunar, formatLunar, lunarYearLabel,
} from './astro.js?v=20261135';
import { ARTICLES } from './learn.js?v=20261135';
import { GLOSSARY } from './glossary.js?v=20261135';

const STORAGE = {
  records: 'zhiming.records.v2',
  lastInput: 'zhiming.lastInput.v2',
  theme: 'zhiming.theme.v1',
};

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
};

const app = document.getElementById('app');

const ICONS = {
  arrowLeft: '<path d="M15 18l-6-6 6-6"/>',
  arrowRight: '<path d="M9 18l6-6-6-6"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/>',
  print: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 8l5-5 5 5"/><path d="M12 3v12"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
  bookmark: '<path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/>',
  check: '<path d="m20 6-11 11-5-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
};

function icon(name, size = 18) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

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
    ${article ? `<a class="term-more" href="#article-${article.id}">學堂：${esc(article.title)} ${icon('arrowRight', 12)}</a>` : ''}
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

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('已複製到剪貼板');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      toast('已複製到剪貼板');
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

function loadRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE.records) || '[]');
    return Array.isArray(parsed) ? parsed : [];
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

function navigate(hash) {
  if (location.hash === hash) {
    route();
  } else {
    location.hash = hash;
  }
}

function route(options = {}) {
  const hash = location.hash || '#/';
  const path = hash.slice(1) || '/';
  closeTerm();
  updateNav(path);
  window.scrollTo({ top: 0 });
  if (path === '/' || path === '') {
    renderHome();
  } else if (path === '/chart') {
    renderChartPage();
  } else if (path.startsWith('/view/')) {
    renderShared(path.slice('/view/'.length));
  } else if (path === '/records') {
    renderRecords();
  } else if (path === '/learn') {
    renderLearn();
  } else if (path.startsWith('article-')) {
    renderLearn();
    requestAnimationFrame(() => openArticle(path));
    return;
  } else if (path === '/about') {
    renderAbout();
  } else {
    renderError('這個地址沒有對應的頁面，可能是舊鏈接，或輸入有誤。', '頁面不存在', '頁面不存在');
  }
  if (options.focus) app.focus({ preventScroll: true });
}

function updateNav(path) {
  const key = path.startsWith('/records') ? 'records'
    : path.startsWith('/learn') || path.startsWith('article-') ? 'learn'
      : path.startsWith('/about') ? 'about'
        : 'home';
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.classList.toggle('is-active', a.dataset.nav === key);
  });
}

// ---- Home ----

function renderHome() {
  document.title = '知命 · 四柱八字排盤';
  const today = todayOverview();
  const lunarToday = formatLunar(today.lunar.year, today.lunar.month, today.lunar.day, today.lunar.isLeap);
  state.formInput = state.formInput || loadLastInput() || DEFAULT_INPUT;

  app.innerHTML = `
    <div class="wrap">
      <section class="hero">
        <div class="hero-copy reveal">
          <p class="eyebrow"><span class="eyebrow-line"></span>子平術 · 四柱八字</p>
          <h1 class="hero-title">一紙八字<br><em>見天地</em>與人</h1>
          <p class="hero-lede">以節氣為綱，以干支為目。完整還原年、月、日、時四柱，十神、藏干、大運、流年，一屏可讀。計算全部在本機完成，無需登錄。</p>
          <ul class="hero-points">
            <li><span class="dot"></span>精確到分鐘的節氣邊界</li>
            <li><span class="dot"></span>真太陽時與子時校正</li>
            <li><span class="dot"></span>命例只存在你的瀏覽器裏</li>
          </ul>
          <div class="today-strip">
            <div class="today-main">
              <span class="today-label">今日</span>
              <span class="today-date">${today.dateText}</span>
              <span class="today-ganzhi">${today.yearText} · ${today.dayText}</span>
            </div>
            <div class="today-sub">${lunarToday} · ${today.prevJie ? `${today.prevJie.name}後` : ''}</div>
            <button class="today-btn" type="button" data-action="fill-today">以此日起盤 ${icon('arrowRight', 14)}</button>
          </div>
        </div>
        <div class="hero-form reveal" style="--delay: 80ms">
          ${renderForm()}
        </div>
      </section>

      <section class="feature-row">
        <article class="feature-card">
          <span class="feature-index">壹</span>
          <h3>節氣為界</h3>
          <p>依據太陽視黃經推算的二十四節氣，覆蓋 1900–2100 年，精確到分鐘。年柱看立春，月柱看節令。</p>
        </article>
        <article class="feature-card">
          <span class="feature-index">貳</span>
          <h3>詳略由心</h3>
          <p>四柱、十神、藏干、星運、納音、神煞、命宮、胎元、大運、流年。可一鍵切換簡盤。</p>
        </article>
        <article class="feature-card">
          <span class="feature-index">叄</span>
          <h3>數據留白</h3>
          <p>不需要帳號。命例保存在本機，可隨時打開、刪除，或生成一枚只含出生信息的分享鏈接。</p>
        </article>
      </section>

      <section class="quiet-note">
        <span class="quiet-mark">觀</span>
        <p>「觀其象，玩其辭。」傳統術數是一套觀察時間與關係的語言。本站呈現推算過程，不作吉凶斷定，也不替代任何現實決策。</p>
        <a href="#/learn" class="quiet-link">從學堂開始 ${icon('arrowRight', 14)}</a>
      </section>
    </div>
  `;

  initHomeForm();
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
      navigate('#/chart');
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
  document.title = `知命 · ${pageTitle}`;
  app.innerHTML = `
    <div class="wrap error-page">
      <span class="error-seal">空</span>
      <h1>${esc(heading)}</h1>
      <p>${esc(message)}</p>
      <a class="btn btn-primary" href="#/">重新排盤 ${icon('arrowRight', 16)}</a>
    </div>
  `;
}

function renderChart(chart) {
  const name = chart.input.name || '未具名';
  document.title = `知命 · ${name}的命盤`;
  const solarText = solarDateText(chart);
  const gender = GENDER_LABEL[chart.input.gender];
  const dm = chart.dayMaster;
  const selected = chart.luck.steps[state.selectedLuck] || chart.luck.steps[0];

  app.innerHTML = `
    <div class="wrap result-page">
      <div class="result-bar reveal">
        <a class="back-link" href="#/">${icon('arrowLeft', 16)} 重新排盤</a>
        <div class="result-actions">
          <button class="chip-btn" type="button" data-action="edit">${icon('edit', 15)} 修改</button>
          <button class="chip-btn" type="button" data-action="save">${icon('save', 15)} 保存</button>
          <button class="chip-btn" type="button" data-action="share">${icon('link', 15)} 分享</button>
          <button class="chip-btn" type="button" data-action="copy" aria-label="複製命盤文字">${icon('copy', 15)} 複製</button>
          <button class="chip-btn" type="button" data-action="print">${icon('print', 15)} 打印</button>
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
          <div><span>格局</span><strong>${dm.strength}</strong></div>
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
              <div><span>節氣</span>生於 <b>${chart.monthInfo.prevJie.name}</b> 後 ${chart.monthInfo.prevJie.days.toFixed(1)} 天，距 <b>${chart.monthInfo.nextJie.name}</b> ${chart.monthInfo.nextJie.days.toFixed(1)} 天</div>
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

          <section class="card almanac-card reveal" style="--delay: 170ms">
            <p class="card-kicker">曆法</p>
            <h2>起盤依據</h2>
            <dl class="almanac-list">
              <div><dt>農曆</dt><dd>${chart.lunarText}</dd></div>
              <div><dt>生肖</dt><dd>${chart.animal}</dd></div>
              <div><dt>節氣</dt><dd>${chart.monthInfo.prevJie.name}後 ${chart.monthInfo.prevJie.days.toFixed(1)} 天</dd></div>
              <div><dt>起運</dt><dd>${chart.luck.startLabel} · ${chart.luck.directionLabel}</dd></div>
              <div><dt>交運</dt><dd>${chart.luck.jiaoyunText}</dd></div>
            </dl>
            <a href="#/learn" class="card-link">讀懂命盤裏的術語 ${icon('arrowRight', 14)}</a>
          </section>
          </div>
        </aside>
      </div>

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
  return `
    <div class="period-picker">
      <div class="period-head"><b>流月</b><small>${table.year.year}年 · 按十二節</small></div>
      <div class="period-rail" role="group" aria-label="選擇流月">
        ${table.months.map((mo, i) => `
          <button class="period-chip ${i === state.period.monthIndex ? 'is-active' : ''}" type="button" data-month="${i}" aria-pressed="${i === state.period.monthIndex}">
            <span class="p-name">${mo.name}</span>
            <strong><b class="${elClass(elementForStemChar(mo.stemChar))}">${mo.stemChar}</b><b class="${elClass(elementForBranchChar(mo.branchChar))}">${mo.branchChar}</b></strong>
          </button>`).join('')}
      </div>
      <div class="period-head"><b>流日</b><small>${month.name} · 共 ${month.days.length} 日</small></div>
      <div class="period-rail day-rail" role="group" aria-label="選擇流日">
        ${month.days.map((dp, i) => `
          <button class="period-chip day-chip ${i === state.period.dayIndex ? 'is-active' : ''}" type="button" data-day="${i}" aria-pressed="${i === state.period.dayIndex}">
            <span class="p-name">${dp.m}/${dp.d}</span>
            <strong><b class="${elClass(elementForStemChar(dp.stemChar))}">${dp.stemChar}</b><b class="${elClass(elementForBranchChar(dp.branchChar))}">${dp.branchChar}</b></strong>
          </button>`).join('')}
      </div>
      ${day ? `
      <div class="period-head"><b>流時</b><small>${day.m}/${day.d} · 子時起算</small></div>
      <div class="period-rail hour-rail" role="group" aria-label="選擇流時">
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
      <h3>${step.stemChar}${step.branchChar}運 <small>${step.tenGod}</small></h3>
      <p>${ageText(step.startAge)} 至 ${ageText(nextAge)} · ${step.startYear}–${step.startYear + 9}</p>
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

function bindResultEvents() {
  const compactBtn = document.getElementById('compact-btn');
  if (compactBtn) {
    compactBtn.setAttribute('aria-pressed', String(state.compact));
  }
  const rail = document.querySelector('.luck-rail');
  revealLuckCard(rail?.querySelector('.luck-card.is-active'));
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

function selectLuck(index, options = {}) {
  if (!state.chart || !state.chart.luck.steps[index]) return;
  state.selectedLuck = index;
  state.period = null;
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

// ---- Records ----

function renderRecords() {
  document.title = '知命 · 命例';
  state.records = loadRecords();
  const cards = state.records.map((record) => {
    let chart;
    try {
      chart = computeChart(record.input);
    } catch {
      return '';
    }
    const solarText = solarDateText(chart);
    const searchText = [
      record.input.name || '未具名',
      chart.solarDate.y, `${chart.solarDate.m}`.padStart(2, '0'), `${chart.solarDate.d}`.padStart(2, '0'),
      solarText, chart.lunarText, chart.fourPillarsText, chart.animal, chart.timeUnknown ? '時辰未知' : '',
      `${chart.dayMaster.char}${chart.dayMaster.elementLabel}`, chart.dayMaster.strength,
    ].join(' ');
    return `
      <article class="record-card" data-record-id="${esc(record.id)}" data-search="${esc(searchText)}">
        <div class="record-head">
          <div>
            <h3>${esc(record.input.name || '未具名')} <small>${GENDER_LABEL[record.input.gender]}</small></h3>
            <p>${solarText} · ${chart.lunarText}</p>
          </div>
          <button class="icon-btn danger" type="button" data-action="delete-record" data-id="${esc(record.id)}" aria-label="刪除命例">${icon('trash', 16)}</button>
        </div>
        <div class="record-pillars">
          ${chart.pillarList.map((p) => `<span><b class="${elClass(p.stemElement)}">${p.stemChar}</b><b class="${elClass(p.branchElement)}">${p.branchChar}</b></span>`).join('')}
        </div>
        <div class="record-foot">
          <span>${chart.animal}年 · 日主${chart.dayMaster.char}${chart.dayMaster.elementLabel} · ${chart.dayMaster.strength}</span>
          <button class="record-open" type="button" data-action="open-record" data-id="${esc(record.id)}">打開命盤 ${icon('arrowRight', 14)}</button>
        </div>
      </article>
    `;
  }).join('');
  const hasRecords = state.records.length > 0;

  app.innerHTML = `
    <div class="wrap page">
      <header class="page-head reveal">
        <p class="eyebrow"><span class="eyebrow-line"></span>命例</p>
        <h1>已存的命盤</h1>
        <p class="page-lede">命例只保存在當前瀏覽器中。清除站點數據或將瀏覽器記錄遷移，都會讓它們消失；可隨時導出 JSON 備份。</p>
      </header>
      <div class="records-toolbar reveal">
        <div class="records-toolbar-main">
          <span id="record-count" aria-live="polite">共 ${state.records.length} 張命盤</span>
          ${hasRecords ? `<label class="record-search">
            <input id="record-search" type="search" value="${esc(state.recordQuery)}" placeholder="搜索姓名、日期或四柱" aria-label="搜索命例" autocomplete="off">
          </label>` : ''}
        </div>
        <div class="records-toolbar-actions">
          <button class="chip-btn" type="button" data-action="import-records">${icon('upload', 15)} 導入 JSON</button>
          ${hasRecords ? `<button class="chip-btn" type="button" data-action="export-records">${icon('download', 15)} 導出 JSON</button>` : ''}
          <a class="chip-btn" href="#/">${icon('plus', 15)} 新建排盤</a>
        </div>
      </div>
      <input type="file" id="records-import" accept="application/json,.json" hidden>
      <p class="record-empty" id="record-empty" hidden>沒有匹配的命例。</p>
      ${hasRecords ? `<div class="record-grid">${cards}</div>` : `
        <div class="empty-state reveal">
          <span class="empty-seal">錄</span>
          <h2>還沒有存下的命盤</h2>
          <p>起一局盤，在結果頁點「保存」，它就會出現在這裏。也可以導入之前導出的 JSON 備份。</p>
          <a class="btn btn-primary" href="#/">去排盤 ${icon('arrowRight', 16)}</a>
        </div>`}
    </div>
  `;
  bindRecordTools();
}

function filterRecords(query) {
  state.recordQuery = query;
  const needle = query.trim().toLowerCase();
  let visible = 0;
  document.querySelectorAll('.record-card').forEach((card) => {
    const hit = !needle || (card.dataset.search || '').toLowerCase().includes(needle);
    card.hidden = !hit;
    if (hit) visible += 1;
  });
  const countEl = document.getElementById('record-count');
  if (countEl) {
    countEl.textContent = needle
      ? `找到 ${visible} 張 / 共 ${state.records.length} 張`
      : `共 ${state.records.length} 張命盤`;
  }
  const emptyEl = document.getElementById('record-empty');
  if (emptyEl) emptyEl.hidden = !needle || visible > 0;
}

function bindRecordTools() {
  const search = document.getElementById('record-search');
  if (search) {
    search.addEventListener('input', () => filterRecords(search.value));
    search.addEventListener('search', () => filterRecords(search.value));
    if (state.recordQuery) filterRecords(search.value);
  }
  const fileInput = document.getElementById('records-import');
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (file) importRecords(file);
    });
  }
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
    additions.push({ id, input, createdAt: stamp });
  }
  if (!additions.length) {
    toast(`沒有新增命例${skipped ? `，跳過 ${skipped} 條` : ''}`);
    return;
  }
  state.records = [...additions, ...state.records];
  if (!persistRecords()) {
    state.records = loadRecords();
    toast('瀏覽器存儲不可用，未能導入');
    return;
  }
  state.recordQuery = '';
  renderRecords();
  toast(`已導入 ${additions.length} 張命例${skipped ? `，跳過 ${skipped} 條` : ''}`);
}

// ---- Learn ----

function openArticle(id) {
  const article = document.getElementById(id);
  if (!article) return;
  article.open = true;
  document.querySelectorAll('.learn-toc a').forEach((link) => {
    link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
  });
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  article.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  article.querySelector('summary')?.focus({ preventScroll: true });
}

function renderLearn() {
  document.title = '知命 · 學堂';
  app.innerHTML = `
    <div class="wrap page">
      <header class="page-head reveal">
        <p class="eyebrow"><span class="eyebrow-line"></span>學堂</p>
        <h1>先把語言學會<br>再談命理</h1>
        <p class="page-lede">四柱不是四個字，而是一套關於時間、節氣與關係的記號系統。以下短文，按排盤順序解釋你會遇到的術語。</p>
      </header>
      <div class="learn-layout">
        <aside class="learn-toc reveal">
          <p class="toc-label">目錄</p>
          ${ARTICLES.map((a, i) => `<a href="#article-${a.id}"><span>${String(i + 1).padStart(2, '0')}</span>${a.title}</a>`).join('')}
          <div class="toc-quote">「不執一端，<br>不落宿命。」</div>
        </aside>
        <div class="articles">
          ${ARTICLES.map((a, i) => `
            <details class="article reveal" id="article-${a.id}" ${i === 0 ? 'open' : ''} style="--delay:${i * 40}ms">
              <summary>
                <span class="article-index">${String(i + 1).padStart(2, '0')}</span>
                <span class="article-title-wrap">
                  <span class="article-kicker">${a.kicker}</span>
                  <span class="article-title">${a.title}</span>
                  <span class="article-summary">${a.summary}</span>
                </span>
                <span class="article-chevron">${icon('chevron', 18)}</span>
              </summary>
              <div class="article-body prose">${a.body}</div>
            </details>`).join('')}
        </div>
      </div>
    </div>
  `;
}

// ---- About ----

function renderAbout() {
  document.title = '知命 · 關於';
  app.innerHTML = `
    <div class="wrap page about-page">
      <header class="page-head reveal">
        <p class="eyebrow"><span class="eyebrow-line"></span>關於</p>
        <h1>知命，而不認命</h1>
        <p class="page-lede">一個安靜、完整、不需要登錄的四柱排盤工具。把傳統術數所需的信息如實呈現，把判斷留給你。</p>
      </header>

      <section class="about-grid">
        <article class="about-card reveal">
          <span class="about-index">壹</span>
          <h2>為什麼重做排盤</h2>
          <p>舊的排盤頁面常常被表單、廣告和登錄牆切碎。知命只保留三件事：準確的時間換算、清晰的四柱結構、可保存的命例。所有多餘的東西都被拿掉了。</p>
        </article>
        <article class="about-card reveal" style="--delay:60ms">
          <span class="about-index">貳</span>
          <h2>數據與隱私</h2>
          <p>沒有帳戶，沒有服務器寫入。出生信息只在你的瀏覽器裏計算；命例保存在 localStorage。分享鏈接會把出生信息編碼進鏈接本身，點擊前請確認接收方可以查看。</p>
        </article>
        <article class="about-card reveal" style="--delay:120ms">
          <span class="about-index">叄</span>
          <h2>曆法說明</h2>
          <p>年柱以立春為界，月柱以十二節為界。節氣按太陽視黃經推算，覆蓋 1899–2101 年，精確到分鐘。農曆日期覆蓋 1900–2100 年，含閏月。</p>
        </article>
        <article class="about-card reveal" style="--delay:180ms">
          <span class="about-index">肆</span>
          <h2>參考與邊界</h2>
          <p>術語與取象參考《淵海子平》《三命通會》《子平真詮》《窮通寶鑑》等傳統文獻。五行比例、身強身弱與喜用提示是簡化的教學性計算，不是命理斷語。</p>
        </article>
      </section>

      <section class="about-quote reveal">
        <span class="quote-mark">「</span>
        <p>善易者不卜。真正的傳統，不是把一切交給命盤，而是借它照見自己。</p>
      </section>

      <section class="about-disclaimer reveal">
        <h3>免責聲明</h3>
        <p>本站內容用於傳統文化研習與信息整理，不構成醫療、法律、投資、婚戀或任何現實決策建議。請勿依據排盤結果作出重大決定。</p>
        <p class="about-tech">純靜態頁面 · 無追蹤 · 本地計算</p>
      </section>
    </div>
  `;
}

// ---- Actions ----

function chartToText(chart) {
  const lines = [];
  lines.push(`知命 · 四柱排盤`);
  lines.push(`${chart.input.name || '未具名'} ${GENDER_LABEL[chart.input.gender]}命`);
  lines.push(`公曆：${solarDateText(chart)}`);
  lines.push(`農曆：${chart.lunarText}`);
  lines.push(`四柱：${chart.fourPillarsText}`);
  lines.push(`日主：${chart.dayMaster.char}${chart.dayMaster.elementLabel} · ${chart.dayMaster.strength}`);
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
  state.records.unshift({
    id,
    input,
    createdAt: new Date().toISOString(),
  });
  toast(persistRecords() ? '已保存到命例' : '瀏覽器存儲不可用，未能保存');
}

function shareCurrent() {
  if (!state.chart) return;
  const payload = encodeInput({ v: 2, input: state.chart.input, view: viewFromState() });
  const url = `${location.origin}${location.pathname}#/view/${payload}`;
  copyText(url);
}

function copyCurrent() {
  if (!state.chart) return;
  copyText(chartToText(state.chart));
}

function editCurrent() {
  if (!state.chart) return;
  state.formInput = state.chart.input;
  navigate('#/');
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
    navigate('#/chart');
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
    case 'edit': editCurrent(); break;
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
  const tocLink = event.target.closest('.learn-toc a[href^="#article-"]');
  if (tocLink) {
    event.preventDefault();
    openArticle(tocLink.getAttribute('href').slice(1));
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
  if (recordCard && !event.target.closest('button')) {
    openRecord(recordCard.dataset.recordId);
  }
});

window.addEventListener('hashchange', () => route({ focus: true }));

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
route();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
