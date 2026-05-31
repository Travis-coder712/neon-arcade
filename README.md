# Neon Arcade

Two browser racing games, built end-to-end with Claude Code — an experiment in what the AI-assisted build stack can produce in the games space. No installs, no app store: it's an installable PWA that runs offline and shares as a URL.

**▶ Play:** https://travis-coder712.github.io/neon-arcade/

## Games

- **Neon Drift** — top-down 2D drift racer (Phaser 3). A smooth closed-circuit track, hold-to-drift handling with glowing tyre trails, AI opponents, a 3-lap race, lap timer and a persistent **track record** to chase. Great for beating a friend's time on the same phone.
- **Neon Rush** — real-3D synthwave endless racer (Three.js). Weave through traffic at increasing speed; don't crash. Best score is saved.

## Tech notes

- 100% client-side, zero build step — plain HTML/JS.
- **All sound is generated procedurally in code** (WebAudio) — engine (gear-shift model), tyre skid, crash, plus a per-game **soundtrack** (bass + pad + arp + lead melody + drums + echo). No audio files.
- **3D cars (Neon Rush):** [Kenney Car Kit](https://kenney.nl/assets/car-kit) — **CC0** low-poly models (`vendor/cars/`), loaded with three.js `GLTFLoader`. Pick your car on the title screen.
- **2D art (Neon Drift):** procedural — cars, closed-loop track, textured ground, track-side running lights, synthwave scenery.
- Game libraries ([Phaser](https://phaser.io/) and [Three.js](https://threejs.org/)) are vendored locally under `vendor/` so the PWA works fully offline.
- Installable PWA: `manifest.webmanifest` + a cache-first service worker (`sw.js`).

## Credits

- 3D car models: **Kenney** — Car Kit (CC0 / public domain), kenney.nl.

## Controls

| | Keyboard | Touch |
|---|---|---|
| Steer / change lane | ← → arrows | ◄ ► buttons (or tap screen sides in Rush) |
| Drift (Neon Drift) | Space (hold) | hold the orange **DRIFT** button |

## Structure

```
index.html            arcade menu (PWA shell)
manifest.webmanifest  PWA manifest
sw.js                 offline service worker
make_icons.py         regenerates the app icons
shared/audio.js       procedural WebAudio sound engine (shared)
games/drift/          Neon Drift (Phaser)
games/rush/           Neon Rush (Three.js)
vendor/               Phaser + Three.js (vendored for offline)
icons/                generated PWA icons
```

Built with [Claude Code](https://claude.com/claude-code).
