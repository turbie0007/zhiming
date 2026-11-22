// Generates the compact data file shared by the iOS and Android widgets.
// Run after changing assets/js/solar-terms.js or assets/js/data.js:
//   node tools/build-widget-data.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { SOLAR_TERMS, TERMS_START_YEAR } = await import('../assets/js/solar-terms.js');
const { LUNAR_INFO, LUNAR_MIN_YEAR } = await import('../assets/js/data.js');
const astro = await import('../assets/js/astro.js');
const data = await import('../assets/js/data.js');

const lichun = [];
for (let year = 1900; year <= 2100; year += 1) {
  const row = SOLAR_TERMS[year - TERMS_START_YEAR];
  if (!row) throw new Error(`missing solar terms for ${year}`);
  lichun.push(row.slice(16, 24));
}

const payload = {
  lichunStartYear: 1900,
  lichun: lichun.join(''),
  lunarStartYear: LUNAR_MIN_YEAR,
  lunarInfo: LUNAR_INFO,
};

const json = `${JSON.stringify(payload)}\n`;
const targets = [
  'ios/App/Widget/TodayData.json',
  'android/app/src/main/assets/today_data.json',
];
for (const target of targets) {
  const path = resolve(root, target);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, json);
  console.log(`wrote ${target} (${json.length} bytes)`);
}

// Reference vectors used to verify the Swift / Java ports.
function overview(y, m, d) {
  const ts = astro.makeTs(y, m, d, 12, 0);
  const lichunTs = astro.getSolarTermTs(y, 2);
  const yearForPillar = lichunTs != null && ts < lichunTs ? y - 1 : y;
  const index = astro.mod(yearForPillar - 4, 60);
  const dayIdx = astro.mod(Math.floor(ts / 86400000) + 25567 + 10, 60);
  const lunar = astro.solarToLunar(y, m, d);
  return {
    yearText: `${data.STEMS[index % 10]}${data.BRANCHES[index % 12]}年`,
    dayText: `${data.STEMS[dayIdx % 10]}${data.BRANCHES[dayIdx % 12]}日`,
    animal: data.ANIMALS[index % 12],
    lunarText: astro.formatLunar(lunar.year, lunar.month, lunar.day, lunar.isLeap),
  };
}

const dates = [
  [2026, 11, 23], [2026, 11, 24], [2027, 2, 1], [2027, 2, 4],
  [2028, 1, 25], [2020, 5, 23], [2025, 7, 25], [2033, 12, 22],
  [2100, 12, 31], [1900, 1, 31],
];
for (const [y, m, d] of dates) {
  const o = overview(y, m, d);
  console.log(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} ${o.yearText} ${o.dayText} ${o.animal} ${o.lunarText}`);
}
