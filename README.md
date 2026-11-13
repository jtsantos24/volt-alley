# VOLT ALLEY

A storm-lit futuristic hill race. One continuous line, a hot core, and landings that pay time back when you stick a trick.

It is a static site with no build step and no network calls after the first load.

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

- **Throttle** — hold to build speed. Release and you coast. The wheels follow the hills. Steep crests launch you.
- **Turbo** — more speed, but the core heats. A full gauge locks boost until it cools. Cyan **HEAT DUMP** pads reset heat.
- **Lean back / forward** — in the air, set the nose and flip. The ring at the top is your angle. Lay it flat before you hit.
- **Tricks** — a clean landing pays time off the clock: 0.5s per flip, an extra 0.5s for two or more flips, and another 0.5s when you were in the air at least 0.65s. You also get a short speed boost and some heat back. A hard or crashed landing pays nothing. A crash still adds 3 seconds.
- **Gates** — low barriers and glowing beams have to be jumped. Rocks on the ground scrape speed.
- **Keyboard** — `D`, Right, or Space throttle. Shift turbo. `A`, Left, or Up leans back. `Q` or Down leans forward. `P` pauses.

The clock is a single run to the Sector 9 gate. Your best time is stored on the phone (`localStorage`).

## Files

| File | Role |
| --- | --- |
| `index.html` | Page, HUD, screens, iOS meta tags |
| `css/game.css` | Layout, safe areas, controls |
| `js/game.js` | Terrain, physics, drawing, input |
| `js/audio.js` | Procedural engine and synth score |
| `fonts/nunito-latin-800.woff2` | Bundled Nunito ExtraBold (SIL OFL) |
| `fonts/Nunito-OFL.txt` | Nunito license |
| `fonts/jersey10-latin.woff2` | Earlier UI font, still shipped |
| `fonts/OFL.txt` | Jersey 10 license |
| `sw.js` | Cache-first service worker (`volt-alley-v8`) |
| `manifest.json` | Home-screen install |
| `icons/icon-180.png` | Apple touch icon |
| `icons/icon-192.png` | Manifest icon |
| `icons/icon-512.png` | Manifest / maskable icon |

Graphics are drawn on the canvas. Audio is Web Audio. Nothing is loaded from a CDN.

## Updating an installed copy

The service worker is cache-first under the name `volt-alley-v8` in `sw.js`. When you change the game, bump that name and add any new file to the precache list. The next online launch activates the new worker and reloads. The title shows **UPDATED**, then **OFFLINE READY**. A race that is already running is left alone until the next launch.
