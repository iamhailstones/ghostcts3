# GHOST - Python Combat Simulator

A top-down browser shooter that teaches Python. Survive 10 levels, defeat THE COMMANDER, and solve Python challenges to earn ammo, shields, bombs and abilities.
Pure HTML5, CSS3 and vanilla JavaScript on a canvas. No dependencies, no backend, no build step.

## Run it (Ubuntu / Linux)
```bash
cd ghost-cts3
xdg-open index.html            # simplest
# or, with a local server (needed for the offline service worker):
python3 -m http.server 8000    # then open http://localhost:8000
```

## Title and loading screen
The official title is **GHOST / CODE TO SURVIVE** with a **CTS3** tag attached to it. `js/boot.js` plays the intro (smoke, embers, blinking eyes, glitch reveal), shows real initialization progress, and reports errors with a RETRY button. Reduced-motion settings are respected. Art: `assets/ghost-key-art.jpg`.

## Gun system
Five weapons named after Python types, each following its type's rule: **TUPLE** (immutable pistol, refilled by the tuple rearm), **LIST** (mutable, ordered SMG), **SET** (shotgun: each enemy hit once per blast), **DICT** (rifle: damage looked up by enemy type) and **RANGE** (sniper: `range(3)` pierces 3 enemies). Earn credits by defeating enemies and clearing levels, then spend them in the GUN MARKET (button in the main menu, or **G** during a level). Each bought weapon has its own ammo; buy more in the market. The default pistol is refilled with Python: when its magazine is empty a pop-up offers a normal reload or the tuple rearm (`list(gun)`, change index 1, `tuple(...)`). Weapon data lives in `WEAPONS` in `js/weapons.js`.

## Python rules
Every weapon's ammo is a real Python value that the game validates: **TUPLE** `(magazine, reserve)` and **RANGE** are immutable (convert/rebuild to change them), **LIST** is edited in place, **SET** holds unique shell ids, **DICT** is read and written by key. When a magazine runs out on an immutable weapon, or the rules are broken, the game pauses in a console (`js/pyrules.js`) that runs the player's simple statements with real Python error messages. Lessons also check indentation and block structure (`pySyntax`). This is a small interpreter for a few statements, not full Python.

## Phone landscape mode
`js/orient.js` silently asks the browser for fullscreen + landscape on phones: at launch, and again on the player's first taps (the DEPLOY tap counts). No prompt is shown. Browsers refuse to rotate a page without a tap, and iPhone Safari cannot lock orientation at all; there the game just keeps working. To start in landscape with **no tap at all**, install the game (Add to Home Screen uses `"orientation": "landscape"` from `manifest.json`) or wrap it for the Play Store (Bubblewrap/Capacitor: set the Android screen orientation to landscape). Desktop is unchanged. The tuple gun holds 30 rounds and refills to 30 through the Python rearm every time it runs dry.

## Phones, tablets and the lesson editor
On touch screens every panel is full-screen and scrolls inside itself, the touch controls sit at the screen edges (and only while playing), and the game picture fills the screen height in landscape without stretching. Laptops/desktops keep the original layout. If landscape cannot be locked (iPhone Safari), a rotate prompt appears; it disappears when the phone is turned. Characters are drawn ~20% larger (30% on phones) and the HUD scales from its own corners. The lesson editor (`js/editor.js`) is a plain textarea with Python-aware 4-space auto-indent (tokenizer based: strings, comments, brackets), Tab/Shift+Tab/Backspace by indent level, else/elif/except/finally alignment, and the caret always kept in view; lessons require 4 spaces under a block header.

## Audio, voice, exit and beginner help
`js/audio.js` is one mixer (music bus + effects bus + compressor) with synthesized cinematic music: slow piano, strings, deep drones and restrained percussion that follow the game state (loading, menu, fight, boss, low health, mission complete, game over). `js/voice.js` speaks short announcements with the browser's built-in speech synthesis (best female English voice available, cooldowns, priorities, nothing queued; silent if the device has no speech). Music / effects / voice volumes and a Voice on/off switch are in the menu and the pause screen. EXIT GAME (menu and pause) asks for confirmation, saves, stops music, speech and the frame loop, and shows GAME EXITED with a way back to the menu. First-time tips and a short how-to in the lesson screen guide beginners.

