# Offline support notes

This app shell is cached by `sw.js` after a successful online visit over HTTPS (GitHub Pages uses HTTPS). The first visit still requires a network connection, and the service worker may need a moment to install and take control.

## Deployment

Publish the **contents** of this folder, including `sw.js`, to the GitHub Pages publishing root. Keep `sw.js` alongside `index.html`; do not place it in a nested folder unless the registration path and scope are adjusted.

## Cache updates

`CACHE_VERSION` in `sw.js` is the cache version (currently `v7`). Bump it when a release changes the app shell. Activation deletes older caches owned by this app. A normal deployment should keep the filenames stable and update the cache version when shipping changed files.

## Known limits

- Offline launch is not guaranteed until tested on the deployed HTTPS site and target device.
- First-ever load requires internet access.
- The service worker caches only this app's same-origin shell; it does not cache third-party sites or API data.
- iOS may delay service-worker lifecycle events or evict site data under storage pressure.
- This app has no server-side game state. Preferences such as theme remain in local browser storage.


## Automated checks

Run `node --check sw.js` and `node --test tests/*.test.cjs`. The service-worker tests check the app-shell list and source contracts. `tests/service-worker-runtime.test.cjs` also runs the worker in a mocked runtime to exercise precaching, activation cleanup, cached offline navigation, offline assets, and request boundaries. These simulations are not a substitute for a real browser/iOS offline test.


## Update resilience (Pass 4)

Registration sets `updateViaCache: "none"` to reduce HTTP-cache delays when checking for a new worker script. The app-shell cache version is now `v7`. Deploy all files together, open the HTTPS app online, and reload to allow update checks to run. A mocked project-subpath test confirms precache URLs are built beneath the service-worker scope; the actual published GitHub Pages path still needs browser verification.


## Pass 5 notes

The app shell cache is now `who-goes-first-shell-v7`. `cache.addAll()` intentionally makes installation fail if any required shell asset cannot be fetched; this is safer than activating a new worker with a partial cache. Activation cleanup is limited to caches whose names start with `who-goes-first-shell-`, preserving unrelated site caches. Automated tests do not substitute for a deployed browser/device offline test.


## Pass 6 — navigation recovery

The app-shell cache is now `who-goes-first-shell-v7`. Navigation requests use the cached app shell when the network request fails or returns a non-success status, helping preserve access during transient hosting/deployment errors. A successful network navigation refreshes the cached `index.html`. This is still a network-first navigation strategy; initial use requires connectivity, and deployed-device testing remains mandatory.


## Pass 7 — final offline-readiness source audit

The shell cache namespace is `who-goes-first-shell-v7`. The new source-audit tests check that every precached file exists in the package, all manifest icon/start URLs resolve to packaged files, local references remain relative for GitHub Pages project paths, and registration is limited to HTTPS or localhost. These are package-level checks only; they do not verify the live deployment, browser storage quota, iOS service-worker scheduling, or actual Airplane Mode behavior.
