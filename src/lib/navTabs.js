import { Home, List, Wallet, PieChart, Calendar, LayoutDashboard } from "lucide-react";

// Shared between BottomNav.jsx (mobile, <1280px) and Sidebar.jsx (desktop, >=1280px) — same
// routes, same order, just laid out differently per breakpoint. Keeping one source of truth
// here means adding/renaming a nav destination never has to be done in two places.
export const NAV_TABS = [
  { to: "/", label: "หน้าหลัก", icon: Home, end: true },
  { to: "/overview", label: "ภาพรวม", icon: LayoutDashboard },
  { to: "/transactions", label: "รายการ", icon: List },
  { to: "/accounts", label: "สินทรัพย์", icon: Wallet },
  { to: "/budgets", label: "งบประมาณ", icon: PieChart },
  { to: "/upcoming", label: "ปฏิทิน", icon: Calendar },
];
