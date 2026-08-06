// A 'repay'-kind transaction is stored the same way for every destination account type —
// only the label shown to the user changes, based on what the destination actually is.
// `verb` is direction-neutral (combine with จาก/ไปยัง); `toward` already reads as "X {name}".
export function describeTransfer(toAccount) {
  if (toAccount?.type === "debt") return { verb: "ชำระ", toward: "ชำระ", noun: "ชำระหนี้", icon: "🔁" };
  if (toAccount?.isGoalAccount) return { verb: "โอน", toward: "โอนเข้า", noun: "โอนเข้าเป้าหมายออม", icon: "🎯" };
  return { verb: "โอน", toward: "โอนเข้า", noun: "โอนเงิน", icon: "↔️" };
}
