# MF Backtest Frontend

This frontend is built with Next.js and provides an interactive mutual fund backtesting experience.

## Setup

1. Open a terminal in `frontend/`
2. Run `npm install`
3. Copy `.env.example` to `.env.local` and update `NEXT_PUBLIC_API_BASE_URL` if needed.
4. Run the backend on port `8000`.
5. Run `npm run dev`

## Production-ready deployment

- Build the Next.js app with `npm run build`
- Export static files with `npm run export`
- If you want the backend to serve the static site, put the generated `out/` folder in `frontend/` and start the backend app.

## Notes

- When `NEXT_PUBLIC_API_BASE_URL` is unset, the frontend will use relative API paths like `/api/backtest`.
- The backend API endpoints used by the app are `/api/schemes/search` and `/api/backtest`.
- The app uses Vanta.js for a matte black animated background.
