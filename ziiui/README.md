# ziiui

Production-ready creative web effects — text animations, custom cursors, scroll-driven sections,
WebGL shaders and footers. Pick an effect, tweak it live, and **copy standalone HTML/CSS/JS**.
An optional **AI editor** (via OpenRouter) lets you change any effect by describing the change.

## Quick start

```bash
npm install
cp .env.example .env      # optional — only needed for the AI editor
npm run dev               # http://localhost:5173
```

| Command           | What it does                                    |
| ----------------- | ----------------------------------------------- |
| `npm run dev`     | Dev server with hot reload                      |
| `npm run build`   | Production build into `dist/`                   |
| `npm run preview` | Serve the production build locally              |
| `npm test`        | Run the unit tests (effects, AI helpers, state) |

> The app must be served over http(s) — opening `index.html` straight from disk (`file://`) will not work.

## Pages

| File           | Purpose                                                          |
| -------------- | ---------------------------------------------------------------- |
| `index.html`   | The effects library: preview, controls, generated code, AI panel |
| `ai.html`      | Full-page AI editor for a saved component (code + live preview)  |
| `context.html` | Inspect / export / import saved AI sessions (localStorage)       |
| `docs.html`    | Documentation                                                    |

## Project structure

```
ziiui/
├── index.html · ai.html · context.html · docs.html   # pages (Vite multi-page app)
├── public/                    # static files served as-is (logo, favicon)
├── src/
│   ├── pages/                 # one entry module per page
│   │   ├── library.js         #   index.html entry (wires everything together)
│   │   ├── library/           #   store · viewer · nav · ai-panel
│   │   ├── ai-editor.js       #   ai.html entry
│   │   ├── context.js         #   context.html entry
│   │   └── docs.js            #   docs.html entry
│   ├── effects/
│   │   ├── registry.js        # the 25 effects (name, category, head libraries…)
│   │   ├── builders.js        # assembles complete standalone HTML documents
│   │   ├── templates.js       # loads template files, fills @@PLACEHOLDERS@@
│   │   └── templates/         # real .css/.html/.js files, grouped by category
│   │       └── text/ cursor/ interactive/ scroll/ shader/ footer/
│   ├── ai/
│   │   ├── config.js          # keys, endpoint, models, limits
│   │   ├── state.js           # per-component chat history + versions (localStorage)
│   │   ├── prompt.js          # system prompt, response cleaning, error messages
│   │   ├── client.js          # OpenRouter client with model fallback
│   │   ├── request.js         # in-flight request: cancel, timeout, interrupted marker
│   │   └── chat-view.js       # chat log rendering
│   ├── lib/                   # dom · storage · clipboard · theme · preview helpers
│   └── styles/                # style.css (app) + one stylesheet per extra page
├── tests/                     # vitest (effects + AI)
├── vite.config.js · package.json
└── .env.example · .gitignore
```

## Adding a new effect

1. Add `src/effects/templates/<group>/<name>.css`, `<name>.html`, `<name>.js`.
2. Add an entry to `EFFECTS` in `src/effects/registry.js`:

   ```js
   { id: 'myeffect', name: 'My Effect', cat: 'Scroll', field: 'none', previewSize: 'large',
     note: 'One-line description', text: '',
     code: full('myeffect', [js(GSAP('3.13.0')), js(SCROLLTRIGGER('3.13.0'))]) },
   ```

3. Run `npm test` — it checks that the page builds, has no unfilled placeholders, and that every
   inline script is valid JavaScript.

Text-style effects use `__TEXT__` for the user's text; `@@NAME@@` placeholders are filled by `fill()`.

## AI editor setup

1. Create a key at <https://openrouter.ai/keys> and put it in `.env`:

   ```
   VITE_OPENROUTER_API_KEY=sk-or-v1-...
   ```
2. Restart `npm run dev` (env files are read at startup).

Optional variables: `VITE_AI_MODELS` (comma-separated, tried in order) and `VITE_AI_ENDPOINT`.

### ⚠️ Key security

Every `VITE_*` variable is **compiled into the browser JavaScript**. Anyone who can open your deployed
site can read the key. That is fine for local development with a low-limit key, but for a public site
run a small server-side proxy that adds the key, and point `VITE_AI_ENDPOINT` at it — no browser-side
key is needed in that mode. Never commit `.env` (it is in `.gitignore`).

## Notes

- AI history lives in `localStorage` (schema v2) and is shared by the library, `ai.html` and `context.html`.
- Previews run in sandboxed iframes (`sandbox="allow-scripts"`); runtime errors are reported back to the page.
- Generated effects load GSAP / Lenis / Three.js from public CDNs, so previews need internet access.
- Text input is limited to 3,000 characters and is HTML-escaped; emoji / grapheme clusters are handled safely.
- `prefers-reduced-motion` is respected by the text effects.

## Author

**Bharat Shukla**
