# Frontend

This is the deployable Vercel frontend for MF Backtest.

## Environment variable

Set this in Vercel:

```text
NEXT_PUBLIC_API_BASE_URL=https://your-railway-domain.up.railway.app
```

## Local development

```powershell
$env:NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:8000"
npm install
npm run dev
```

## Notes

- The active UI entrypoint is `pages/index.js`.
- The old plain HTML frontend assets are no longer part of the deployable path.
