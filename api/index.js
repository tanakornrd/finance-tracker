// Vercel serverless entry point — every request to /api/* gets routed here by vercel.json's
// rewrite, and Vercel's Node runtime calls this default export directly as an (req, res)
// handler on each request. Express apps work as-is for that (no .listen() involved), so this
// file is just a re-export of the same app used locally by server/index.js.
import app from "../server/app.js";

export default app;
