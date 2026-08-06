import app from "./app.js";

// Local dev only — `npm run dev` runs this and keeps a real server listening on a port. On
// Vercel, api/index.js imports the same app.js and exports it directly; Vercel calls it
// per-request instead, so app.listen() never runs there (and shouldn't — serverless functions
// don't own a persistent port).
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
