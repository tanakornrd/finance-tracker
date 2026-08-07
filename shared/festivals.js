// The 4-ข้อ (now 3, per feedback) fixed list of festivals a user can set a special budget for
// (Budgets.jsx's "งบเทศกาล" section, 2026-08-08). Same shape/idiom as shared/categories.js's
// EXPENSE_CATS — { slug, name, icon } instead of { name, icon }, because a festival budget row
// (server/routes/budgets.js) stores its `slug` in the `budgets.category` column (reusing that
// column rather than adding a new one — see that file's own comment for why) where a plain
// category budget would store a category name; the slug is the stable value validated
// server-side and matched against, `name`/`icon` are display-only.
export const FESTIVALS = [
  { slug: "songkran", name: "สงกรานต์", icon: "🌦️" },
  { slug: "chinese_new_year", name: "ตรุษจีน", icon: "🧧" },
  { slug: "christmas_newyear", name: "คริสต์มาส-สิ้นปี", icon: "🎄" },
];

export const FESTIVAL_SLUGS = new Set(FESTIVALS.map((f) => f.slug));

export function festivalBySlug(slug) {
  return FESTIVALS.find((f) => f.slug === slug);
}
