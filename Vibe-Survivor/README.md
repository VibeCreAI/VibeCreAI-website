# Vibe Survivor Scaffold

This folder now contains an operational build of the Vibe Survivor game, detached from the main VibeCreAI site and ready to be pushed to its own repository.

## Structure

- `index.html` – Pixel-styled landing screen with a single press-to-start button that loads the in-game modal on demand.
- `styles/` – Global styling (`base.css`) including `Born2bSporty` and `Minecraft` font faces used by the landing UI.
- `js/` – `vibe-survivor-game.js` (full game logic) and `main.js` (launch/cleanup wiring for the start button).
- `sound/` – Contains `Vibe_Survivor.mp3`, the background track referenced by the game.
- `fonts/` – Bundles `Born2bSportyFS.otf` and `MinecraftRegular.otf` for the standalone presentation layer.
- `images/` – Reserved for future artwork if you add bespoke assets.

## Migration Checklist

1. Copy the `Vibe-Survivor` folder into a clean project root or new repository.
2. Keep `js/vibe-survivor-game.js`, `sound/Vibe_Survivor.mp3`, and the custom fonts together; the game expects these relative paths.
3. Update the back-link and eventual production URL in `index.html` once your Vercel deployment is live.
4. Run the manual regression suite (controls, collisions, pause/resume, touch, audio) before shipping.

Auto-initialization is disabled via `window.VIBE_SURVIVOR_AUTO_INIT = false;`, so the landing page shows first and the game modal appears only after pressing **Press Start**.
