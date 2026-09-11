# ThermoWatch AI

A responsive React command-center dashboard for AI-classified industrial and environmental thermal hotspots. It includes protected routes, a Leaflet GIS map, realtime filters/search, linked Top 20 analytics, charts, light/dark themes, and a resilient demo-data fallback.

## Requirements

- Node.js 18 or newer
- npm 9 or newer

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Log in with any valid form values and enter the displayed CAPTCHA code. Use the refresh button beside it to generate a new code.

## API configuration

The dashboard starts in Demo Mode if `VITE_API_BASE_URL` is absent or the backend is unavailable. To connect it, copy `.env.example` to `.env` and set your API root:

```bash
VITE_API_BASE_URL=https://your-api.example.com/api
```

The app requests `GET /hotspots`. It accepts either an array or `{ "data": [...] }`. Expected fields include `id`, `name`, `category` (or `predicted_category`), `latitude`/`lat`, `longitude`/`lng`, and `risk`/`risk_score`. Other detail fields are rendered when supplied.

## Production build and deployment

```bash
npm run build
npm run preview
```

Deploy the generated `dist/` folder to a static host such as Netlify, Vercel, Cloudflare Pages, or S3/CloudFront. Configure SPA fallback so all routes resolve to `index.html`, and add `VITE_API_BASE_URL` as a build environment variable when using a backend.

## Project structure

```
src/
  main.jsx            # Routes, views, reusable UI components
  styles.css          # Responsive theme and layout system
  services/api.js     # Centralized API + resilient mock/demo data
```

## Notes

- Authentication state uses session storage and is cleared by Logout.
- The Top 20 page performs an in-app configurable 30-second refresh timer and table rows deep-link to the focused map marker.
- Frontend-only demo data is clearly identified; AI classification, risk scoring, and persistent data processing remain backend responsibilities.
