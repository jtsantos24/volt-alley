# VOLT ALLEY

A storm-lit futuristic hill race with five short maps. One line, a hot core, and landings that pay time back when you stick a trick.

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

- **Gas** — the big right pedal. Hold to build speed. Release and you coast. The wheels follow the hills. Steep crests launch you.
- **Brake** — the big left pedal scrubs speed on the ground. In the air it leans the nose back. The small **FWD** button leans forward.
- **Boost** — the round button beside the gas pedal. More speed, but the core heats. A full heat dial locks boost until it cools. Cyan pads reset heat.
- **Rivals** — NYX, VEX, and ION share the line. The badge is your place. The top bar is the pack. The meter on the right is the distance to the next marker.
- **Coins** — glowing chips on the route. The total stays in `localStorage`.
- **Tricks** — a clean landing pays time off the clock: 0.5s per flip, an extra 0.5s for two or more flips, and another 0.5s when you were in the air at least 0.65s. You also get a short speed boost and some heat back. A hard or crashed landing pays nothing. A crash sends you back to the last checkpoint. The clock keeps running through the tumble.
- **Gates** — low barriers and glowing beams have to be jumped. Rocks on the ground scrape speed.
- **Keyboard** — `D`, Right, or Space gas. `S` brake. Shift boost. `A`, Left, or Up leans back. `Q` or Down leans forward. `P` pauses.

Pick a map from the title screen. Nite Pier is open first. Finishing a map unlocks the next. Ash Veil also opens if you hold 9 stars. The Garage spends coins on Core Vent, Arc Spring, and Drive Coil. Wear a shell from the stars you have earned. Leave Stock on if the time should count toward stars.

Each map has its own best time, 3-star target, and a best-time ghost. A crash sends you back to the last checkpoint and the clock keeps running. Coins on the high line are optional. Times, stars, ghosts, and the coin bank stay in `localStorage`.

| Map | Tier | Accent |
| --- | --- | --- |
| Nite Pier | Novice | Cyan |
| Amp Spine | Intermediate | Magenta |
| Static Cut | Advanced | Amber |
| Void Well | Expert | Violet ring. Hold gas above the entry speed to ride it; otherwise you stay on the ground line under the ring |
| Ash Veil | Master | Ember |

## Files

| File | Role |
| --- | --- |
| `index.html` | Page, HUD, screens, iOS meta tags |
| `css/game.css` | Layout, safe areas, controls |
| `js/maps.js` | Five authored maps and the segment compiler |
| `js/game.js` | Physics, drawing, input, records |
| `js/audio.js` | Procedural engine and synth score |
| `fonts/nunito-latin-800.woff2` | Bundled Nunito ExtraBold (SIL OFL) |
| `fonts/Nunito-OFL.txt` | Nunito license |
| `sw.js` | Cache-first service worker (`volt-alley-v11-1`) |
| `manifest.json` | Home-screen install |
| `icons/icon-180.png` | Apple touch icon |
| `icons/icon-192.png` | Manifest icon |
| `icons/icon-512.png` | Manifest / maskable icon |

Graphics are drawn on the canvas. Audio is Web Audio. Nothing is loaded from a CDN.

## Updating an installed copy

The service worker is cache-first under the name `volt-alley-v11-1` in `sw.js`. Shell paints unlock with stars. Core Vent, Arc Spring, and Drive Coil are bought with coins. Turn Stock on before a run if you want the time to count for stars. When you change the game, bump that name and add any new file to the precache list. The next online launch activates the new worker and reloads. The title shows **UPDATED**, then **OFFLINE READY**. A race that is already running is left alone until the next launch.
