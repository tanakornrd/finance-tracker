import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

// Shown instead of the whole app when nobody's signed in (see App.jsx). Google is the only
// provider wired up in Supabase Auth for this project, so it's the only button here.
export default function Login() {
  const { signInWithGoogle } = useAuth();
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setErr("");
    setLoading(true);
    const { error } = await signInWithGoogle();
    // On success the browser navigates away to Google immediately, so this only ever runs
    // for the failure case (e.g. popup blocked, network error) — loading never needs resetting.
    if (error) {
      setErr(error.message);
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: 24,
        background: "var(--color-primarySoft)",
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color: "var(--color-ink)" }}>Finance Tracker</div>
      <div style={{ fontSize: 14, color: "var(--color-inkMuted)", textAlign: "center" }}>
        เข้าสู่ระบบด้วย Google เพื่อดูข้อมูลของคุณ
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 22px",
          borderRadius: 12,
          border: "1px solid var(--color-border)",
          background: "var(--color-white)",
          color: "var(--color-ink)",
          fontSize: 14,
          fontWeight: 600,
          opacity: loading ? 0.6 : 1,
        }}
      >
        <GoogleIcon />
        {loading ? "กำลังเปิด Google..." : "เข้าสู่ระบบด้วย Google"}
      </button>
      {err && <div style={{ color: "var(--color-danger)", fontSize: 12 }}>{err}</div>}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.96H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.04l3-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.96l3 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}
