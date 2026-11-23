import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const output = join(root, 'store/zh-Hant');
const origin = process.env.STORE_PREVIEW_ORIGIN || 'http://127.0.0.1:4173';
if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) throw new Error('Only a local preview origin is allowed.');
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const work = join(root, 'artifacts/store-capture');
await mkdir(work, { recursive: true });
await mkdir(output, { recursive: true });
const profile = await mkdtemp(join(work, 'chrome-'));
const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1',
  `--user-data-dir=${profile}`, '--hide-scrollbars', 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
const endpoint = await new Promise((resolveEndpoint, reject) => {
  const timeout = setTimeout(() => reject(new Error('Chrome did not start within 30 seconds.')), 30000);
  let log = '';
  chrome.stderr.on('data', (data) => {
    log += data.toString();
    const match = log.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (match) { clearTimeout(timeout); resolveEndpoint(match[1]); }
  });
  chrome.once('error', (error) => { clearTimeout(timeout); reject(error); });
  chrome.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Chrome exited: ${code}`)); });
});
const socket = new WebSocket(endpoint);
await new Promise((resolveOpen, reject) => {
  socket.addEventListener('open', resolveOpen, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
let nextId = 0;
const pending = new Map();
const browserErrors = [];
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.text);
  if (!message.id) return;
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  clearTimeout(request.timer);
  if (message.error) request.reject(new Error(JSON.stringify(message.error)));
  else request.resolve(message.result);
});
function send(method, params = {}, sessionId) {
  const id = ++nextId;
  return new Promise((resolveResult, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timed out: ${method}`)); }, 30000);
    pending.set(id, { resolve: resolveResult, reject, timer });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const call = (method, params) => send(method, params, sessionId);
