# Who Goes First? 🌻

A cozy botanical multitouch web app for deciding who starts a board game. Designed for iPhone and iPad, and deployable to GitHub Pages without a build step or dependencies.

## Play

1. Open the app on a touchscreen.
2. Each player places and holds one finger in the garden (2–6 players).
3. Every new finger restarts the five-second joining window.
4. When the garden has been untouched for five seconds, plants grow during a four-second countdown.
5. One player is randomly selected: their plant blooms into a sunflower; the others return to seeds.
6. Tap **Play again** to start a fresh round.

## Features

- Tracks separate simultaneous pointer IDs (up to six participants).
- Five-second join window resets when a participant joins or leaves.
- Four-second countdown uses elapsed time rather than assuming each timer callback runs exactly on time.
- Cryptographically backed random selection with rejection sampling when Web Crypto is available.
- Touch-friendly layout, safe-area padding, `touch-action: none`, and no external libraries.
- Optional synthesized sound and vibration; both degrade gracefully when unavailable.
- Respects `prefers-reduced-motion`.
- PWA manifest and SVG favicon.
- No analytics, accounts, cookies, or network calls.

## Publish with GitHub Pages

1. Create a new repository on GitHub, for example `who-goes-first`.
2. Upload `index.html`, `style.css`, `app.js`, `manifest.webmanifest`, `favicon.svg`, and this `README.md` to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Choose the `main` branch and `/ (root)`, then save.
6. Wait for GitHub Pages to finish deploying. Your app URL will look like:
   `https://YOUR-USERNAME.github.io/who-goes-first/`

GitHub Pages URLs are case-sensitive. If you use a repository name other than `who-goes-first`, no code changes are needed because asset paths are relative.

## Test checklist

- [ ] Two people hold two fingers at the same time.
- [ ] Six people join; a seventh touch is ignored.
- [ ] A new finger joins just before the timer expires; the five-second window restarts.
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
