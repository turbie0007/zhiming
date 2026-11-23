import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const script = fileURLToPath(new URL('./release.mjs', import.meta.url));
const root = fileURLToPath(new URL('../', import.meta.url));
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('ZHIMING_')));

function reject(args, expected, extraEnv = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root, env: { ...env, ...extraEnv }, encoding: 'utf8', timeout: 10000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stderr, expected);
  assert.equal(result.stdout, '');
  assert.ok(!result.stderr.includes('test-password-do-not-print'));
}

for (const args of [[], ['windows'], ['android', '--publish'], ['ios', '--unsigned', '--unsigned'], ['android', '--unsigned', '--publish']]) {
  test(`reject invalid arguments: ${JSON.stringify(args)}`, () => reject(args, /Usage:/));
}

test('Android fails before building when signing credentials are missing', () => {
  reject(['android'], /Release signing requires: ZHIMING_KEYSTORE_FILE/);
});

test('Android never prints a provided password when other credentials are missing', () => {
  reject(['android'], /ZHIMING_KEYSTORE_FILE/, { ZHIMING_KEYSTORE_PASSWORD: 'test-password-do-not-print' });
});

const signing = {
  ZHIMING_KEYSTORE_PASSWORD: 'test-password-do-not-print',
  ZHIMING_KEY_ALIAS: 'test-alias',
  ZHIMING_KEY_PASSWORD: 'test-password-do-not-print',
};

test('Android rejects a relative keystore path', () => {
  reject(['android'], /existing absolute file path/, { ...signing, ZHIMING_KEYSTORE_FILE: 'key.jks' });
});

test('Android rejects a keystore inside the repository without reading it', () => {
  reject(['android'], /outside this repository/, { ...signing, ZHIMING_KEYSTORE_FILE: script });
});

if (process.platform === 'darwin') {
  test('iOS requires an explicit Apple Developer team', () => {
    reject(['ios'], /ZHIMING_APPLE_TEAM_ID/);
  });
  test('iOS rejects invalid Apple Developer team values', () => {
    reject(['ios'], /ZHIMING_APPLE_TEAM_ID/, { ZHIMING_APPLE_TEAM_ID: 'invalid;value' });
  });
}