## Soldier assistant, tutorial, practice mode and music (latest)
- **Assistant** (`js/assistant.js`): click the smiling soldier in the main menu. Answers come from the game's own knowledge notes (offline, accurate, never invented; unknown questions get an honest reply). It is not a live language model. To connect one, set `AI_CONFIG.endpoint` to *your own server proxy* (API keys must stay on the server); if it fails, the offline notes answer and a RETRY button appears. Voice input uses the browser's speech recognition where available; answers can be read aloud (voice picker, preview, stop, on/off).
- **Tutorial**: "Welcome! Here's how to play", 6 steps, opens on the first visit and from HOW TO PLAY.
- **Practice Mode** (`js/practice.js`, `js/pyengine.js`): 16 real function exercises plus 3 read-and-predict questions, beginner to advanced. Code runs in a Web Worker with a 3 second limit using a small Python-subset engine (functions, if/elif/else, for/while, lists, dicts, tuples, strings, comprehensions, common built-ins). Classes, try/except and imports are reported as "not supported yet". Feedback is classified: indentation, syntax, logic, runtime, output.
- **Indentation** (`pySyntax`): context-aware, 4 spaces per block level, line/found/expected messages, multiline brackets are free, tabs are rejected.
- **Music**: energetic synthesized street style (default) or the cinematic style (STYLE button). No audio files are needed.
- **Contact**: X https://x.com/GHOST_CTS_3 and mailto:iamhailstones@gmail.com (icons next to the soldier).

## Controls
| Action | Desktop | Mobile |
|---|---|---|
| Move | W A S D or arrow keys | left joystick |
| Aim / shoot | mouse / left click | right joystick (hold to fire) or the red FIRE button above it (hold; auto-aims at the nearest enemy, the stick overrides aim) |
| Reload | R | R button |
| Bomb | B | BOMB button |
| Phantom Strike (after the function challenge) | Q | Q button |
| Python challenge | C | PY button |
| Gun market (menu button) / switch weapon | G / 1-5 or E | GUN and SW buttons |
| Python rule console (opens by itself when an immutable weapon runs dry or R is pressed on it) | P | - |
| Pause / mute sounds / music | Esc / M / N | pause button in the HUD |

## Project structure
```
ghost-cts3/
  index.html          page markup, loads everything below
  manifest.json, sw.js  installable/offline support
  css/style.css       all styling and touch controls
  js/
    utils.js          helpers (canvas, clamp, random)
    levels.js         CONFIG, enemy types, level table, level briefings
    storage.js        localStorage with safe fallbacks
    challenges.js     Python challenges + pattern validators
    audio.js          synthesized sound effects, mute toggle
    game.js           state, level setup, update loop, level completion
    weapons.js        shooting and reloading
    bombs.js          bombs and area damage with falloff
    enemies.js        enemy creation, AI, boss, wave spawning
    player.js         player damage, abilities
    ui.js             menu, overlays, challenge terminal, HUD
    render.js         all canvas drawing
    touch.js          mobile controls
    boot.js           cinematic loading screen and shared title lockup
    main.js           input, game loop, start-up
  tests/              node tests (see below)
  assets/             icon and notes
```
Files are plain scripts sharing one scope (not ES modules) so the game also works when opened straight from disk.

## Extending
- **New level:** add a number to `COUNT`, a list to `POOL`, a name to `LV` and a briefing to `BRIEF` in `js/levels.js`.
- **New enemy:** add an entry to `TYPES` (hp, sp, dmg, r, col, pts, optional `range`/`strafe`) and use its name in `POOL`.
- **New Python challenge:** append an object to `CH` in `js/challenges.js` with `id, diff, title, concept, brief, code, hint, ok(code), err, why, win(player)`. Add a good answer to `tests/challenges.test.js`.
- **Balance:** all starting values live in `CFG`.

## Tests
```bash
node tests/challenges.test.js   # every challenge accepts a right answer, rejects empty/commented code; levels get harder
node tests/smoke.test.js        # plays levels 1-10 in a fake browser to catch runtime errors
```

## How the Python challenges work (honest version)
Player code is **never executed**. Each answer is checked against accepted patterns (regular expressions) after comments are stripped. Valid code written in an unexpected style may be rejected, and invalid code that matches the pattern may be accepted. The checker sits behind `c.ok(code)`, so a sandboxed Python runner (for example Pyodide in a Web Worker, or a locked-down server) can replace it later without touching the game.

## Current limitations
- No mini-boss at level 6 and no weapon pickups yet.
- Aiming on touch devices uses a joystick, not direct touch.
- Touch controls and the visuals have not been verified on real phones; the automated tests use a simulated browser, not real rendering.
- Save data lives in the browser's localStorage.

## Publishing to the Google Play Store
Not store-ready yet. Typical path: host the game over HTTPS, then package it as an Android app with Bubblewrap (Trusted Web Activity) or Capacitor. You will also need 512x512 PNG icons and screenshots, a signed app bundle, a privacy policy, a Play developer account, and real-device testing.