await call('Runtime.enable');
await call('Page.enable');
await call('Network.enable');
await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
async function evaluate(expression) {
  const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function waitFor(expression) {
  return evaluate(`new Promise((resolve, reject) => {
    const deadline = performance.now() + 12000;
    const check = () => {
      if (${expression}) return resolve(true);
      if (performance.now() > deadline) return reject(new Error('Expected UI did not appear: ' + location.href + ' | ' + document.body?.innerText.slice(0, 300)));
      requestAnimationFrame(check);
    }; check();
  })`);
}
async function settle() {
  await evaluate('document.fonts.ready');
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
}
async function screenshot(path) {
  await settle();
  const { data } = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await sharp(Buffer.from(data, 'base64')).removeAlpha().png().toFile(path);
}
async function align(selector, margin = 14) {
  await evaluate(`(() => {
    const node = document.querySelector(${JSON.stringify(selector)});
    const header = document.querySelector('.site-header').getBoundingClientRect().height;
    window.scrollTo({ top: node.getBoundingClientRect().top + scrollY - header - ${margin}, behavior: 'instant' });
  })()`);
  await settle();
}
async function navigate(hash, ready) {
  await evaluate(`location.hash = ${JSON.stringify(hash)}`);
  await waitFor(ready);
  await settle();
}
const sample = {
  name: '示例甲', gender: 'male', calendar: 'solar', solar: { y: 1990, m: 1, d: 1 },
  lunar: null, time: { h: 12, min: 0 }, trueSolar: false, city: '北京', lateZi: true, shareHideName: true,
};
const records = [
  { id: 'store-demo-a', input: sample, tags: ['四柱研習'], folder: '研習示例', note: '虛構資料，用於四柱與十神研習。', createdAt: '2026-11-20T09:00:00Z' },
  { id: 'store-demo-b', input: { ...sample, name: '示例乙', gender: 'female', solar: { y: 1994, m: 8, d: 18 }, time: { h: 9, min: 20 } }, tags: ['合參練習'], folder: '研習示例', note: '虛構資料，用於雙盤對照練習。', createdAt: '2026-11-19T09:00:00Z' },
  { id: 'store-demo-c', input: { ...sample, name: '示例丙', solar: { y: 1988, m: 3, d: 6 }, time: null }, tags: ['時辰未知'], folder: '研習示例', note: '虛構資料，示範時辰未知的排盤方式。', createdAt: '2026-11-18T09:00:00Z' },
];
const scenes = [
  { id: '01-chart', title: '一紙八字，清楚展開', subtitle: '四柱、十神與藏干，逐層閱讀', alt: '知命四柱八字詳盤，顯示天干、地支、十神與藏干，資料為虛構示例。', selector: '.chart-card' },
  { id: '02-structure', title: '看見取格的依據', subtitle: '格局與用神，附上規則與理由', alt: '格局與用神卡片，列出取格理由與用神候選，僅供傳統文化研習。', selector: '.structure-card' },
  { id: '03-luck', title: '循著時序，逐層研習', subtitle: '大運、流年，再看流月與流日', alt: '大運與流年操作區，可切換十年大運並查看各年干支。', selector: '.luck-panel' },
  { id: '04-records', title: '把每次研習，留下來', subtitle: '命例、標籤與備註，整齊收藏', alt: '命例管理頁，使用虛構示例展示資料夾、標籤、備註與搜尋功能。', hash: '#/records', ready: "document.querySelector('.record-card')" },
  { id: '05-learn', title: '從名詞，讀懂脈絡', subtitle: '在學堂，一步步認識四柱', alt: '知命學堂，以文章卡片介紹四柱八字相關概念。', hash: '#/learn', ready: "document.querySelector('.learn-layout')" },
  { id: '06-dark', title: '入夜，也能安靜閱讀', subtitle: '深淺主題切換，閱讀各有所適', alt: '知命四柱詳盤的深色主題，以不同顏色區分五行。', selector: '.chart-card', dark: true },
];
const formats = [
  { id: 'app-store-iphone', label: 'App Store · iPhone', width: 1206, height: 2622, vw: 402, vh: 770, scale: 3 },
  { id: 'google-play-phone', label: 'Google Play · 手機', width: 1080, height: 1920, vw: 360, vh: 570, scale: 3 },
  { id: 'app-store-ipad', label: 'App Store · iPad 13 吋', width: 2064, height: 2752, vw: 1032, vh: 1160, scale: 2 },
];
const manifest = {
  locale: 'zh-Hant', status: 'browser-draft-not-for-submission', sourceType: 'Chrome responsive web capture, not native iOS or Android',
  capturedAt: new Date().toISOString(), appVersion: '1.0.0', nativeBuild: 2, webVersion: '20261145',
  demoData: 'All names, birth inputs, notes and records are fictional fixtures in an isolated browser profile.',
  limitations: ['No native status bars, safe-area insets, platform fonts or system dialogs are represented.', 'Replace raw captures with real app captures and recheck layout before submission.', 'Native widgets, notifications and sharing are not simulated.'],
  sources: {}, formats, scenes, screenshots: [], checks: [],
  references: [
    'https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications',
    'https://support.google.com/googleplay/android-developer/answer/9866151',
  ],
};
for (const file of ['index.html', 'assets/js/app.js', 'assets/css/style.css', 'sw.js']) {
  manifest.sources[file] = createHash('sha256').update(await readFile(join(root, file))).digest('hex');
}
const esc = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function posterHtml(format, scene, imageData, index) {
  const { width: w, height: h } = format;
  const tablet = format.id.endsWith('ipad');
  const top = Math.round(h * 0.16);
  const gap = Math.round(w * 0.047);
  const maxWidth = w - gap * 2;
  const maxHeight = h - top - Math.round(h * 0.035);
  const factor = Math.min(maxWidth / (format.vw * format.scale), maxHeight / (format.vh * format.scale));
  const fw = Math.round(format.vw * format.scale * factor);
  const fh = Math.round(format.vh * format.scale * factor);
  const dark = scene.dark;
  const ink = dark ? '#eee5d5' : '#251f19';
  const muted = dark ? '#b4a992' : '#766a57';
  return `<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;width:${w}px;height:${h}px;overflow:hidden;color:${ink};background:${dark ? '#191814' : '#f3eddf'};font-family:-apple-system,'PingFang TC',sans-serif}
  .rings{position:absolute;right:-${w * .42}px;top:-${w * .25}px;width:${w}px;height:${w}px;border:1px solid ${dark ? '#b49e6825' : '#a88a5229'};border-radius:50%;box-shadow:0 0 0 ${w * .08}px ${dark ? '#b49e6807' : '#a88a5206'},0 0 0 ${w * .16}px ${dark ? '#b49e6805' : '#a88a5204'}}
  header{position:absolute;left:${gap}px;top:${Math.round(h * .025)}px;right:${gap}px;display:flex;align-items:center;justify-content:space-between;font-size:${Math.round(w * (tablet ? .015 : .023))}px;letter-spacing:.15em;color:${muted}}
  header b{font-weight:600;color:${ink}}header span{font-variant-numeric:tabular-nums}
  .copy{position:absolute;top:${Math.round(h * .057)}px;left:${gap}px;right:${gap}px}
  h1{font-family:'Songti TC','Songti SC',serif;font-size:${Math.round(w * (tablet ? .041 : .054))}px;font-weight:600;letter-spacing:.025em;line-height:1.35;margin:0 0 ${Math.round(h * .009)}px}
  p{font-size:${Math.round(w * (tablet ? .019 : .026))}px;letter-spacing:.07em;color:${muted};margin:0}
  .capture{position:absolute;left:${Math.round((w - fw) / 2)}px;top:${top}px;width:${fw}px;height:${fh}px;border:1px solid ${dark ? '#625647' : '#cdbda1'};border-radius:${Math.round(w * .018)}px;overflow:hidden;box-shadow:0 ${Math.round(w * .022)}px ${Math.round(w * .06)}px -${Math.round(w * .023)}px #38261838}
  img{width:100%;height:100%;display:block}footer{position:absolute;left:${gap}px;right:${gap}px;bottom:${Math.round(h * .012)}px;color:${muted};font-size:${Math.round(w * (tablet ? .011 : .018))}px;letter-spacing:.08em;display:flex;justify-content:space-between}
  </style><div class="rings"></div><header><b>知命 · 四柱研習</b><span>${String(index + 1).padStart(2, '0')} / 06</span></header><div class="copy"><h1>${esc(scene.title)}</h1><p>${esc(scene.subtitle)}</p></div><div class="capture"><img src="${imageData}"></div><footer><span>傳統文化研習 · 不作決策建議</span><span>虛構示例資料</span></footer></html>`;
}
async function renderHtml(html, width, height, path) {
  await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: 'about:blank' });
  await waitFor("location.href === 'about:blank'");
  const { frameTree } = await call('Page.getFrameTree');
  await call('Page.setDocumentContent', { frameId: frameTree.frame.id, html });
  await evaluate('Promise.all([...document.images].map(image => image.decode()))');
  await screenshot(path);
}
try {
  for (const format of formats) {
    const rawDir = `browser-drafts/raw/${format.id}`;
    const posterDir = `browser-drafts/${format.id}`;
    await mkdir(join(output, rawDir), { recursive: true });
    await mkdir(join(output, posterDir), { recursive: true });
    await call('Emulation.setDeviceMetricsOverride', { width: format.vw, height: format.vh, deviceScaleFactor: format.scale, mobile: !format.id.endsWith('ipad') });
    await call('Emulation.setTouchEmulationEnabled', { enabled: true });
    await call('Page.navigate', { url: origin });
    await waitFor("document.querySelector('#chart-form')");
    await evaluate(`(() => {
      localStorage.setItem('zhiming.theme.v1', 'light');
      localStorage.setItem('zhiming.lastInput.v2', ${JSON.stringify(JSON.stringify(sample))});
      localStorage.setItem('zhiming.records.v3', ${JSON.stringify(JSON.stringify(records))});
      localStorage.setItem('zhiming.backup.v1', JSON.stringify({lastExport:new Date().toISOString()}));
    })()`);
    await call('Page.navigate', { url: `${origin}/?store-capture=${format.id}#/chart` });
    await waitFor("document.querySelector('.chart-card') && document.documentElement.dataset.theme === 'light'");
    for (const scene of scenes) {
      if (scene.hash) {
        await navigate(scene.hash, scene.ready);
        if (!format.id.endsWith('ipad')) await align(scene.id === '04-records' ? '.records-tags' : '.articles');
      } else {
        await navigate('#/chart', "document.querySelector('.chart-card')");
        if (scene.dark) {
          await evaluate("document.querySelector('[data-action=theme]').click()");
          await waitFor("document.documentElement.dataset.theme === 'dark'");
        }
        if (scene.id === '03-luck') {
          await evaluate("document.querySelector('[data-luck-index=\"3\"]').click()");
          await waitFor("document.querySelector('[data-luck-index=\"3\"]').getAttribute('aria-selected') === 'true'");
          await evaluate("document.querySelector('[data-luck-index=\"3\"]').scrollIntoView({inline:'center',block:'nearest',behavior:'instant'})");
        }
        await align(scene.selector);
      }
      const overflow = await evaluate('document.documentElement.scrollWidth > innerWidth + 1');
      if (overflow) throw new Error(`Horizontal overflow: ${format.id} ${scene.id}`);
      const rawPath = `${rawDir}/${scene.id}.png`;
      await screenshot(join(output, rawPath));
      manifest.screenshots.push({ format: format.id, scene: scene.id, raw: rawPath, poster: `${posterDir}/${scene.id}.png`, alt: scene.alt, width: format.width, height: format.height });
      console.log(`Captured ${format.id}/${scene.id}`);
    }
  }
  await navigate('#/records', "document.querySelector('.record-card')");
  const searchId = await evaluate("document.querySelector('input[type=search]').id");
  await evaluate(`(() => { const field = document.getElementById(${JSON.stringify(searchId)}); field.value = '完全不存在的命例'; field.dispatchEvent(new Event('input', {bubbles:true})); })()`);
  const visibleRecords = await evaluate("[...document.querySelectorAll('.record-card')].filter(node => !node.hidden && getComputedStyle(node).display !== 'none').length");
  if (visibleRecords !== 0) throw new Error('Empty search regression.');
  manifest.checks.push('命例搜尋無結果：不顯示命例卡片');
  await navigate('#/compare', "document.querySelector('.compare-grid')");
  if (await evaluate("document.querySelectorAll('.compare-grid > *').length") !== 2) throw new Error('Two-chart comparison failed.');
  manifest.checks.push('雙盤合參：兩張虛構命例可並列');
  await navigate('#/', "document.querySelector('#chart-form')");
  await evaluate("document.querySelector('#f-time-unknown').click();document.querySelector('#chart-form').requestSubmit()");
  await waitFor("document.querySelector('.correction-note.warn')");
  manifest.checks.push('時辰未知：出現估算與略去時柱提示');
  await call('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await navigate('#/learn', "document.querySelector('.learn-layout')");
  await navigate('#/chart', "document.querySelector('.chart-card')");
  manifest.checks.push('已載入後斷網：學堂與排盤路由仍可操作');
  await call('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  if (browserErrors.length) throw new Error(`Browser errors: ${browserErrors.join('; ')}`);
  manifest.checks.push('18 個畫面無整頁水平溢出；無 JavaScript 未捕捉例外');
  for (const image of manifest.screenshots) {
    const format = formats.find(item => item.id === image.format);
    const index = scenes.findIndex(item => item.id === image.scene);
    const imageData = `data:image/png;base64,${(await readFile(join(output, image.raw))).toString('base64')}`;
    await renderHtml(posterHtml(format, scenes[index], imageData, index), format.width, format.height, join(output, image.poster));
  }
  const featureHtml = `<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;width:1024px;height:500px;overflow:hidden;background:#eee3cd;color:#33251c;font-family:-apple-system,'PingFang TC',sans-serif}
  .orb{position:absolute;width:590px;height:590px;border:1px solid #a8885750;border-radius:50%;right:-140px;top:-45px;box-shadow:0 0 0 45px #a8885710,0 0 0 90px #a8885708}
  .copy{position:absolute;left:72px;top:99px}.name{font-size:23px;letter-spacing:.3em;color:#8b362b;font-weight:600}h1{font:600 48px/1.45 'Songti TC','Songti SC',serif;letter-spacing:.08em;margin:19px 0 20px}p{font-size:18px;letter-spacing:.1em;color:#756246}
  .pillars{position:absolute;right:66px;top:121px;display:flex;gap:13px;transform:rotate(-4deg)}.col{width:67px;height:240px;border:1px solid #c7b28d;background:#faf6ed;box-shadow:0 14px 24px -18px #71411c70;border-radius:34px;text-align:center;padding-top:20px}.col small{font-size:13px;color:#82725b;letter-spacing:.15em}.col b{display:block;font:500 43px/1.7 'Songti TC','Songti SC',serif;margin-top:4px}.wood{color:#3e6a4e}.fire{color:#ae4032}.earth{color:#967034}.water{color:#3c6074}
  </style><div class="orb"></div><div class="copy"><div class="name">知命 · 四柱八字</div><h1>以節氣為綱<br>讀時間的脈絡</h1><p>本機排盤 · 命例整理 · 傳統文化研習</p></div><div class="pillars"><div class="col"><small>年柱</small><b class="earth">己</b><b class="fire">巳</b></div><div class="col"><small>月柱</small><b class="fire">丙</b><b class="water">子</b></div><div class="col"><small>日柱</small><b class="fire">丙</b><b class="wood">寅</b></div><div class="col"><small>時柱</small><b class="wood">甲</b><b class="fire">午</b></div></div></html>`;
  await renderHtml(featureHtml, 1024, 500, join(output, 'google-play-feature-1024x500.png'));
  await sharp(join(root, 'assets/icons/icon-512.png')).resize(512, 512).ensureAlpha().png().toFile(join(output, 'google-play-icon-512.png'));
  await sharp(join(root, 'assets/icons/icon-1024.png')).resize(1024, 1024).removeAlpha().png().toFile(join(output, 'app-store-icon-1024.png'));
  const thumbs = await Promise.all(manifest.screenshots.filter(image => image.format === 'app-store-iphone').map(async (image, index) => ({
    input: await sharp(join(output, image.poster)).resize({ width: 301 }).toBuffer(), left: 20 + index * 321, top: 20,
  })));
  await sharp({ create: { width: 1946, height: 695, channels: 3, background: '#e4dac6' } }).composite(thumbs).png().toFile(join(output, 'contact-sheet.png'));
  await writeFile(join(output, 'screenshots.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  const cards = formats.map(format => `<section><h2>${esc(format.label)} <small>${format.width} × ${format.height}</small></h2><div class="grid">${manifest.screenshots.filter(image => image.format === format.id).map(image => `<figure><a href="${image.poster}"><img src="${image.poster}" alt="${esc(image.alt)}" loading="lazy"></a><figcaption>${esc(scenes.find(scene => scene.id === image.scene).title)}<br><a href="${image.raw}">原始網頁截圖</a> · <a href="${image.poster}" download>下載排版稿</a></figcaption></figure>`).join('')}</div></section>`).join('');
  await writeFile(join(output, 'index.html'), `<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>知命 · 商店素材預覽</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f3eddf;color:#251f19;font:16px/1.7 -apple-system,'PingFang TC',sans-serif}main{max-width:1440px;margin:auto;padding:48px 30px}h1,h2{font-family:'Songti TC','Songti SC',serif}h1{font-size:40px;margin:0}h2{margin:48px 0 20px}small{font:14px -apple-system,sans-serif;color:#766a57}a{color:#953c2e;text-underline-offset:4px}.notice{max-width:1000px;padding:18px 22px;border:1px solid #c9bca5;background:#faf6ec;border-radius:12px;margin:24px 0}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}figure{margin:0}img{width:100%;display:block;border-radius:9px;border:1px solid #d7c7aa}figcaption{font-size:14px;padding:10px 0 18px}nav{display:flex;gap:24px;flex-wrap:wrap}.feature{max-width:850px}.icons{display:flex;gap:20px}.icons img{width:110px}.tag{color:#953c2e;letter-spacing:.18em;font-size:12px}@media(max-width:760px){main{padding:30px 18px}.grid{grid-template-columns:repeat(2,1fr);gap:14px}h1{font-size:32px}}@media(max-width:420px){.grid{grid-template-columns:1fr}}
  </style><main><div class="tag">ZHIMING / STORE ASSETS / 繁體中文</div><h1>知命，商店素材。</h1><p>一套安靜、清楚，以真實功能為主的上架素材草稿。</p><div class="notice"><strong>截圖狀態：網頁版實際渲染的排版草稿，尚不可直接視為原生送審截圖。</strong><br>使用隔離的瀏覽器與虛構命例，沒有修改 App 畫面來假裝未實作功能。尺寸符合指定素材規格；iOS／Android 字型、狀態列、安全區與原生互動仍須以實際 App 重新擷取核對。圖示與主題圖片為獨立品牌素材。尚未上傳或發布。</div><nav><a href="listing-copy.md">商店文案</a><a href="listing.json">文案 JSON</a><a href="contact-sheet.png">六張總覽</a><a href="screenshots.json">來源與尺寸清單</a></nav>${cards}<section><h2>Google Play 主題圖片 <small>1024 × 500</small></h2><a href="google-play-feature-1024x500.png" download><img class="feature" src="google-play-feature-1024x500.png" alt="知命四柱八字，以節氣為綱，讀時間的脈絡；本機排盤、命例整理與傳統文化研習。"></a><h2>商店圖示</h2><div class="icons"><a href="google-play-icon-512.png" download><img src="google-play-icon-512.png" alt="Google Play 512 像素知命圖示"></a><a href="app-store-icon-1024.png" download><img src="app-store-icon-1024.png" alt="App Store 1024 像素知命圖示"></a></div></section></main></html>\n`);
  console.log(`Prepared ${manifest.screenshots.length} screenshot drafts, feature graphic, icons and gallery.`);
} finally {
  await send('Browser.close').catch(() => {});
  socket.close();
}
