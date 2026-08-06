import React from "react";

export default function PagePlaceholder({ title, note }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-ink)", marginBottom: 18 }}>{title}</div>
      <div
        style={{
          background: "var(--color-white)",
          border: "1px solid var(--color-border)",
          borderRadius: 14,
          padding: "32px 20px",
          textAlign: "center",
          color: "var(--color-inkMuted)",
          fontSize: 13,
        }}
      >
        หน้านี้จะพัฒนาในเฟสถัดไป
        {note && <div style={{ marginTop: 6, fontSize: 12 }}>{note}</div>}
      </div>
    </div>
  );
}
