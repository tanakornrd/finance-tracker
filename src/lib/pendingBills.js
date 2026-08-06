import { getOccurrencesInRange } from "../../shared/recurrence.js";

// Active recurring bills whose computed due dates fall in [rangeStart, rangeEnd] and haven't
// been marked paid/skipped yet (recurring_bill_occurrences is sparse — no row = pending).
export function getPendingOccurrences(recurringBills, occurrences, rangeStart, rangeEnd) {
  const list = [];
  for (const bill of recurringBills) {
    if (!bill.active) continue;
    const dueDates = getOccurrencesInRange(bill, rangeStart, rangeEnd);
    for (const dueDate of dueDates) {
      const override = occurrences.find(
        (o) => o.recurringBillId === bill.id && o.dueDate === dueDate
      );
      if (override && (override.status === "paid" || override.status === "skipped")) continue;
      list.push({ bill, dueDate });
    }
  }
  return list.sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
}
