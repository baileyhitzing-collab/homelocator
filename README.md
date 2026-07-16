# HomeBound

Georgia capstone project: a React/TypeScript frontend that lets users search
for a location, filter Georgia counties by price/income/population, and
browse personalized county recommendations on an interactive map.

This is the frontend only. It depends on the [ga-home-finder](../ga-home-finder)
backend,backend must be running for anything data-driven to work.

## Prerequisites

- Node.js
- A running instance of the `ga-home-finder` backend (defaults to `http://localhost:3000`)
- A [Mapbox](https://www.mapbox.com/) access token

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your values:
   - `VITE_MAPBOX_TOKEN` — your Mapbox access token
   - `VITE_API_URL` — the backend's URL (`http://localhost:3000` for local development)
3. `npm run dev` — starts the dev server (defaults to `http://localhost:5173`)

## Scripts

- `npm run dev` — start the local dev server with hot reload
- `npm run build` — type-check and build for production (output in `dist/`)


## Pages

- `/` — search entry point
- `/map` — interactive map: search, filters, choropleth layers, Top Picks recommendations
- `/favorites` — saved counties (stored in the browser's `localStorage`)
