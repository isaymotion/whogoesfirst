# Release 1 — Pass 7: Physical-device verification

This checklist is for testing the deployed app on the actual iPhone/iPad that will be used for the game. **No physical-device test is marked as passed by this package.** Complete it after publishing the files to GitHub Pages over HTTPS.

## Before testing

- [ ] Upload the contents of this folder to the repository root (not the enclosing ZIP folder).
- [ ] Wait for GitHub Pages deployment to finish.
- [ ] Open the deployed `https://…github.io/…/` URL in Safari.
- [ ] Reload once and verify that the current version is served.
- [ ] Keep the screen awake and disable any accessibility touch feature that would materially change normal multi-touch behavior, if safe and appropriate for your setup.
- [ ] Start every scenario from **Play again** so each test begins with a clean round.

## Test scenarios

Record **Pass**, **Fail**, or **Not tested** for each scenario. Record the device model, iOS/iPadOS version, browser, and deployed commit alongside the results.

| ID | Procedure | Expected result | Result |
|---|---|---|---|
| P7-01 | One person places one finger in the garden. | One plant appears; no winner is selected with fewer than two players. | Not tested |
| P7-02 | Two people place and hold one finger each. | Two distinct plants appear and the round proceeds through the 2-second joining window and 2-second growth countdown. | Not tested |
| P7-03 | Add fingers one by one until six are held simultaneously. | Six distinct plants remain visible and the page does not reload, scroll, zoom, or clear. | Not tested |
| P7-04 | While six fingers are still held, add a seventh finger in the garden. | The seventh touch is ignored; the six existing plants and round remain intact. | Not tested |
| P7-05 | While two or more players are joining, lift only one finger. | Only that participant's plant is removed; other plants remain. The join timer adjusts without a screen-wide reset. | Not tested |
| P7-06 | Add a new participant shortly before the join window expires. | The joining window restarts to two seconds after the latest accepted participant joins. | Not tested |
| P7-07 | Cause a multi-touch interruption/cancellation if reproducible, without pressing Replay. | Existing plants do not all disappear because of a cancellation event. Note any participant whose finger is no longer tracked. | Not tested |
| P7-08 | Hold all accepted participants through the countdown. | Exactly one eligible plant becomes the winner; all other plants show non-winner states. | Not tested |
| P7-09 | Run ten consecutive rounds, using different numbers of players. | Each round produces at most one winner and no stale plants/timers leak into the next round. | Not tested |
| P7-10 | Press **Play again** during joining and during the growth countdown. | The old round is cleared and stale timers do not produce a winner afterward. | Not tested |
| P7-11 | Rotate the device between portrait and landscape before starting a round. | The garden remains usable and plants appear within the garden. | Not tested |
| P7-12 | Test sound/vibration controls and reduced-motion preference. | Controls behave as labelled; the app remains playable if sound or vibration is unavailable. | Not tested |
| P7-13 | Add the site to Home Screen and launch it from the icon. | App opens with the correct seedling icon and layout; repeat P7-02 through P7-10. | Not tested |

## Results record

- Device model:
- iOS/iPadOS version:
- Browser / launch mode (Safari tab or Home Screen):
- Deployed Git commit:
- Date and local time:
- Failed scenario IDs:
- Exact steps and observed behavior:
- Screenshot or screen recording (if available):

## If P7-03 or P7-04 fails

1. Record whether the plants vanish as soon as the sixth/seventh finger touches, when a finger moves, or when a finger lifts.
2. Note whether the status text changes, the page scrolls, or Safari shows any system gesture.
3. Save the deployed commit hash and do not overwrite the failing build until the result is recorded.
4. Share the failed scenario ID and observations so the touch lifecycle can be corrected against a reproducible case.

## Pass 7 exit criteria

Do not call Release 1 physically verified until P7-02 through P7-10 pass on the target device. A passing Node.js test suite or ZIP check is not a substitute for these tests.
