const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sw = read('sw.js');
const html = read('index.html');
const manifest = JSON.parse(read('manifest.webmanifest'));

function shellFiles() {
  const block = sw.match(/const APP_SHELL_FILES = \[([\s\S]*?)\];/);
  assert.ok(block, 'APP_SHELL_FILES list exists');
  return [...block[1].matchAll(/['"]([^'"]+)['"]/g)].map(match => match[1]);
}

test('every service-worker precache entry maps to a packaged file', () => {
  for (const entry of shellFiles()) {
    const local = entry === './' ? 'index.html' : entry.replace(/^\.\//, '');
    assert.ok(fs.existsSync(path.join(root, local)), `missing precache file: ${entry}`);
  }
});

test('manifest start URL and icons point to packaged local assets', () => {
  assert.ok(manifest.start_url.startsWith('./'));
  for (const icon of manifest.icons) {
    assert.ok(icon.src.startsWith('./'), `icon path must be relative: ${icon.src}`);
    assert.ok(fs.existsSync(path.join(root, icon.src.replace(/^\.\//, ''))), `missing icon: ${icon.src}`);
  }
});

test('HTML internal script, stylesheet, manifest, and icons use relative paths', () => {
  for (const pattern of [/<script[^>]+src="([^"]+)"/g, /<link[^>]+href="([^"]+)"/g]) {
    for (const match of html.matchAll(pattern)) {
      const value = match[1];
      if (value.startsWith('http:') || value.startsWith('https:') || value.startsWith('mailto:') || value.startsWith('#')) continue;
      assert.ok(value.startsWith('./') || value.startsWith('../'), `expected relative URL, got ${value}`);
    }
  }
});

test('service-worker registration is guarded for secure contexts and scoped to this app path', () => {
  assert.match(html, /"serviceWorker"\s+in\s+navigator/);
  assert.match(html, /location\.protocol\s*===\s*"https:"/);
  assert.match(html, /location\.hostname\s*===\s*"localhost"/);
  assert.match(html, /scope:\s*new URL\("\.\/", document\.baseURI\)\.pathname/);
  assert.match(html, /updateViaCache:\s*"none"/);
});

test('cache version and docs consistently identify v7', () => {
  assert.match(sw, /const CACHE_VERSION = 'v7'/);
  assert.match(read('SERVICE-WORKER-NOTES.md'), /who-goes-first-shell-v7/);
  assert.match(read('README.md'), /Release 3 — Pass 7/);
});

test('service worker cleanup is restricted to app-owned cache prefix', () => {
  assert.match(sw, /name\.startsWith\(CACHE_PREFIX\)\s*&&\s*name\s*!==\s*CACHE_NAME/);
});
