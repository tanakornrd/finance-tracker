import React, { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { THAI_MONTHS } from "../../shared/dates.js";
import {
  overlay, sheet, sheetHead, iconBtn, textBtn,
  navBtn, yearSwitch, monthGrid, monthGridBtn, monthGridBtnActive,
} from "./sharedStyles.js";

// Controlled month-grid picker sheet: tap a month to select it, or (if showAllOption) pick "ทั้งหมด".
// year/month describe the currently-selected month (month is 0-indexed, or null when "all" is selected).
export default function MonthPickerSheet({ open, onClose, year, month, onSelectMonth, showAllOption, onSelectAll }) {
  const [pickerYear, setPickerYear] = useState(year);

  useEffect(() => {
    if (open) setPickerYear(year);
  }, [open, year]);

  if (!open) return null;

  return (
    <div style={overlay} onClick={onClose}>
      <div style={sheet} className="sheet" onClick={(e) => e.stopPropagation()}>
        <div style={sheetHead}>
          <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>เลือกเดือน</span>
          <button onClick={onClose} style={iconBtn}><X size={18} color="var(--color-inkMuted)" /></button>
        </div>
        <div style={yearSwitch}>
          <button type="button" style={navBtn} onClick={() => setPickerYear((y) => y - 1)}>
            <ChevronLeft size={16} color="var(--color-inkMuted)" />
          </button>
          <span className="num" style={{ fontSize: 16, fontWeight: 600, color: "var(--color-ink)" }}>{pickerYear + 543}</span>
          <button type="button" style={navBtn} onClick={() => setPickerYear((y) => y + 1)}>
            <ChevronRight size={16} color="var(--color-inkMuted)" />
          </button>
        </div>
        <div style={monthGrid}>
          {THAI_MONTHS.map((label, i) => {
            const isActive = month !== null && pickerYear === year && i === month;
            return (
              <button
                type="button"
                key={label}
                style={{ ...monthGridBtn, ...(isActive ? monthGridBtnActive : {}) }}
                onClick={() => onSelectMonth(pickerYear, i)}
              >
                {label}
              </button>
            );
          })}
        </div>
        {showAllOption && (
          <button
            type="button"
            style={{ ...monthGridBtn, width: "100%", marginTop: 8, ...(month === null ? monthGridBtnActive : {}) }}
            onClick={onSelectAll}
          >
            ทั้งหมด
          </button>
        )}
        <button
          type="button"
          style={{ ...textBtn, display: "block", margin: "16px auto 0" }}
          onClick={() => onSelectMonth(new Date().getFullYear(), new Date().getMonth())}
        >
          กลับไปเดือนปัจจุบัน
        </button>
      </div>
    </div>
  );
}
