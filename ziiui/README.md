# ziiui

ZiiUI is a frontend-first creative effects library and component playground for building text animations, scroll-driven layouts, interactive motion, cursor effects, shader visuals, and reusable HTML/CSS/JS snippets. It lets you browse ready-made components, preview them live, copy standalone code, and optionally use an AI-powered editor to iterate on the currently selected effect by description.

This project is built for local-first experimentation and rapid UI prototyping. It is intentionally front-end focused, with browser-based previews and local persistence for AI sessions and component state.

## Features

- Browse a curated library of animated UI effects
- Preview each effect live in the browser
- Copy standalone HTML/CSS/JS output for reuse anywhere
- Adjust effect text and configuration through the editor UI
- Use an AI-assisted editor to modify the current component via natural language
- Persist recent AI chat history and component revisions in localStorage
- Multi-page Vite app with library, AI workspace, context explorer, and docs

## Tech stack

- Vite for building and local serving
- Vanilla JavaScript modules
- HTML/CSS/JS effect templates
- Vitest for automated testing
- OpenRouter-based AI integration (optional)

## Quick start

From the project folder:

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite, typically:

```text
http://localhost:5173
```

## Available commands

```bash
npm run dev      # start the development server
npm run build    # create a production build in dist/
npm run preview  # preview the production build locally
npm test         # run the project test suite
```

> The app must be loaded over `http://` or `https://`. Opening the HTML directly from disk via `file://` is not supported for the interactive preview flow.

## Pages

- `index.html` — main effects library and preview browser
- `ai.html` — full AI editing workspace for a selected component
- `context.html` — inspect, import, export, and clear saved AI state
- `docs.html` — documentation and usage notes

## Project structure

```text
ziiui/
├── index.html                 # main effects library page
├── ai.html                    # AI editor page
├── context.html               # AI state inspection page
├── docs.html                  # documentation page
├── public/                    # static assets
├── src/
│   ├── pages/
│   │   ├── library.js         # main library entry
│   │   ├── library/           # UI logic for the library
│   │   ├── ai-editor.js       # AI editor entry
│   │   ├── context.js         # context/export view entry
│   │   └── docs.js            # docs entry
│   ├── effects/
│   │   ├── registry.js        # effect catalog and metadata
│   │   ├── builders.js        # code generation helpers
│   │   ├── templates.js       # template loading and placeholder replacement
│   │   └── templates/         # per-category HTML/CSS/JS effect files
│   ├── ai/
│   │   ├── config.js          # AI model + endpoint config
│   │   ├── state.js           # local AI state / chat history / revisions
│   │   ├── prompt.js          # prompt construction and response sanitization
│   │   ├── client.js          # OpenRouter client and model fallback logic
│   │   ├── request.js         # in-flight request handling
│   │   └── chat-view.js      # UI display for AI chat
│   ├── lib/
│   │   ├── dom.js             # DOM helpers and live announcements
│   │   ├── storage.js        # safe storage helpers
│   │   └── ...                # other shared utilities
│   ├── styles/
│   │   └── ...                # shared and page-specific styles
│   └── app boot logic...
├── tests/
│   ├── ai.test.js
│   ├── ai-core.test.js
│   └── effects.test.js
├── .env                       # local environment file (not committed)
├── .gitignore
├── package.json
├── vite.config.js
├── README.md
└── dist/                     # built output after npm run build
```

## AI editor setup

The AI editor is optional and is enabled when a valid key or proxy endpoint is available.

### Local development

Create `.env` in the project root with:

```bash
VITE_OPENROUTER_API_KEY=your_key_here
```

Optional configuration:

```bash
VITE_AI_MODELS=qwen/qwen3-coder:free,deepseek/deepseek-r1:free
VITE_AI_ENDPOINT=https://your-proxy.example.com/v1/chat/completions
```

Then restart the dev server:

```bash
npm run dev
```

### AI security note

`VITE_*` variables are embedded in the browser bundle. That means:

- local development is acceptable with a limited key
- public deployments should not expose a production key directly in frontend code
- for production, use a small backend proxy and point `VITE_AI_ENDPOINT` at that proxy instead

Never commit real credentials to source control. The project `.env` file is intended for local use only.

## Production build

To produce a static production build:

```bash
npm run build
```

Then preview it locally:

```bash
npm run preview
```

The built files are emitted to the `dist/` directory and can be deployed to any static host such as Netlify, Vercel static output, GitHub Pages, or a CDN-backed web server.

## Testing

The project includes automated checks for:

- effect generation and registry integrity
- AI prompt sanitization and state handling
- component revision and context tracking
- build validity and runtime safety

Run:

```bash
npm test
```

## Notes for production use

- AI state is stored in `localStorage` and is intended for browser-local UX continuity
- preview code is executed in a sandboxed iframe with script access only where needed
- external libraries such as GSAP, Lenis, and Three.js may be loaded from public CDNs
- generated snippets are self-contained and can be copied to other sites or documents

## License

This project is for local experimentation and frontend prototyping. License details should be confirmed in the repository policy and packaging setup if this app is being distributed externally.

## Author

Bharat Shukla
