import React, { useEffect, useState } from "react";
import { Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";
import { fetchTransactions } from "../api.js";
import { toISODate } from "../../shared/dates.js";
import { computeWeeklyInsight } from "../lib/weeklyInsight.js";
import { colors, card, iconChip } from "./sharedStyles.js";

function addDays(date, delta) {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

// Themes that have opted into the mascot/insight/decoration pattern so far. Add a theme id here
// (plus its own mascot + corner-decoration components in App.jsx) to extend the pattern instead
// of duplicating this card's logic per theme.
const THEMES_WITH_INSIGHT = ["speedster"];

// Fetches its own 14-day window rather than reusing Dashboard's rangeTx — rangeTx is scoped to
// whatever month Dashboard's cursor is currently viewing, but "this week vs last week" needs to
// always be about the real today, independent of which month the user happens to be browsing.
export default function WeeklyInsightCard() {
  const { theme } = useTheme();
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const enabled = THEMES_WITH_INSIGHT.includes(theme);

  useEffect(() => {
    if (!enabled) return;
    const today = new Date();
    const from = toISODate(addDays(today, -13));
    const to = toISODate(today);
    setLoading(true);
    fetchTransactions({ from, to })
      .then((rows) => setInsight(computeWeeklyInsight(rows, today)))
      .finally(() => setLoading(false));
  }, [enabled]);

  if (!enabled || loading || !insight) return null;

  const Icon = insight.kind === "up" ? TrendingUp : insight.kind === "down" ? TrendingDown : Sparkles;
  const iconColor = insight.kind === "up" ? colors.danger : insight.kind === "down" ? colors.success : colors.secondary;
  const iconBg = insight.kind === "up" ? colors.dangerTint : insight.kind === "down" ? colors.successTint : colors.secondaryTint;

  return (
    <div style={{ ...card, marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div style={iconChip(iconBg)}>
        <Icon size={16} color={iconColor} />
      </div>
      <div style={{ fontSize: 13, color: colors.ink, lineHeight: 1.5, paddingTop: 4 }}>{insight.message}</div>
    </div>
  );
}
