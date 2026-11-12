# VOLT ALLEY

A gritty cyberpunk hover-bike lane racer. One rain-soaked circuit, four lanes, a core that overheats, and landings that cost you time if the nose is wrong.

Milestone 1 is about the bike: momentum, air, and whether a clean landing feels better than a crash. It is a static site with no build step and no network calls after the first load.

## Run locally

Serve this folder over HTTP. Opening the file directly will not install the service worker.

```bash
python3 -m http.server 8741
```

Then open [http://127.0.0.1:8741](http://127.0.0.1:8741) and turn the window sideways. The game is built for a landscape phone.

## Install on an iPhone

1. Deploy this folder as a static site over HTTPS.
2. Open it in Safari and wait until the title says **OFFLINE READY**.
3. Share → Add to Home Screen.
4. Launch VOLT ALLEY from the icon. After that first online visit it runs in airplane mode.

## Ride

- **Throttle** — hold to build speed. Release and you coast.
- **Turbo** — more speed, but the core heats. A full gauge locks boost until it cools. Cyan **COOL** pads reset heat.
- **Lane up / down** — four lanes. Up is toward the skyline. Tall energy fences block lanes. Debris scrapes speed.
- **Lean back / forward** — in the air, set the nose. The ring at the top is your angle. Lay it flat before you hit. A bad landing crashes you, adds 3 seconds, and drops you past the impact.
- **Keyboard** — `D`, Right, or Space throttle. Shift turbo. `W`/`S` or arrows change lane. `A` or Left leans back. `Q` leans forward. `P` pauses.

The clock is a single run down Sector 9. Your best time is stored on the phone (`localStorage`).

## Files

| File | Role |
| --- | --- |
| `index.html` | Page, HUD, screens, iOS meta tags |
| `css/game.css` | Layout, safe areas, scanlines |
| `js/game.js` | Track, physics, drawing, input |
| `js/audio.js` | Procedural engine, rain, and music |
| `sw.js` | Cache-first service worker |
| `manifest.json` | Home-screen install |
| `icons/icon-180.png` | Apple touch icon |
| `icons/icon-192.png` | Manifest icon |
| `icons/icon-512.png` | Manifest / maskable icon |

Graphics are drawn on the canvas. Audio is Web Audio oscillators and noise. Nothing is loaded from a CDN.

## Updating an installed copy

The service worker is cache-first under the name `volt-alley-v5` in `sw.js`. When you change the game, bump that name. The next online launch activates the new worker and reloads. The title shows **UPDATED**, then **OFFLINE READY**. A race that is already running is left alone until the next launch.
