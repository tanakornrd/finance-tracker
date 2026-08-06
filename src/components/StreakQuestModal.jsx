import React from "react";
import { X } from "lucide-react";
import { overlay, sheet, sheetHead, iconBtn } from "./sharedStyles.js";
import ModalPortal from "./ModalPortal.jsx";
import { STREAK_WINDOW_DAYS } from "../lib/streak.js";

// Milestone thresholds for the flavor line under the headline count — purely presentational,
// doesn't affect the number itself (that's computeStreak's job, src/lib/streak.js).
function encouragement(days) {
  if (days === 0) return "เริ่มเควสต์วันนี้เลย! บันทึกรายการแรกของสตรีคใหม่";
  if (days < 3) return "เริ่มมาแล้ว ไปต่อกันเลย!";
  if (days < 7) return "กำลังมาแรง อย่าเพิ่งหยุดนะ!";
  if (days < 30) return "สุดยอด! ต่อเนื่องมาเกินสัปดาห์แล้ว";
  return "ตำนานนักบันทึกตัวจริง!";
}

// Archer's click target (Transactions.jsx, RPG party interactions part 4) — a quest-board-style
// readout of the streak Transactions.jsx computes (src/lib/streak.js) from its own transaction
// fetch. Same overlay/sheet building blocks as every other modal in the app; framing only.
export default function StreakQuestModal({ open, onClose, streakDays, streakCapped }) {
  if (!open) return null;

  return (
    <ModalPortal>
      <div style={overlay} onClick={onClose}>
        <div style={sheet} className="sheet" onClick={(e) => e.stopPropagation()}>
          <div style={sheetHead}>
            <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>📜 เควสต์บอร์ด — สถิติความสม่ำเสมอ</span>
            <button onClick={onClose} style={iconBtn}><X size={18} color="var(--color-inkMuted)" /></button>
          </div>
          <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
            <div style={{ fontSize: 13, color: "var(--color-inkMuted)", marginBottom: 6 }}>จดติดต่อกันมาแล้ว</div>
            <div className="num" style={{ fontSize: 44, fontWeight: 700, color: "var(--color-primary)" }}>
              {streakCapped ? `${STREAK_WINDOW_DAYS}+` : streakDays}
            </div>
            <div style={{ fontSize: 13, color: "var(--color-ink)", marginTop: 2, marginBottom: 14 }}>วัน!</div>
            <div style={{ fontSize: 13, color: "var(--color-inkMuted)" }}>{encouragement(streakDays)}</div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
