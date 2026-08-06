import express from "express";
import { requireAuth } from "./supabaseClient.js";
import { getState, getReferenceData } from "./state.js";
import accountsRouter from "./routes/accounts.js";
import transactionsRouter from "./routes/transactions.js";
import budgetsRouter from "./routes/budgets.js";
import savingsGoalsRouter from "./routes/savings-goals.js";
import recurringBillsRouter from "./routes/recurring-bills.js";
import settingsRouter from "./routes/settings.js";

// The Express app itself, with no app.listen() call — split out from index.js so the exact
// same app can be run two ways: as a long-lived local dev server (index.js, via `npm run dev`)
// or as a Vercel serverless function (api/index.js, which Vercel calls per-request instead of
// ever calling .listen()).
const app = express();
app.use(express.json());

// Every route under /api requires a valid Supabase login (see supabaseClient.js) — nothing
// below this line is reachable while logged out. RLS on every table would block the data
// either way, but this turns that into a clean 401 instead of routes half-working against an
// empty/error result.
app.use("/api", requireAuth);

app.get("/api/state", async (req, res) => {
  try {
    res.json(await getState(req.supabase));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/reference", async (req, res) => {
  try {
    res.json(await getReferenceData(req.supabase));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use("/api/accounts", accountsRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/budgets", budgetsRouter);
app.use("/api/savings-goals", savingsGoalsRouter);
app.use("/api/recurring-bills", recurringBillsRouter);
app.use("/api/settings", settingsRouter);

export default app;
