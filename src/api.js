import { supabase } from "./lib/supabaseClient.js";

// Every backend route requires login (server/supabaseClient.js's requireAuth) — attach the
// current Supabase session's access token so the server can identify the caller and RLS can
// scope every query to their own rows. getSession() reads from local storage/memory, no
// network round trip, so this doesn't slow requests down.
async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(url, options = {}) {
  const headers = { ...(options.headers || {}), ...(await authHeader()) };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `${res.status} ${res.statusText}`);
  }
  return res.json();
}

// Small, bounded data (accounts, budgets, recurring bills) shared across almost every page —
// safe to load once up front, unlike the unbounded transaction log below.
export function fetchReference() {
  return request("/api/reference");
}

// transactions grow without bound, so every caller scopes the query: a date range
// (Dashboard/Overview/Budgets), a single account (AccountDetail), or neither
// (Transactions.jsx, which searches/exports full history and needs it all).
export function fetchTransactions({ from, to, accountId } = {}) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (accountId) params.set("accountId", accountId);
  const qs = params.toString();
  return request(`/api/transactions${qs ? `?${qs}` : ""}`);
}

export function fetchTransaction(id) {
  return request(`/api/transactions/${id}`);
}

// The single most-recently-created transaction (by createdAt, see server/routes/transactions.js)
// — used by the "จดซ้ำจากรายการล่าสุด" quick-entry button. null if there are no transactions yet.
export function fetchLatestTransaction() {
  return request("/api/transactions/latest").catch((err) => {
    if (String(err.message).includes("no transactions yet")) return null;
    throw err;
  });
}

export function createTransaction(payload) {
  return request("/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteTransaction(id) {
  return request(`/api/transactions/${id}`, { method: "DELETE" });
}

// payload: any subset of { amount, category, accountId, date, note }. kind is never editable.
export function updateTransaction(id, payload) {
  return request(`/api/transactions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// Bulk insert from ImportStatement.jsx. `rows` is [{ kind, amount, accountId, date, category, note }].
export function importTransactions(rows) {
  return request("/api/transactions/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  });
}

export function createAccount(payload) {
  return request("/api/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateAccount(id, payload) {
  return request(`/api/accounts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteAccountPermanently(id) {
  return request(`/api/accounts/${id}`, { method: "DELETE" });
}

export function createBudget(payload) {
  return request("/api/budgets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}


export function createRecurringBill(payload) {
  return request("/api/recurring-bills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function payRecurringBillOccurrence(billId, dueDate) {
  return request(`/api/recurring-bills/${billId}/occurrences`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dueDate, action: "pay" }),
  });
}

export function skipRecurringBillOccurrence(billId, dueDate) {
  return request(`/api/recurring-bills/${billId}/occurrences`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dueDate, action: "skip" }),
  });
}

export function deleteRecurringBill(id) {
  return request(`/api/recurring-bills/${id}`, { method: "DELETE" });
}

export function deleteBudget(id) {
  return request(`/api/budgets/${id}`, { method: "DELETE" });
}

export function updateSettings(payload) {
  return request("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
