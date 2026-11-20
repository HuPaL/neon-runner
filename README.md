# NEON RUNNER

A cyberpunk 2D endless runner built with **Phaser 3**, **Vite** and vanilla ES modules.
Run through a neon city, jump (and double-jump) over barriers, lasers and energy spikes,
collect crystals, and survive as the world speeds up.

> All art and audio are generated at runtime (Canvas 2D + Web Audio). There are no binary
> assets, so there are no licensing concerns and nothing that can fail to load.

## Screenshots

_Add your own captures here (run the game, press `PrtScn`, drop files in `docs/`)._

| Menu | Gameplay | Game over |
| --- | --- | --- |
| `docs/menu.png` | `docs/gameplay.png` | `docs/gameover.png` |

## Features

- 6 game states (BOOT, PRELOAD, MENU, PLAYING, PAUSED, GAME_OVER) across 5 Phaser scenes
- Player with run / jump / fall / dead animation states, **double jump**, jump buffering, squash & stretch
- 3 obstacle types (neon barrier, laser gate, energy spikes) assembled into 8 verified-avoidable patterns
- Energy crystals (+10) in jump-arc and ground-line patterns, pickup particles and popups
- Distance-based scoring, persistent best score, "new record" detection
- Data-driven 4-level difficulty with smooth speed/interval ramp, speed cap and spawn-interval floor
- Multi-layer parallax skyline, pulsing neon lights, synthwave sun, scanlines, screen shake
- Procedural audio: music loop + jump / crystal / hit / click / level-up SFX, global mute (persisted)
- Pause (ESC / P / button, also auto-pauses on tab hide) with a 3-2-1 resume countdown
- Responsive: desktop, tablet and phone, landscape and portrait, touch + keyboard
- Debug overlay (FPS, speed, pool usage): open with `?debug` in the URL, toggle with `F3`

## Tech stack

| Concern | Choice |
| --- | --- |
| Engine | Phaser 3.90 (Arcade Physics, WebGL with Canvas fallback) |
| Language | JavaScript (ES modules), no framework |
| Build | Vite |
| Persistence | `localStorage` (guarded, in-memory fallback) |
| Audio | Web Audio API (own `AudioManager`; Phaser audio disabled) |
| Tests | Node's built-in test runner (`node:test`), zero extra dependencies |

## Getting started

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # production build into dist/
npm run preview   # serve the production build locally
npm test          # unit tests for pure game logic
```

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Jump / double jump | `SPACE`, `↑`, `W` (press again in the air) | Tap anywhere on the playfield |
| Pause / resume | `ESC` or `P` | Pause button (top right) |
| Mute | `M` | SOUND button (menu / pause) |
| Debug overlay | `F3` (with `?debug`) | - |

Holding a key does not trigger repeated jumps (key auto-repeat is ignored), and you never get
more than two jumps between ground contacts.

## Architecture

```
src/
  main.js                 entry: CSS + Phaser.Game
  game/
    config.js             Phaser config (Scale FIT, Arcade, no Phaser audio)
    constants.js          ALL tunables: physics, obstacles, patterns, difficulty (no Phaser import)
    scenes/               Boot -> Preload -> Menu -> Game <-> GameOver
    entities/             Player (zone body + visual), Obstacle & Collectible (pooled sprites)
    systems/
      SpawnManager.js     pools + pattern spawning + crystals + recycling
      DifficultyManager.js  pure speed/interval/level curve
      ScoreManager.js     pure score/best/record logic
      AudioManager.js     Web Audio music + SFX, autoplay-safe
      Patterns.js         pattern geometry + jump simulator (used by tests)
    utils/                Storage, Layout, TextureFactory, Background, ui helpers, GameState
  styles/                 main.css (page), ui.css (boot splash / fatal error)
tests/                    node:test suites for the pure modules
```

Design decisions worth knowing:

- **Pure core, thin Phaser shell.** Difficulty, score, storage, patterns and the jump
  simulator import no Phaser, so they are unit-tested in plain Node.
- **Player = physics `Zone` + visual `Sprite`.** Squash/stretch scales only the visual, so the
  collision body never changes size.
- **Fairness is proven, not assumed.** `Patterns.simulateClearance` brute-forces jump timings
  against the real hit boxes (with a safety margin) at each level's worst-case speed; tests
  fail if a pattern becomes unavoidable or its timing window drops below 100 ms.
- **Spawn gaps are time-based** (seconds of travel at the current speed) with a hard floor, so
  rising speed can never squeeze obstacles closer than a human can react to.
- **Pause lives inside `GameScene`** (physics + tweens paused, overlay built on demand) rather than
  a separate scene, so the world state is untouched.
- **Layout.** The short side is fixed at 540 logical px and the long side follows the window
  aspect ratio (clamped), then Phaser's `FIT` scales it. Orientation changes re-lay-out the menu
  and game-over screens immediately; a run in progress keeps its layout (letterboxed) and the new
  layout applies on the next scene start.

## Performance considerations

- Obstacles and crystals come from fixed-size physics-group pools; nothing is allocated per frame.
- Particle emitters are created once and fired with `explode()`; "+10" popups are a 6-object pool.
- All glow (neon edges, crystals, sun) is baked into textures at load time; no runtime shaders.
- Scrolling backgrounds are `TileSprite`s (6 layers + ground), pulsing lights are 3 looping tweens.
- HUD text is only touched when its displayed value changes; storage is written on run end /
  record / `pagehide`, never per frame.
- Per-frame delta is clamped (50 ms) so tab switches cannot cause huge jumps.
- Scene shutdown cleans up listeners (`registerCleanup`): keyboard captures, `pagehide`, game `hidden`,
  scale `resize` and audio subscriptions are all removed on restart.

## Known limitations

- The canvas is rendered at 960×540-class logical resolution and scaled by CSS, so on high-DPI
  screens graphics are slightly soft (text is rendered at 2× to stay crisp).
- Audio is synthesised; it is functional rather than studio quality.
- Rotating the device **during** a run does not re-layout until the next scene start.
- Automated tests cover pure logic; rendering, input and audio were verified manually in Chrome.

## Future improvements

- Hi-DPI render scale option and a quality setting for low-end phones
- Replace synthesised audio with composed music/SFX (royalty-free or original)
- More obstacle types (aerial hazards, moving lasers), power-ups (shield, magnet)
- Online leaderboard, gamepad support, local-storage-backed settings screen
- Automated browser tests (Playwright) for input, pause and resize flows
