# Who Goes First? 🌻

A cozy botanical multitouch web app for deciding who starts a board game. Designed for iPhone and iPad, and deployable to GitHub Pages without a build step or dependencies.

## Play

1. Open the app on a touchscreen.
2. Each player places and holds one finger in the garden (2–6 players).
3. Every new finger restarts the two-second joining window.
4. When the garden has been untouched for two seconds, plants grow during a two-second countdown.
5. One player is randomly selected: their plant blooms into a sunflower; the others return to seeds.
6. Tap **Play again** to start a fresh round.

## Features

- Tracks separate simultaneous pointer IDs (up to six participants).
- Two-second join window resets when a participant joins or leaves.
- Two-second growth countdown uses elapsed time rather than assuming each timer callback runs exactly on time.
- Cryptographically strong random selection with unbiased rejection sampling using Web Crypto; no weaker pseudo-random fallback.
- Touch-friendly layout, safe-area padding, `touch-action: none`, and no external libraries.
- Optional synthesized sound and vibration; both degrade gracefully when unavailable.
- Dark mode is the default; the header toggle switches to light mode and remembers the choice on this device.
- Respects `prefers-reduced-motion`.
- PWA manifest and SVG favicon.
- No analytics, accounts, cookies, external libraries, or third-party runtime dependencies.
- Offline app-shell caching through a service worker on HTTPS (including GitHub Pages), after the app is opened online and the service worker finishes installing.

## Publish with GitHub Pages

1. Create a new repository on GitHub, for example `who-goes-first`.
2. Upload the contents of this project folder to the repository root, including `sw.js`, all icons, the manifest, tests, and documentation.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Choose the `main` branch and `/ (root)`, then save.
6. Wait for GitHub Pages to finish deploying. Your app URL will look like:
   `https://YOUR-USERNAME.github.io/who-goes-first/`

GitHub Pages URLs are case-sensitive. If you use a repository name other than `who-goes-first`, no code changes are needed because asset paths are relative.

## Test checklist

- [ ] Two people hold two fingers at the same time.
- [ ] Six people join; a seventh touch is ignored.
- [ ] A new finger joins just before the timer expires; the two-second window restarts.
- [ ] A player lifts their finger while joining; the participant is removed.
- [ ] Fewer than two players remain; the countdown does not choose a winner.
- [ ] Countdown finishes and exactly one sunflower blooms.
- [ ] Other plants reverse back to their seed/bud state.
- [ ] Replay resets all timers and removes the previous round.
- [ ] Rotate between portrait and landscape.
- [ ] Sound off/on and reduced-motion settings work.

## Implementation notes

The app uses Pointer Events, which unify touch and mouse input. Every finger is tracked by its own `pointerId`; a `Map` keeps each participant's plant separate. Timer callbacks are guarded by a round token to prevent stale callbacks from a previous round changing a new one.

A web page cannot guarantee that every physical finger will be reported by every device/browser combination. Test on the actual iPhone/iPad and browser you plan to use. For the best experience, open the deployed HTTPS GitHub Pages URL in Safari. To install, use **Share → Add to Home Screen**.

## License

MIT — see [LICENSE](./LICENSE).


## Attribution

App created by Isabella Navarro, MD. Latest version October 2026. Contact: isaymotion@gmail.com


## Multitouch reliability update (Release 1, Pass 2)

Touch input is tracked by unique iOS touch identifiers. New touches are identified by coordinates inside the garden, avoiding reliance on Safari event targeting. `touchend` and `touchcancel` affect only the corresponding participant; cancellation never clears the whole garden. This update has passed a JavaScript syntax check, but must still be verified on a physical iPhone/iPad with six simultaneous fingers.

## Release 1 — Pass 3: Multi-touch resilience

- Garden touch starts are prevented from triggering browser multi-finger gestures.
- Touches are tracked by native touch identifier, including extra touches rejected after the six-player limit is reached.
- Touch end/cancel events are processed as a batch so one event containing multiple cancelled fingers does not repeatedly reset round timers.
- The game keeps the 2-second lock-in, 2-second growth countdown, secure random winner selection, seedling icon, and attribution.

Validation performed: JavaScript syntax check and ZIP integrity check. Physical iPhone/iPad multi-touch verification is still required.


## Release 1 — Pass 4: safer cancellation recovery

- Normal `touchend` removes only the matching participant during the joining phase.
- `touchcancel` now removes only the cancelled input identifier from active input tracking and preserves that player's plant for the current round. This prevents a batch cancellation from clearing the whole garden.
- A preserved participant whose touch was cancelled remains in the round until the result or the user chooses Replay.
- Lock-in and growth countdowns remain 2 seconds each.

Device testing is still required on physical iPhone/iPad hardware.


## Release 1 — Pass 5: Random selection verification

- The eligible player roster is snapshotted once when the growth countdown ends.
- Winner selection is guarded as a one-shot transition, preventing stale/duplicate countdown callbacks from choosing a second winner.
- Random selection requires Web Crypto and uses rejection sampling to avoid modulo bias. There is no `Math.random()` fallback.
- If secure randomness is unavailable, the round stops safely with a message instead of silently using weaker randomness.
- Valid random-selection bounds are explicitly restricted to 1–6 players.

