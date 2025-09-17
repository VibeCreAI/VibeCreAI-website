# Repository Guidelines

## Project Structure & Module Organization
- `index.html` orchestrates the layout, loads global styles, and bootstraps the JavaScript modules.
- CSS lives in `styles/` (`base.css`, `themes.css`, `responsive.css`, etc.); extend the closest existing file when adding tokens, animations, or breakpoints.
- Interactive logic sits in `js/`; `main.js` manages site flows, `game-manager.js` coordinates shared state, and `vibe-runner-game.js` / `vibe-survivor-game.js` contain canvas game loops. Shared utilities and schedulers are in `performance-utils.js`.
- Assets stay flat: fonts in `fonts/`, hero art in `images/`, audio in `sound/`. Optimize new media (WebP for imagery, compressed OTF/WOFF for fonts, <1 MB audio).

## Build, Test, and Development Commands
- `npx http-server . --port 5173` – launch a static preview with sensible cache headers.
- `python3 -m http.server 5173` – fallback server when Node.js is unavailable.
- `vercel dev` – emulate production rewrites from `vercel.json`; requires the Vercel CLI.

## Coding Style & Naming Conventions
- JavaScript uses ES2015+ classes with 4-space indentation, `camelCase` for functions/variables, and single quotes for strings (`'readyState'`). Attach globals under `window.VibePerf` or class instances.
- CSS favors descriptive utility-like class names (`.section-title`, `.cta-button`). Reuse custom properties defined in `:root` instead of committing literal colors.
- Keep comments for non-obvious intent (performance workarounds, timing hacks). Console logs may include emojis; align with existing tone.

## Testing Guidelines
- No automated suite exists; run manual regressions in Chromium, Firefox, and WebKit builds.
- Validate both games after changes: start/pause/resume flows, projectile collisions, adaptive difficulty, touch joystick, and audio toggles.
- Check responsive behavior down to 380 px width, theme switching, terminal reveal sequences, and CTA navigation.
- Capture performance metrics with Chrome DevTools’ Performance monitor and inspect `window.vibeSurvivor.frameRateMonitor` in console before/after intensive updates.

## Commit & Pull Request Guidelines
- Mimic current history: concise imperative sentences (`"Refactor game loop"`, `"Enhance project documentation"`). Group related CSS and JS edits together when possible.
- PRs should include a clear purpose, before/after screenshots for visual tweaks, browser/device checklist, and note any AI assistance.
- Link tracking issues or discussions and provide Vercel preview URLs when available; confirm redirects still pass through `vercel.json`.

## Deployment & Configuration Tips
- Route overrides live in `vercel.json`; keep new redirects additive and document the target service.
- Production deploys trigger on `main` pushes. Re-verify `robots.txt`, `sitemap.xml`, and analytics IDs whenever metadata or routing changes.

## MCP Auto-Installation
- Always verify the user’s environment before installation; if unclear, ask them directly.
- Identify the OS (Windows, Linux, macOS) and shell/runtime (WSL, PowerShell, Command Prompt, etc.) and adjust the setup accordingly. Confirm with the user when in doubt.
- Do not install an MCP blindly. Check the official site, confirm OS/environment compatibility, and follow the documented installation method first.
- After installation, confirm success by running:
  ```powershell
  $env:RUST_LOG="codex=debug"; codex "/mcp"
  ```
  Inspect the logs to ensure the MCP is detected.
- If an API key is required, set a dummy key by default, then clearly notify the user to replace it with a valid key.
- Only install the MCPs the user explicitly requested. Ignore errors from other preinstalled MCPs.
- Once an MCP runs successfully in the terminal, capture the arguments and environment variables used. Add the configuration directly to the correct `config.toml` file so the system persists the setup.

### Example `config.toml` Snippet
```toml
[mcp_servers.brightData]
command = "npx"
args = ["-y", "@brightdata/mcp"]
env = { 
  API_TOKEN = "bd_your_api_key_here"  
}

[mcp_servers.playwright]
command = "npx"
args = ["@playwright/mcp@latest"]