import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const platform = process.argv[2];
if (!['ios', 'android'].includes(platform)) throw new Error('Usage: node scripts/native-qa/capture.mjs ios|android');
const bundleId = 'top.turbie.zhiming';
const out = join(root, 'store/zh-Hant/native');
await mkdir(out, { recursive: true });
const driverSrc = await readFile(join(root, 'scripts/native-qa/driver.js'), 'utf8');
const webVersion = (await readFile(join(root, 'index.html'), 'utf8')).match(/style\.css\?v=(\d+)/)?.[1] || 'unknown';

const CHART = [
  { theme: 'light' },
  { click: '[data-action="sample"]' },
  { fill: ['#f-name', '示例甲'] },
  { submit: '#chart-form' },
  { wait: '.chart-card' },
];
const SCENES = [
  { scene: '01-chart', steps: [...CHART, { align: '.chart-card' }] },
  { scene: '02-structure', steps: [...CHART, { align: '.structure-card' }] },
  { scene: '03-luck', steps: [...CHART, { click: '[data-luck-index="3"]' }, { centerX: '[data-luck-index="3"]' }, { align: '.luck-panel' }] },
  { scene: '04-records', steps: [{ theme: 'light' }, { wait: '#chart-form' }, { hash: '#/records' }, { wait: '.record-card' }, { align: '.records-tags' }] },
  { scene: '05-learn', steps: [{ theme: 'light' }, { wait: '#chart-form' }, { hash: '#/learn' }, { wait: '.learn-layout' }, { align: '.articles' }] },
  { scene: '06-dark', steps: [...CHART, { theme: 'dark' }, { align: '.chart-card' }] },
];

function sh(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw new Error(`Cannot run ${command}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} → ${(result.stderr || result.stdout || '').trim()}`);
  return (result.stdout || '').trim();
}

// encoding is required: Capacitor 8 on iOS defaults to base64 and rejects a plain JSON string.
function bootScript(cmd) {
  return `\nconst CMD = ${JSON.stringify({ ...cmd, seed: cmd.scene === '01-chart' })};\nwindow.qaSeedSync(CMD);\nwindow.__qaBoot = (async () => {\n  let result;\n  try { result = await window.qaRun(CMD); }\n  catch (error) { result = { scene: CMD.scene, error: String(error && error.message || error) }; }\n  const fs = window.Capacitor?.Plugins?.Filesystem;\n  if (fs) { await fs.writeFile({ path: 'qa-status.json', data: JSON.stringify(result), directory: 'DOCUMENTS', encoding: 'UTF-8' }); }\n})();\n`;
}

