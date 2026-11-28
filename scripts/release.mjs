import { copyFileSync, existsSync, mkdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = realpathSync(join(dirname(fileURLToPath(import.meta.url)), '..'));
const [platform, ...flags] = process.argv.slice(2);
const unsigned = flags.includes('--unsigned');

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', env: process.env });
  if (result.error) throw new Error(`Cannot run ${command}: ${result.error.code}`);
  if (result.status !== 0) throw new Error(`${command} failed; no release artifact was confirmed.`);
}

function preflight() {
  if (!['android', 'ios'].includes(platform) || flags.length > 1 || flags.some((flag) => flag !== '--unsigned')) {
    throw new Error('Usage: node scripts/release.mjs android|ios [--unsigned]');
  }
  if (platform === 'ios' && process.platform !== 'darwin') {
    throw new Error('iOS archives require macOS and Xcode.');
  }
  if (unsigned) return;
  if (platform === 'ios') {
    if (!/^[A-Z0-9]{10}$/.test(process.env.ZHIMING_APPLE_TEAM_ID || '')) {
      throw new Error('Set ZHIMING_APPLE_TEAM_ID to your Apple Developer Team ID; local signing certificates and profiles are also required.');
    }
    return;
  }
  const required = ['ZHIMING_KEYSTORE_FILE', 'ZHIMING_KEYSTORE_PASSWORD', 'ZHIMING_KEY_ALIAS', 'ZHIMING_KEY_PASSWORD'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Release signing requires: ${missing.join(', ')}. No keys will be generated.`);
  const keyFile = process.env.ZHIMING_KEYSTORE_FILE;
  if (!isAbsolute(keyFile) || !existsSync(keyFile) || !statSync(keyFile).isFile()) {
    throw new Error('ZHIMING_KEYSTORE_FILE must be an existing absolute file path.');
  }
  const keyRelative = relative(root, realpathSync(keyFile));
  if (!isAbsolute(keyRelative) && keyRelative !== '..' && !keyRelative.startsWith(`..${sep}`)) {
    throw new Error('Keep the release keystore outside this repository.');
  }
}

try {
  preflight();
  if (unsigned) console.log('UNSIGNED verification only — this artifact cannot be submitted to a store.');
  run(process.execPath, ['tools/build-widget-data.mjs']);
  run(process.execPath, ['scripts/build-web.mjs']);
  run(join(root, 'node_modules', '.bin', 'cap'), ['sync', platform]);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const output = join(root, 'artifacts', platform, `${stamp}-${unsigned ? 'unsigned' : 'signed'}`);
  if (platform === 'android') {
    run(join(root, 'android', 'gradlew'), [
      ':app:bundleRelease', '--no-daemon', '--no-configuration-cache',
      `-PzhimingUnsignedRelease=${unsigned}`,
    ], join(root, 'android'));
    mkdirSync(output, { recursive: true });
    const artifact = join(output, unsigned ? 'zhiming-unsigned.aab' : 'zhiming-signed.aab');
    copyFileSync(join(root, 'android/app/build/outputs/bundle/release/app-release.aab'), artifact);
    console.log(`AAB: ${artifact}`);
  } else {
    mkdirSync(output, { recursive: true });
    const artifact = join(output, unsigned ? 'Zhiming-unsigned.xcarchive' : 'Zhiming.xcarchive');
    run('xcodebuild', [
      '-project', 'ios/App/App.xcodeproj', '-scheme', 'App', '-configuration', 'Release',
      '-destination', 'generic/platform=iOS', '-archivePath', artifact,
      '-derivedDataPath', join(root, 'ios/DerivedData'),
      ...(unsigned ? ['CODE_SIGNING_ALLOWED=NO'] : [`DEVELOPMENT_TEAM=${process.env.ZHIMING_APPLE_TEAM_ID}`, '-allowProvisioningUpdates']),
      'archive',
    ]);
    console.log(`Archive: ${artifact}`);
  }
  console.log('Local build only. Nothing was uploaded or published.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
