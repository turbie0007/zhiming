import { SOLAR_TERMS, TERMS_START_YEAR } from './solar-terms.js?v=20261156';
import {
  STEMS, BRANCHES, LUNAR_INFO, LUNAR_MONTHS, LUNAR_DAYS,
  LUNAR_MIN_YEAR, LUNAR_MAX_YEAR, JIE_MAP, TERM_NAMES,
} from './data.js?v=20261156';

const DAY_MS = 86400000;

export function mod(n, m) {
  return ((n % m) + m) % m;
}

export function pad2(n) {
  return String(n).padStart(2, '0');
}

// All dates are handled as "Beijing wall clock encoded in UTC" to avoid
// browser timezone and DST interference.
export function makeTs(y, m, d, h = 0, min = 0) {
  return Date.UTC(y, m - 1, d, h, min, 0, 0);
}

export function tsParts(ts) {
  const d = new Date(ts);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth() + 1,
    d: d.getUTCDate(),
    h: d.getUTCHours(),
    min: d.getUTCMinutes(),
  };
}

export function formatDate(ts, withTime = true) {
  const p = tsParts(ts);
  return `${p.y}年${p.m}月${p.d}日` + (withTime ? ` ${pad2(p.h)}:${pad2(p.min)}` : '');
}

export function formatTime(h, min) {
  return `${pad2(h)}:${pad2(min)}`;
}

export function daysInSolarMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function dayOfYear(ts) {
  const p = tsParts(ts);
  return Math.floor((ts - makeTs(p.y, 1, 1)) / DAY_MS) + 1;
}

export function getSolarTermTs(year, index) {
  const row = SOLAR_TERMS[year - TERMS_START_YEAR];
  if (!row) return null;
  const chunk = row.slice(index * 8, index * 8 + 8);
  const mm = Number(chunk.slice(0, 2));
  const dd = Number(chunk.slice(2, 4));
  const hh = Number(chunk.slice(4, 6));
  const mi = Number(chunk.slice(6, 8));
  return makeTs(year, mm, dd, hh, mi);
}

export function getSolarTermName(index) {
  return TERM_NAMES[index];
}

export function jieListAround(ts) {
  const { y } = tsParts(ts);
  const list = [];
  for (let year = y - 1; year <= y + 1; year++) {
    for (const [termIndex, branch] of JIE_MAP) {
      const termTs = getSolarTermTs(year, termIndex);
      if (termTs != null) {
        list.push({ ts: termTs, termIndex, name: TERM_NAMES[termIndex], branch, year });
      }
    }
  }
  list.sort((a, b) => a.ts - b.ts);
  return list;
}

export function findJieBefore(ts) {
  const list = jieListAround(ts);
  let found = null;
  for (const jie of list) {
    if (jie.ts <= ts) found = jie;
    else break;
  }
  return found;
}

export function findJieAfter(ts) {
  const list = jieListAround(ts);
  return list.find((jie) => jie.ts > ts) || null;
}

export function lichunTs(year) {
  return getSolarTermTs(year, 2);
}

// ---- Lunar calendar ----

export function leapMonth(year) {
  return LUNAR_INFO[year - LUNAR_MIN_YEAR] & 0xf;
}

export function leapDays(year) {
  if (!leapMonth(year)) return 0;
  return LUNAR_INFO[year - LUNAR_MIN_YEAR] & 0x10000 ? 30 : 29;
}

export function lunarMonthDays(year, month) {
  return LUNAR_INFO[year - LUNAR_MIN_YEAR] & (0x10000 >> month) ? 30 : 29;
}

export function lunarYearDays(year) {
  let sum = 348;
  for (let bit = 0x8000; bit > 0x8; bit >>= 1) {
    if (LUNAR_INFO[year - LUNAR_MIN_YEAR] & bit) sum += 1;
  }
  return sum + leapDays(year);
}

const LUNAR_BASE_TS = makeTs(1900, 1, 31);

export function solarToLunar(y, m, d) {
  let offset = Math.round((makeTs(y, m, d) - LUNAR_BASE_TS) / DAY_MS);
  let ly = LUNAR_MIN_YEAR;
  while (ly < LUNAR_MAX_YEAR && offset >= lunarYearDays(ly)) {
    offset -= lunarYearDays(ly);
    ly++;
  }
  const lm = leapMonth(ly);
  let month = 1;
  while (month <= 12) {
    const days = lunarMonthDays(ly, month);
    if (offset < days) {
      return { year: ly, month, day: offset + 1, isLeap: false };
    }
    offset -= days;
    if (lm === month) {
      const ldays = leapDays(ly);
      if (offset < ldays) {
        return { year: ly, month, day: offset + 1, isLeap: true };
      }
      offset -= ldays;
    }
    month++;
  }
  return { year: ly, month: 12, day: 30, isLeap: false };
}

export function lunarToSolar(ly, lm, ld, isLeap = false) {
  if (ly < LUNAR_MIN_YEAR || ly > LUNAR_MAX_YEAR) {
    throw new Error(`農曆年份需在 ${LUNAR_MIN_YEAR}–${LUNAR_MAX_YEAR} 之間`);
  }
  const lmLeap = leapMonth(ly);
  if (isLeap && lmLeap !== lm) throw new Error('所選年份該月沒有閏月');
  const maxDay = isLeap ? leapDays(ly) : lunarMonthDays(ly, lm);
  if (ld < 1 || ld > maxDay) throw new Error('農曆日期無效');

  let offset = 0;
  for (let y = LUNAR_MIN_YEAR; y < ly; y++) offset += lunarYearDays(y);
  for (let m = 1; m < lm; m++) {
    offset += lunarMonthDays(ly, m);
    if (lmLeap === m) offset += leapDays(ly);
  }
  if (isLeap) offset += lunarMonthDays(ly, lm);
  offset += ld - 1;

  const p = tsParts(LUNAR_BASE_TS + offset * DAY_MS);
  return { y: p.y, m: p.m, d: p.d };
}

export function lunarMonthList(year) {
  const lm = leapMonth(year);
  const list = [];
  for (let m = 1; m <= 12; m++) {
    list.push({ month: m, isLeap: false, days: lunarMonthDays(year, m), label: LUNAR_MONTHS[m - 1] });
    if (lm === m) {
      list.push({ month: m, isLeap: true, days: leapDays(year), label: `閏${LUNAR_MONTHS[m - 1]}` });
    }
  }
  return list;
}

export function lunarYearLabel(year) {
  const idx = mod(year - 4, 60);
  return `${STEMS[idx % 10]}${BRANCHES[idx % 12]}年`;
}

export function formatLunar(y, m, d, isLeap = false) {
  return `${lunarYearLabel(y)} ${isLeap ? '閏' : ''}${LUNAR_MONTHS[m - 1]}${LUNAR_DAYS[d - 1]}`;
}

export function chineseYear(year) {
  const digits = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  return String(year).split('').map((ch) => digits[Number(ch)]).join('');
}

export function addMonths(ts, monthsFloat) {
  const whole = Math.floor(monthsFloat);
  const frac = monthsFloat - whole;
  const p = tsParts(ts);
  let total = p.y * 12 + (p.m - 1) + whole;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  const dim = daysInSolarMonth(y, m);
  const day = Math.min(p.d, dim);
  return makeTs(y, m, day, p.h, p.min) + Math.round(frac * 30 * DAY_MS);
}

export function addDays(ts, days) {
  return ts + days * DAY_MS;
}