async function updateManifest(deviceName, entry) {
  const path = join(out, 'native-manifest.json');
  const manifest = existsSync(path)
    ? JSON.parse(await readFile(path, 'utf8'))
    : {
        status: 'native-simulator-capture',
        note: 'Captured on iOS Simulator and Android emulator with fictional fixtures. Simulator captures are store-usable; physical-device QA (widgets, notifications, sharing) remains pending.',
        capturedWith: 'scripts/native-qa/capture.mjs',
        appVersion: '1.0.0',
        nativeBuild: 2,
        webVersion,
        bundleId,
        devices: {},
      };
  manifest.webVersion = webVersion;
  manifest.devices[deviceName] = entry;
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

async function verify(path, expectedWidth, expectedHeight) {
  const metadata = await sharp(path).metadata();
  if (metadata.hasAlpha) throw new Error(`${path} has an alpha channel`);
  if (expectedWidth && (metadata.width !== expectedWidth || metadata.height !== expectedHeight)) {
    throw new Error(`${path} is ${metadata.width}x${metadata.height}, expected ${expectedWidth}x${expectedHeight}`);
  }
  return [metadata.width, metadata.height];
}

async function captureIos() {
  const devices = [
    { udid: '224FB2F3-CD75-4711-B3B1-38B736C4A3D2', name: 'ios-iphone' },
    { udid: '432DB336-53A6-4B67-A5A0-D615719963D5', name: 'ios-ipad' },
  ];
  const inventory = JSON.parse(sh('xcrun', ['simctl', 'list', 'devices', '-j']));
  const infos = Object.entries(inventory.devices).flatMap(([runtime, list]) =>
    list.map((item) => ({ ...item, runtime })));
  const appPath = join(root, 'ios/DerivedData/Build/Products/Debug-iphonesimulator/App.app');
  for (const device of devices) {
    const info = infos.find((item) => item.udid === device.udid);
    if (!info) throw new Error(`Simulator ${device.udid} not found`);
    try { sh('xcrun', ['simctl', 'boot', device.udid]); } catch { /* already booted */ }
    sh('xcrun', ['simctl', 'install', device.udid, appPath]);
    let bundle = sh('xcrun', ['simctl', 'get_app_container', device.udid, bundleId, 'bundle']);
    if (!bundle.endsWith('.app')) {
      const inner = readdirSync(bundle).filter((entry) => entry.endsWith('.app'));
      if (inner.length !== 1) throw new Error(`Cannot locate App.app under ${bundle}`);
      bundle = join(bundle, inner[0]);
    }
    const data = sh('xcrun', ['simctl', 'get_app_container', device.udid, bundleId, 'data']);
    const indexPath = join(bundle, 'public/index.html');
    const dir = join(out, device.name);
    await mkdir(dir, { recursive: true });
    const screenshots = [];
    for (const cmd of SCENES) {
      const driverName = `qa-driver-${Date.now()}.js`;
      await writeFile(join(bundle, 'public', driverName), driverSrc + bootScript(cmd));
      const html = (await readFile(indexPath, 'utf8')).replace(/<script src="qa-driver[^"]*"><\/script>/g, '');
      await writeFile(indexPath, html.replace('<script type="module"', `<script src="${driverName}"></script><script type="module"`));
      const statusPath = join(data, 'Documents/qa-status.json');
      await rm(statusPath, { force: true });
      try { sh('xcrun', ['simctl', 'terminate', device.udid, bundleId]); } catch { /* not running */ }
      sh('xcrun', ['simctl', 'launch', device.udid, bundleId]);
      let status = null;
      for (let attempt = 0; attempt < 40 && !status; attempt++) {
        await new Promise((wait) => setTimeout(wait, 1000));
        if (existsSync(statusPath)) {
          const parsed = JSON.parse(await readFile(statusPath, 'utf8'));
          if (parsed.error) throw new Error(`${device.name} ${cmd.scene}: ${parsed.error}`);
          if (parsed.scene === cmd.scene) status = parsed;
        }
      }
      if (!status) throw new Error(`${device.name} ${cmd.scene}: driver status missing`);
      const shot = join(dir, `${cmd.scene}.png`);
      const raw = join(dir, `.raw-${cmd.scene}.png`);
      sh('xcrun', ['simctl', 'io', device.udid, 'screenshot', raw]);
      await sharp(raw).removeAlpha().png().toFile(shot);
      await rm(raw);
      const [width, height] = await verify(shot);
      screenshots.push({ scene: cmd.scene, file: `native/${device.name}/${cmd.scene}.png`, width, height, summary: status });
      console.log(`Captured ${device.name}/${cmd.scene} (${width}x${height})`);
    }
    await updateManifest(device.name, {
      platform: 'ios',
      device: info.name,
      runtime: info.runtime.replace('com.apple.CoreSimulator.SimRuntime.', ''),
      state: info.state,
      capturedAt: new Date().toISOString(),
      screenshots,
    });
  }
}

async function captureAndroid() {
  const serial = 'emulator-5554';
  // A headless-booted emulator sometimes lays out the status bar half off-screen; restarting SystemUI fixes it.
  try {
    sh('adb', ['-s', serial, 'root']);
    await new Promise((wait) => setTimeout(wait, 5000));
    const systemUi = sh('adb', ['-s', serial, 'shell', 'pidof', 'com.android.systemui']).split(/\s+/)[0];
    if (systemUi) sh('adb', ['-s', serial, 'shell', 'kill', systemUi]);
    await new Promise((wait) => setTimeout(wait, 8000));
  } catch { /* non-rooted image: keep the capture as-is */ }
  const apk = join(root, 'android/app/build/outputs/apk/debug/app-debug.apk');
  sh('adb', ['-s', serial, 'install', '-r', apk]);
  sh('adb', ['-s', serial, 'shell', 'am', 'start', '-n', `${bundleId}/.MainActivity`]);
  await new Promise((wait) => setTimeout(wait, 6000));
  const pid = sh('adb', ['-s', serial, 'shell', 'pidof', bundleId]).split(/\s+/)[0];
  sh('adb', ['-s', serial, 'forward', 'tcp:9333', `localabstract:webview_devtools_remote_${pid}`]);
  const targets = await (await fetch('http://127.0.0.1:9333/json/list')).json();
  const page = targets.find((target) => target.type === 'page' && /localhost/.test(target.url));
  if (!page) throw new Error('App WebView target not found');
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolveOpen, reject) => {
    socket.addEventListener('open', resolveOpen, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolveResult, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timed out: ${method}`)); }, 30000);
    pending.set(id, { resolve: resolveResult, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression) => {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      if (await evaluate(`!!(${expression})`)) return;
      await new Promise((wait) => setTimeout(wait, 120));
    }
    throw new Error(`Android WebView never showed: ${expression}`);
  };
  await send('Page.enable');
  await send('Runtime.enable');
  const dir = join(out, 'android-phone');
  await mkdir(dir, { recursive: true });
  const screenshots = [];
  for (const cmd of SCENES) {
    await evaluate("location.hash = '#/'");
    await waitFor("document.querySelector('#chart-form')");
    await evaluate(driverSrc);
    const seeded = await evaluate(`window.qaSeedSync(${JSON.stringify({ ...cmd, seed: cmd.scene === '01-chart' })})`);
    if (seeded === 'seeded') {
      await send('Page.reload', {});
      await waitFor("document.querySelector('#chart-form')");
      await evaluate(driverSrc);
    }
    const status = await evaluate(`window.qaRun(${JSON.stringify(cmd)})`);
    if (status.error) throw new Error(`android-phone ${cmd.scene}: ${status.error}`);
    const shot = join(dir, `${cmd.scene}.png`);
    const result = spawnSync('adb', ['-s', serial, 'exec-out', 'screencap', '-p'], { maxBuffer: 64 * 1024 * 1024 });
    if (result.status !== 0) throw new Error(`screencap failed: ${result.stderr}`);
    await sharp(result.stdout).removeAlpha().png().toFile(shot);
    const [width, height] = await verify(shot);
    screenshots.push({ scene: cmd.scene, file: `native/android-phone/${cmd.scene}.png`, width, height, summary: status });
    console.log(`Captured android-phone/${cmd.scene} (${width}x${height})`);
  }
  socket.close();
  await updateManifest('android-phone', {
    platform: 'android',
    device: sh('adb', ['-s', serial, 'shell', 'getprop', 'ro.product.model']),
    os: `Android ${sh('adb', ['-s', serial, 'shell', 'getprop', 'ro.build.version.release'])} (API ${sh('adb', ['-s', serial, 'shell', 'getprop', 'ro.build.version.sdk'])})`,
    capturedAt: new Date().toISOString(),
    screenshots,
  });
}

if (platform === 'ios') await captureIos();
else await captureAndroid();
console.log(`${platform} native capture complete. Simulator only; physical-device QA still pending.`);
