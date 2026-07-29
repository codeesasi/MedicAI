# AGENTS.md

## Cursor Cloud specific instructions

### Overview

MedScript AI is a client-side React + Vite SPA (no backend). All data persists in browser `localStorage`; AI features call Google Gemini directly from the browser.

### Services

| Service | Command | Notes |
|---------|---------|-------|
| Vite dev server | `npm run dev` | Default: http://localhost:5173. Use `--host 0.0.0.0` for remote/browser access. |
| Production preview | `npm run build && npm run preview` | `npm run build` runs `tsc` first; see build caveat below. |

### Environment

Create `.env` in the repo root with a Google Gemini API key:

```env
API_KEY=your_google_gemini_api_key_here
```

`vite.config.ts` injects this as `process.env.API_KEY`. Without it, the app loads and manual medication cabinet features work, but OCR, interaction analysis, chatbot, and other Gemini-powered features show a configuration error.

### Lint / test / build

- **Lint:** No ESLint config in this repo.
- **Tests:** No test suite configured.
- **Typecheck + build:** `npm run build` (runs `tsc && vite build`). As of setup, `tsc` reports pre-existing unused-import/variable errors in several files; `npm run dev` still works because Vite does not run `tsc` in dev mode.

### Hello-world verification

1. `npm install`
2. Add `.env` with `API_KEY` (optional for UI-only smoke test)
3. `npm run dev`
4. Open http://localhost:5173
5. Skip onboarding tour → Medication Cabinet → Add Manual → add a medication → confirm it appears in the list

### External dependencies (no local setup)

- **Google Gemini API** — required for AI features
- **CDN assets** in `index.html` (Tailwind, html2pdf.js, Google Fonts) — requires network
- **BigDataCloud reverse-geocode** — optional, for auto-detect location in diet plans
