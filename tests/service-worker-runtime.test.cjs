const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

function createHarness({ offline = false, networkStatus = 200, scope = 'https://example.test/game/' } = {}) {
  const listeners = {};
  const store = new Map();
  const deleted = [];
  const cacheStorage = {
    async open(name) {
      if (!store.has(name)) store.set(name, new Map());
      const entries = store.get(name);
      return {
        async addAll(urls) {
          for (const url of urls) entries.set(url, new Response(`cached:${new URL(url).pathname}`));
        },
        async match(request) {
          const key = typeof request === 'string' ? request : request.url;
          return entries.get(key) || null;
        },
        async put(request, response) {
          const key = typeof request === 'string' ? request : request.url;
          entries.set(key, response);
        }
      };
    },
    async keys() { return [...store.keys()]; },
    async delete(name) { deleted.push(name); return store.delete(name); }
  };
  let skipWaitingCalled = false;
  let clientsClaimed = false;
  const self = {
    registration: { scope },
    clients: { async claim() { clientsClaimed = true; } },
    addEventListener(type, fn) { listeners[type] = fn; },
    async skipWaiting() { skipWaitingCalled = true; }
  };
  const networkFetch = async request => {
    if (offline) throw new TypeError('Network unavailable');
    return new Response(`network:${request.url}`, { status: networkStatus });
  };
  const context = { self, caches: cacheStorage, fetch: networkFetch, URL, Response, Promise, Map };
  vm.runInNewContext(source, context, { filename: 'sw.js' });
  async function lifecycle(type) {
    let wait;
    listeners[type]({ waitUntil(promise) { wait = promise; } });
    await wait;
  }
  async function fetchRequest(url, { mode = 'cors', method = 'GET' } = {}) {
    let responsePromise;
    const request = { url, mode, method };
    listeners.fetch({ request, respondWith(promise) { responsePromise = promise; } });
    return responsePromise ? await responsePromise : null;
  }
  return { store, deleted, lifecycle, fetchRequest, get skipWaitingCalled() { return skipWaitingCalled; }, get clientsClaimed() { return clientsClaimed; } };
}

test('runtime install precaches shell and asks to activate promptly', async () => {
  const h = createHarness();
  await h.lifecycle('install');
  assert.equal(h.skipWaitingCalled, true);
  assert.equal(h.store.get('who-goes-first-shell-v7').size, 9);
});

test('runtime activation deletes only older caches owned by this app', async () => {
  const h = createHarness();
  h.store.set('who-goes-first-shell-v1', new Map());
  h.store.set('unrelated-site-cache', new Map());
  await h.lifecycle('activate');
  assert.deepEqual(h.deleted, ['who-goes-first-shell-v1']);
  assert.equal(h.clientsClaimed, true);
  assert.ok(h.store.has('unrelated-site-cache'));
});

test('offline navigation returns cached app HTML after network failure', async () => {
  const h = createHarness({ offline: true });
  await h.lifecycle('install');
  const response = await h.fetchRequest('https://example.test/game/some-route', { mode: 'navigate' });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /cached:\/game\/index.html/);
});

test('cached static assets work offline', async () => {
  const h = createHarness({ offline: true });
  await h.lifecycle('install');
  const response = await h.fetchRequest('https://example.test/game/style.css');
  assert.equal(response.status, 200);
  assert.match(await response.text(), /cached:\/game\/style.css/);
});

test('cross-origin and out-of-scope requests are not intercepted', async () => {
  const h = createHarness();
  assert.equal(await h.fetchRequest('https://other.test/game/app.js'), null);
  assert.equal(await h.fetchRequest('https://example.test/game-sibling/app.js'), null);
});


test('runtime precache resolves assets beneath a GitHub Pages project path', async () => {
  const h = createHarness({ scope: 'https://example.test/who-goes-first/' });
  await h.lifecycle('install');
  const entries = h.store.get('who-goes-first-shell-v7');
  assert.ok(entries.has('https://example.test/who-goes-first/index.html'));
  assert.ok(entries.has('https://example.test/who-goes-first/app.js'));
  assert.ok(!entries.has('https://example.test/app.js'));
});


test('navigation falls back to the last known-good app shell on an HTTP error response', async () => {
  const h = createHarness({ networkStatus: 503 });
  await h.lifecycle('install');
  const response = await h.fetchRequest('https://example.test/game/transient-route', { mode: 'navigate' });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /cached:\/game\/index.html/);
});

test('navigation refreshes the cached app shell after a successful network response', async () => {
  const h = createHarness();
  await h.lifecycle('install');
  const response = await h.fetchRequest('https://example.test/game/', { mode: 'navigate' });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /network:https:\/\/example.test\/game\//);
  const cache = h.store.get('who-goes-first-shell-v7');
  assert.ok(cache.has('https://example.test/game/index.html'));
  assert.match(await cache.get('https://example.test/game/index.html').text(), /network:/);
});