The project still requires physical iPhone/iPad multitouch regression testing; static validation cannot prove device touch behavior.

## Release 1 — Pass 6: automated regression checks

A small Node.js test suite is included at `tests/secure-random.test.cjs`. It tests the production `secureRandomIndex` function extracted from `app.js`, including supported bounds, invalid bounds, rejection sampling, and fail-closed behavior when Web Crypto is unavailable. It also checks that the six-player limit and touch lifecycle handlers remain present.

Run with Node.js 18 or later:

```sh
node --test tests/secure-random.test.cjs
```

These are code-level regression checks, not a simulated iOS browser or a statistical proof of fairness. Physical iPhone/iPad tests are still required, especially six simultaneous touches, a seventh rejected touch, individual finger lifts, bulk `touchcancel`, and repeated rounds.

## Release 1 — Pass 7: physical-device verification protocol

Use [`DEVICE-TEST-PASS7.md`](./DEVICE-TEST-PASS7.md) to test the deployed HTTPS build on the actual iPhone/iPad. It includes six-finger/seventh-finger regression cases, touch release/cancellation, countdown, repeated rounds, and Home Screen launch. All device scenarios are intentionally marked **Not tested** until a person runs them on hardware and records the result. Automated tests do not prove physical-device behavior.

Note: the app uses native Touch Events as its iOS finger-input source; Pointer Events are retained only for mouse/stylus input. This is why the physical-device checklist is essential.


## Release 2 — Pass 1: gameplay clarity polish

- Player labels now use the lowest available number, so removing a finger and adding a new player during the joining window does not create duplicate player numbers.
- Plant colors follow the displayed player number, keeping the visual identity consistent if a slot is reused.
- The player counter now shows progress toward the six-player limit (`n / 6 players joined`).
- Added clearer keyboard-focus outlines and small-screen spacing adjustments.
- The two-second joining window, two-second growth countdown, secure random selection, and existing touch-event behavior are unchanged.

Validation: JavaScript syntax check, the included secure-random regression suite, and ZIP integrity check. Physical iPhone/iPad tests remain outstanding and should be completed before relying on the app in a live game.

## Release 2 — Pass 2: animation and winner-reveal polish

- Added a short, restrained sprout-arrival animation and a small winner-settle motion.
- Refined the winner glow and flower reveal without making the sunflower excessively large or obscuring the player label.
- Made non-winning plants recede gently as they return toward their seed state.
- Added a brief countdown/banner arrival treatment and explicit reduced-motion overrides.
- Gameplay timings, participant limit, secure random selection, and attribution remain unchanged.

Validation in this pass covers source syntax and archive integrity only. Please verify animation timing and legibility on the physical iPhone/iPad during the planned device-testing stage.


## Release 2 — Flower/stem alignment hotfix

- Repositioned the complete sunflower head artwork downward by 16 SVG viewBox units so the lower petals meet the stem endpoint.
- Kept all petals, seed center, and decorative details together as one aligned head; the bloom animation still scales around its existing origin.
- This is a source-level geometry fix. Confirm the visual result in Safari on the target iPhone/iPad; no physical-device test has been performed here.

## Release 2 — Pass 3: winner and end-of-round clarity

- The result banner can wrap on narrow screens instead of forcing a single long line that may overflow the garden.
- The winning player's label has a little more room and padding so the “Goes first” state is easier to read.
- The Play again control receives a restrained result-state highlight after a winner is selected, then returns to its normal appearance when a new round begins.
- The sunflower/stem alignment hotfix is retained; this pass does not change the flower SVG geometry or its animation transform.
- Game timings, six-player limit, and secure random selection remain unchanged.

Validation: JavaScript syntax, the included Node.js random-selection regression tests, and ZIP integrity checks. Visual behavior still needs confirmation in Safari on the target device.


## Release 2 — Pass 5: accessibility and interaction resilience
- Restored browser zoom support by removing `maximum-scale=1` and `user-scalable=no` from the viewport declaration.
- Made the player count a polite, atomic live region and the primary status heading an accessible status announcement.
- Added a keyboard focus target and descriptive relationship for the garden interaction area; improved focus visibility for buttons, links, and the garden.
- Improved repeated live announcements so identical status messages can be announced again by assistive technology.
- Kept reduced-motion preference responsive if the operating-system setting changes while the app is open.
- Added narrow-screen control spacing and forced-colors focus styling.
- Validation: JavaScript syntax, secure-random regression tests, and ZIP integrity checked. Actual VoiceOver/Safari and device testing remains required.

