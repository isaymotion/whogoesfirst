# Who Goes First? — Release 3 Offline-First Acceptance Checklist

Use this checklist before treating a deployment as ready for a live board-game session. The service worker is intended to support offline launch after an initial successful online visit, but automated checks do not replace real iPhone/iPad testing.

## Package and GitHub Pages

- [ ] Upload the **contents** of this folder to the repository root (not the enclosing folder).
- [ ] Confirm `index.html`, `app.js`, `style.css`, `sw.js`, `manifest.webmanifest`, `favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, and `icon-512.png` are in the published root.
- [ ] Open the GitHub Pages HTTPS URL and confirm there are no missing-file errors in browser developer tools.
- [ ] Confirm dark mode appears on a first visit; switch to light mode and reload; switch back to dark and reload.
- [ ] Confirm the installed Home Screen app icon and standalone launch on the target iPhone/iPad.

## Gameplay on physical hardware

- [ ] Test 2, 3, 4, 5, and 6 simultaneous fingers.
- [ ] With six participants present, add a seventh finger and verify the existing garden remains intact.
- [ ] During the joining window, lift one finger and verify only that participant is removed.
- [ ] Trigger or observe an interrupted/cancelled touch sequence and verify the garden does not unexpectedly clear.
- [ ] Verify the join window is 2 seconds and growth countdown is 2 seconds.
- [ ] Verify exactly one winner is revealed and other plants recede.
- [ ] Tap **Play again** rapidly several times; confirm old animations/timers do not affect the new round.
- [ ] Test sound and vibration toggles. Confirm the game remains playable when either is off or unsupported.
- [ ] Rotate portrait/landscape and check result text, settings buttons, and player labels do not overlap.

## Accessibility and resilience

- [ ] Test VoiceOver labels and announcements.
- [ ] Test keyboard focus on supported devices/browsers.
- [ ] Enable Reduce Motion and confirm animations are reduced.
- [ ] Test a narrow screen and browser zoom.
- [ ] Open the app online and wait for service-worker installation to finish before testing offline mode.
- [ ] In Safari, confirm the service worker is controlling the app (where browser diagnostics are available), then close the tab/app.
- [ ] Enable Airplane Mode and reopen/reload the app from the same HTTPS URL; confirm the game UI and icons load.
- [ ] While offline, play a complete round and toggle dark/light mode; confirm the app remains responsive.
- [ ] Restore network, reload once, and check that the current release still works.
- [ ] If offline launch fails, reconnect and open the app online once more; wait for installation and retry. Do not mark offline support verified until it succeeds on the target device.

## Sign-off record

- Device/model and OS: ______________________________
- Browser/version: __________________________________
- Date tested: ______________________________________
- Tester: ___________________________________________
- Failed checks / notes: _____________________________

Mark an item complete only after observing it on the target device. Automated tests are code-level checks, not evidence of successful physical-device behavior.


## Release 3, Pass 2 — automated offline checks

- [ ] Run `node --check sw.js` and `node --test tests/*.test.cjs`.
- [ ] Deploy the complete folder to the GitHub Pages publishing root, including `sw.js`.
- [ ] Load the deployed HTTPS URL online and wait for service-worker installation.
- [ ] Reload once online, then enable Airplane Mode and reload again.
- [ ] Confirm the game UI and local icons load; play a full round offline.
- [ ] Restore network and verify a new deployment can update the app shell.

Automated source-contract tests do not count as browser/device offline verification.


## Release 3, Pass 4 — deployment/update checks

- [ ] Confirm the published app URL includes the expected repository path and all assets load from that path.
- [ ] Open the app online, reload after deployment, and allow the service worker to check for updates.
- [ ] Deploy a later version and verify the new UI appears after the browser completes its service-worker update lifecycle.
- [ ] Confirm a previously cached app still opens offline during the update process, then verify the new version after reconnecting.


## Release 3, Pass 5 — production-readiness checks

- [ ] Confirm every local asset request resolves beneath the GitHub Pages repository path, not the domain root.
- [ ] Confirm the manifest `start_url` and icon URLs resolve correctly on the deployed project page.
- [ ] Confirm a failed initial asset download does not result in a successfully installed partial app shell; reconnect and retry.
- [ ] Confirm activation removes only `who-goes-first-shell-*` caches and preserves unrelated site caches.
- [ ] Run `node --check app.js`, `node --check sw.js`, and `node --test tests/*.test.cjs`.
- [ ] Still perform the physical Safari/iPhone/iPad Airplane Mode test before considering offline support verified.


## Release 3, Pass 6 — navigation recovery

- [ ] With a previously cached app, verify a navigation HTTP error does not prevent opening the last known-good app shell.
- [ ] Reconnect and verify a successful navigation refreshes the cached `index.html`.
- [ ] Confirm the game still loads and completes a round after an offline reload.


## Release 3, Pass 7 — package audit

- [ ] Confirm `sw.js` is deployed beside `index.html` at the GitHub Pages publishing root.
- [ ] Confirm every precached asset returns successfully from the deployed project path.
- [ ] Open the HTTPS app online twice and check the service worker is activated and controlling the page.
- [ ] Enable Airplane Mode, fully close/reopen or reload the installed app, and play a complete round.
- [ ] Restore connectivity, deploy a changed version, reload, and confirm the new release becomes available without stale/missing assets.
- [ ] Confirm other sites hosted on the same origin continue to work; cache cleanup must only remove `who-goes-first-shell-*` caches.

Automated package checks do not mark these device/browser items as passed.
