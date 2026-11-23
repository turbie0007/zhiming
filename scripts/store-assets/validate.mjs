import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const directory = join(root, 'store/zh-Hant');
const listing = JSON.parse(await readFile(join(directory, 'listing.json'), 'utf8'));
const copy = await readFile(join(directory, 'listing-copy.md'), 'utf8');
const manifest = JSON.parse(await readFile(join(directory, 'screenshots.json'), 'utf8'));
const limits = {
  appStore: { name: 30, subtitle: 30, promotionalText: 170, keywords: 100, description: 4000, whatsNew: 4000 },
  googlePlay: { title: 30, shortDescription: 80, fullDescription: 4000, releaseNotes: 500 },
};
for (const [platform, fields] of Object.entries(limits)) {
  for (const [field, limit] of Object.entries(fields)) {
    const value = listing[platform][field];
    assert.equal(typeof value, 'string');
    assert.ok(Array.from(value).length <= limit, `${platform}.${field} exceeds ${limit}`);
    assert.ok(copy.includes(value), `Copy document differs from ${platform}.${field}`);
    console.log(`${platform}.${field}: ${Array.from(value).length}/${limit}`);
  }
}
assert.ok(Buffer.byteLength(listing.appStore.keywords, 'utf8') <= 100);
assert.ok(Buffer.byteLength(listing.appStore.reviewNotes, 'utf8') <= 4000);
assert.ok(copy.includes(listing.appStore.reviewNotes));
assert.equal(manifest.status, 'browser-draft-not-for-submission');
assert.equal(manifest.screenshots.length, 18);
for (const [file, hash] of Object.entries(manifest.sources)) {
  assert.equal(createHash('sha256').update(await readFile(join(root, file))).digest('hex'), hash, `App source changed: recapture ${file}`);
}
async function checkImage(file, width, height, alpha = false, sizeLimit = 8 * 1024 * 1024) {
  const path = join(directory, file);
  const metadata = await sharp(path).metadata();
  assert.equal(metadata.format, 'png', file);
  assert.equal(metadata.width, width, file);
  assert.equal(metadata.height, height, file);
  assert.equal(metadata.hasAlpha, alpha, file);
  assert.equal(metadata.space, 'srgb', file);
  assert.ok((await stat(path)).size <= sizeLimit, `File too large: ${file}`);
  const stats = await sharp(path).stats();
  assert.ok(stats.channels.some(channel => channel.stdev > 10), `Image appears blank: ${file}`);
}
for (const format of manifest.formats) {
  const images = manifest.screenshots.filter(image => image.format === format.id);
  assert.equal(images.length, 6);
  assert.equal(new Set(images.map(image => image.scene)).size, 6);
  for (const image of images) {
    assert.ok(Array.from(image.alt).length <= 140);
    await checkImage(image.poster, format.width, format.height);
    await checkImage(image.raw, format.vw * format.scale, format.vh * format.scale);
  }
}
await checkImage('google-play-feature-1024x500.png', 1024, 500);
await checkImage('google-play-icon-512.png', 512, 512, true, 1024 * 1024);
await checkImage('app-store-icon-1024.png', 1024, 1024);
const gallery = await readFile(join(directory, 'index.html'), 'utf8');
for (const match of gallery.matchAll(/(?:href|src)="([^"]+)"/g)) {
  assert.ok(!match[1].includes('://'), 'Gallery should not load remote assets');
  await stat(join(directory, match[1]));
}
const nativePath = join(directory, 'native/native-manifest.json');
if (existsSync(nativePath)) {
  const native = JSON.parse(await readFile(nativePath, 'utf8'));
  assert.equal(native.status, 'native-simulator-capture');
  for (const [name, device] of Object.entries(native.devices)) {
    assert.equal(device.screenshots.length, 6, `Native device ${name} scene count`);
    let previousWidth = 0;
    for (const shot of device.screenshots) {
      const path = join(directory, shot.file);
      const metadata = await sharp(path).metadata();
      assert.equal(metadata.format, 'png', path);
      assert.equal(metadata.hasAlpha, false, `Native capture has alpha: ${path}`);
      assert.equal(metadata.space, 'srgb', path);
      assert.ok((await stat(path)).size <= 8 * 1024 * 1024, `Native capture too large: ${path}`);
      if (previousWidth) assert.equal(metadata.width, previousWidth, `Width drift within ${name}`);
      previousWidth = metadata.width;
      assert.equal(shot.width, metadata.width, path);
      assert.equal(shot.height, metadata.height, path);
      assert.ok(!shot.summary.error, `${path} driver error: ${shot.summary.error}`);
      assert.ok(!shot.summary.overflow, `Horizontal overflow in ${path}`);
    }
  }
  console.log(`Native captures validated: ${Object.keys(native.devices).join(', ')}.`);
}
console.log('PASS: copy limits and parity; 18 posters + 18 raw captures; RGB screenshot sizes; icons; feature graphic; source hashes; gallery links.');
console.log('Browser drafts only. Native recapture, contact details and store submission remain pending.');
