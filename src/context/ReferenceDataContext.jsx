import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchReference } from "../api.js";
import { useAuth } from "./AuthContext.jsx";

const ReferenceDataContext = createContext(null);

// Holds only small, bounded data used across almost every page (accounts, budgets, recurring
// bills) — loaded once here so routes don't each re-fetch it. Transactions are NOT included:
// that dataset grows without bound, so each route fetches only the slice it needs (see api.js).
export function ReferenceDataProvider({ children }) {
  const { user } = useAuth();
  const [data, setData] = useState({
    accounts: [],
    budgets: [],
    recurringBills: [],
    recurringBillOccurrences: [],
    settings: { targetSavingsPct: null, allocationPlan: null, slimeCarryOverCents: 0, slimeCategoryCarryOver: {}, slimeLastSeenMonth: null, celebratedGoalIds: [] },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    try {
      const state = await fetchReference();
      setData(state);
      setError(null);
    } catch (e) {
      setError(String(e && e.message ? e.message : e));
    }
  }, []);

  // This provider sits above App.jsx's login gate (see main.jsx), so it mounts before anyone's
  // logged in — without gating on `user`, its very first fetch would hit the backend logged
  // out and get a 401. Keyed on user.id (not just "is there a user") so switching accounts
  // (sign out, sign in as someone else) reliably refetches instead of showing stale data.
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      await refetch();
      setLoading(false);
    })();
  }, [user?.id, refetch]);

  return (
    <ReferenceDataContext.Provider value={{ ...data, loading, error, refetch }}>
      {children}
    </ReferenceDataContext.Provider>
  );
}

export function useReferenceData() {
  const ctx = useContext(ReferenceDataContext);
  if (!ctx) throw new Error("useReferenceData must be used within a ReferenceDataProvider");
  return ctx;
}
