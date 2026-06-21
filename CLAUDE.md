# Neon Arcade

Browser game hub PWA — 4 neon-themed games + planned non-neon games. Static HTML/JS, no build step.

## How to run

No build step. Serve with any static server:
```bash
python3 -m http.server 5188
```
Or open `index.html` directly in a browser.

## Architecture

- **No framework** — plain HTML/JS/Canvas
- Games: `games/drift/` (Phaser 3), `games/rush/` (Three.js), `games/pong/` (Canvas), `games/pacman/` (Canvas)
- Shared: `shared/audio.js` (WebAudio engine), `shared/leaderboard.js` (localStorage)
- Libs vendored locally: `vendor/phaser.min.js`, `vendor/three.module.js`, `vendor/cars/*.glb`
- PWA: `manifest.webmanifest` + `sw.js` (cache name `neon-arcade-v1` — bump on asset changes)
- All art and sound procedurally generated in code — zero external asset files

## Rules

- Repo: github.com/Travis-coder712/neon-arcade
- Live: travis-coder712.github.io/neon-arcade/
- Deploy: push to main, GitHub Pages serves root
- `.nojekyll` file required for `vendor/` directory
- Evolving into a **game hub** — Neon games are one collection, new games (space shooter) get their own visual identity
