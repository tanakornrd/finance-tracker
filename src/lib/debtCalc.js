// Debt account balance_cents = amount owed (can go negative, meaning a credit/prepaid
// balance). Reconstructs past balances from the transaction log — mirrors the balance
// update logic in server/routes/transactions.js exactly, so it stays in sync with it.
//
// 'repay' is also how general transfers are stored (see src/lib/transferLabel.js): the
// source always loses the amount, but the destination only subtracts it when that
// destination is a debt account (paying one down) — any other account (asset or goal)
// receives the money normally and adds it.
export function txDeltaForAccount(t, accountId, typeById) {
  if (t.kind === "repay") {
    let d = 0;
    if (t.accountId === accountId) d -= t.amountCents;
    if (t.toAccountId === accountId) {
      const toTypeSign = typeById[t.toAccountId] === "debt" ? -1 : 1;
      d += toTypeSign * t.amountCents;
    }
    return d;
  }
  if (t.accountId !== accountId) return 0;
  const sign = t.kind === "income" ? 1 : -1;
  const typeSign = typeById[accountId] === "debt" ? -1 : 1;
  return sign * typeSign * t.amountCents;
}

export function sumDeltaForAccountInMonth(transactions, accountId, typeById, monthKey) {
  let total = 0;
  for (const t of transactions) {
    if (t.date.slice(0, 7) !== monthKey) continue;
    total += txDeltaForAccount(t, accountId, typeById);
  }
  return total;
}

// Balance the account had right before monthKey's transactions were applied
// (equivalently: balance at the end of the previous month).
export function balanceBeforeMonth(currentBalanceCents, transactions, accountId, typeById, monthKey) {
  return currentBalanceCents - sumDeltaForAccountInMonth(transactions, accountId, typeById, monthKey);
}

// Standard amortization payoff estimate: months to reach zero balance paying a fixed
// amount per period against a fixed periodic interest rate. Returns null when required
// inputs are missing, and { neverPaysOff: true } when the payment doesn't even cover
// the interest accruing each period.
export function estimatePayoffMonths(balanceOwedCents, interestRate, interestRateType, monthlyPaymentCents) {
  if (balanceOwedCents <= 0) return { months: 0, neverPaysOff: false };
  if (interestRate == null || !interestRateType || !monthlyPaymentCents || monthlyPaymentCents <= 0) return null;

  const monthlyRate = interestRateType === "yearly" ? interestRate / 100 / 12 : interestRate / 100;
  if (monthlyRate <= 0) {
    return { months: Math.ceil(balanceOwedCents / monthlyPaymentCents), neverPaysOff: false };
  }
  const interestPerPeriod = balanceOwedCents * monthlyRate;
  if (monthlyPaymentCents <= interestPerPeriod) return { months: null, neverPaysOff: true };
  const n = Math.log(monthlyPaymentCents / (monthlyPaymentCents - interestPerPeriod)) / Math.log(1 + monthlyRate);
  return { months: Math.ceil(n), neverPaysOff: false };
}
