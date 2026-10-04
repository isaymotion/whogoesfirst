const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

test('service worker has a versioned cache and precaches the app shell', () => {
  assert.match(sw, /const CACHE_PREFIX = 'who-goes-first-shell-'/);
  assert.match(sw, /const CACHE_VERSION = 'v\d+'/);
  for (const asset of ['./', './index.html', './style.css', './app.js', './manifest.webmanifest', './favicon.svg', './apple-touch-icon.png', './icon-192.png', './icon-512.png']) {
    assert.ok(sw.includes(`'${asset}'`), `expected app shell asset ${asset}`);
    const local = path.join(root, asset === './' ? 'index.html' : asset.slice(2));
    assert.ok(fs.existsSync(local), `missing precached asset ${local}`);
  }
});

test('service worker installs shell, activates cleanly, and claims clients', () => {
  assert.match(sw, /addEventListener\('install'/);
  assert.match(sw, /cache\.addAll\(urls\)/);
  assert.match(sw, /self\.skipWaiting\(\)/);
  assert.match(sw, /addEventListener\('activate'/);
  assert.match(sw, /caches\.delete\(name\)/);
  assert.match(sw, /self\.clients\.claim\(\)/);
});

test('fetch handler avoids non-GET and cross-scope requests', () => {
  assert.match(sw, /if \(request\.method !== 'GET'\) return/);
  assert.match(sw, /requestURL\.origin !== scopeURL\.origin/);
  assert.match(sw, /!requestURL\.href\.startsWith\(scopeURL\.href\)/);
});

test('navigation has a cached index fallback when network fetch fails', () => {
  assert.match(sw, /if \(request\.mode === 'navigate'\)/);
  assert.match(sw, /catch \(_\)/);
  assert.match(sw, /cache\.match\(new URL\('\.\/index\.html', scopeURL\)\.href\)/);
  assert.match(sw, /status: 503/);
});

test('page registers service worker only in secure contexts or localhost', () => {
  assert.match(html, /"serviceWorker" in navigator/);
  assert.match(html, /location\.protocol === "https:"/);
  assert.match(html, /navigator\.serviceWorker\.register\(new URL\("\.\/sw\.js", document\.baseURI\)/);
  assert.match(html, /updateViaCache: \"none\"/);
});

test('documentation accurately warns that device offline verification is still required', () => {
  assert.match(readme, /offline/i);
  assert.match(readme, /physical iPhone\/iPad/i);
  assert.match(readme, /not guaranteed|not been verified|still required/i);
});


test('GitHub Pages assets and manifest use relative paths', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.start_url, './');
  assert.ok(manifest.icons.some(icon => icon.src === './icon-192.png'));
  assert.ok(manifest.icons.some(icon => icon.src === './icon-512.png'));
  for (const asset of ['./manifest.webmanifest', './favicon.svg', './apple-touch-icon.png', './style.css', './app.js']) {
    assert.ok(html.includes(asset), `expected relative reference ${asset}`);
  }
  assert.ok(!/\b(?:src|href)=["']\/(?!\/)/i.test(html), 'app shell should not hard-code domain-root paths');
});

test('service-worker cache namespace is app-specific and bumped for this release', () => {
  assert.match(sw, /const CACHE_PREFIX = 'who-goes-first-shell-'/);
  assert.match(sw, /const CACHE_VERSION = 'v7'/);
  assert.match(sw, /name\.startsWith\(CACHE_PREFIX\)/);
});

test('offline and update limitations are clearly documented', () => {
  const checklist = fs.readFileSync(path.join(root, 'RELEASE-ACCEPTANCE-CHECKLIST.md'), 'utf8');
  const notes = fs.readFileSync(path.join(root, 'SERVICE-WORKER-NOTES.md'), 'utf8');
  assert.match(checklist, /Airplane Mode/i);
  assert.match(checklist, /physical-device behavior/i);
  assert.match(notes, /CACHE_VERSION/);
});
