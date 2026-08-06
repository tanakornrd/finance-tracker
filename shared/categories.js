export const EXPENSE_CATS = [
  { name: "ช้อปปิ้ง", icon: "🛍️" },
  { name: "อาหาร", icon: "🍔" },
  { name: "เดินทาง", icon: "🚗" },
  { name: "ที่พัก/บิล", icon: "💡" },
  { name: "สุขภาพ", icon: "💊" },
  { name: "บันเทิง", icon: "🎬" },
  { name: "การศึกษา", icon: "📚" },
  { name: "อื่นๆ", icon: "📦" },
];

export const INCOME_CATS = [
  { name: "เงินเดือน", icon: "💼" },
  { name: "ฟรีแลนซ์", icon: "💻" },
  { name: "ของขวัญ", icon: "🎁" },
  { name: "อื่นๆ", icon: "📦" },
];

export const ALL_CATEGORY_NAMES = new Set([
  ...EXPENSE_CATS.map((c) => c.name),
  ...INCOME_CATS.map((c) => c.name),
]);

// Budgets and recurring bills both cap/track spending, never income — validate against this,
// not ALL_CATEGORY_NAMES, or a budget on an income category would silently inflate totals.
export const EXPENSE_CATEGORY_NAMES = new Set(EXPENSE_CATS.map((c) => c.name));