### Release 2 — Pass 6: gameplay edge cases
- Hardened interrupted-round cleanup so cancellation clears countdown/anticipation/reveal UI and restores player labels without deleting the garden unexpectedly.
- Replay continues to invalidate old callbacks with the round token before clearing timers, protecting a fresh round from stale timer work.
- Added regression assertions for interrupted-round cleanup, stale timer guards, six-player cap, and locked countdown/result input.
- Validation: run `node --check app.js` and `node --test tests/secure-random.test.cjs`.
- Device testing of rapid replay, real six-finger input, and interrupted Safari touch sequences remains outstanding.


## Display themes

The app starts in dark mode unless a saved theme choice exists. Use the sun/moon button in the header to switch between dark and light modes; the choice is stored locally in this browser. If local storage is unavailable, the toggle still works for the current page session. Theme changes also update the browser status-bar color.

## Release 3 — Pass 1: offline-first app shell

- Added `sw.js` to precache the app shell, stylesheet, game logic, manifest, and local icons after a successful online load.
- The service worker is registered on HTTPS/localhost and uses relative URLs so it works at a GitHub Pages project path as well as a domain root.
- Navigation uses network-first with a cached `index.html` fallback; same-origin static assets use cache-first. Requests outside this app's origin/path are not intercepted.
- Old caches created by this app are cleaned up on activation. To change the shell cache version in a future release, update `CACHE_VERSION` in `sw.js`.
- Added offline checks to [`RELEASE-ACCEPTANCE-CHECKLIST.md`](./RELEASE-ACCEPTANCE-CHECKLIST.md). A successful code-level install check is not proof of offline behavior on iOS; complete the physical-device test after deployment.
- Automated syntax, regression, shell-file, and ZIP-integrity checks are included in this release validation. Physical iPhone/iPad, VoiceOver, Home Screen, and offline reload behavior remain unverified until tested on actual hardware.


## Release 3 — Pass 2: offline support regression checks

- Bumped the app-shell cache version so the next service-worker installation uses a fresh cache namespace.
- Added `tests/service-worker.test.cjs` to check precache coverage, cache lifecycle, scope boundaries, navigation fallback, registration guards, and the offline-testing disclaimer.
- These tests verify source contracts; they do not replace testing in a real browser with network disabled.

Run all automated checks with Node.js 18 or later:

```sh
node --check app.js
node --check sw.js
node --test tests/*.test.cjs
```


## Release 3 — Pass 3: simulated service-worker lifecycle

- Bumped the app-shell cache to `v3` for this release.
- Added `tests/service-worker-runtime.test.cjs`, which executes the service worker in a lightweight mocked runtime and checks install precaching, activation cleanup, offline navigation fallback, cached static assets, and origin/path boundaries.
- These simulations improve coverage beyond source-pattern checks but do not prove behavior in Safari or on a physical iPhone/iPad. Complete the deployed-device offline checklist before relying on offline play.

Run all checks with Node.js 18 or later:

```sh
node --check app.js
node --check sw.js
node --test tests/*.test.cjs
```


## Release 3 — Pass 4: deployment and update resilience

- Bumped the shell cache to `v4` so deployed clients install a fresh app-shell cache.
- Service-worker registration now sets `updateViaCache: "none"`, reducing the chance that browser HTTP cache entries delay fetching an updated worker script or its imports.
- Added a runtime test proving precached asset URLs resolve under a GitHub Pages project subpath, not only at the domain root.
- Keep the `sw.js` file beside `index.html`; publish the folder contents, not the containing directory. After deploying, visit the HTTPS site online, reload, and perform the Airplane Mode test. These automated checks do not verify the live GitHub Pages deployment or physical-device behavior.


## Release 3 — Pass 5: production-readiness checks

- Bumped the app-shell cache namespace to `v6` for this package.
- Added automated checks for GitHub Pages-safe relative asset paths, manifest start URL/icon references, app-specific cache ownership, and offline/update documentation.
- The service worker only deletes caches with this app's own prefix; unrelated caches are preserved.
- Installation uses `cache.addAll`, so a failed precache rejects installation rather than activating a partially populated new worker. Retry online after correcting any missing or inaccessible asset.
- Validation commands: `node --check app.js`, `node --check sw.js`, and `node --test tests/*.test.cjs`. Actual GitHub Pages, Safari, Home Screen, and Airplane Mode testing remains a manual acceptance step.


## Release 3 — Pass 6: navigation recovery

- Bumped the app-shell cache namespace to `v6`.
- Navigation requests now fall back to the last known-good cached app shell when the network responds with a non-success HTTP status, not only when `fetch()` throws.
- Added runtime checks for HTTP-error fallback and successful network refresh of the cached app shell.
- This improves resilience during transient deployment errors; real Safari/iOS testing remains required.


## Release 3 — Pass 7: final offline-readiness audit

- Bumped the app-shell cache namespace to `v7`.
- Added package-level checks that all service-worker precache entries exist, manifest references resolve to packaged assets, and internal URLs are relative so GitHub Pages repository subpaths remain supported.
- Added checks for secure-context registration and cache-version/documentation consistency.
- Automated checks are not a substitute for testing the deployed HTTPS URL in Safari, installing to the Home Screen, and reloading in Airplane Mode.
