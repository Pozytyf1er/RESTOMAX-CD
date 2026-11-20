const CATEGORIES = ["supplies", "rent", "utilities", "salaries", "maintenance", "marketing", "other"];
const METHODS = ["cash", "mobile_money", "card", "other"];

export function canOpenCashSession(sessions, openingBalance) {
  return Number.isSafeInteger(openingBalance) && openingBalance >= 0 && !sessions.some((session) => session.status === "open");
}

export function calculateExpectedCash(session, cashPayments, cashExpenses, movements) {
  const inflows = movements.filter((movement) => movement.sessionId === session.id && movement.type === "in").reduce((sum, movement) => sum + movement.amount, 0);
  const outflows = movements.filter((movement) => movement.sessionId === session.id && movement.type === "out").reduce((sum, movement) => sum + movement.amount, 0);
  return session.openingBalance + cashPayments - cashExpenses + inflows - outflows;
}

export function canCloseCashSession(session, countedBalance, cashPayments, cashExpenses, movements) {
  if (!session || session.status !== "open" || !Number.isSafeInteger(countedBalance) || countedBalance < 0) return false;
  const expected = calculateExpectedCash(session, cashPayments, cashExpenses, movements);
  return Number.isSafeInteger(expected) && expected >= 0;
}

export function canRecordCashMovement(session, movement, availableCash = Number.MAX_SAFE_INTEGER) {
  return Boolean(session && session.status === "open")
    && ["in", "out"].includes(movement.type)
    && Number.isSafeInteger(movement.amount) && movement.amount > 0
    && (movement.type !== "out" || movement.amount <= availableCash)
    && Boolean(movement.reason?.trim()) && movement.reason.trim().length <= 160;
}

export function canRecordExpense(expense, availableCash) {
  return CATEGORIES.includes(expense.category)
    && METHODS.includes(expense.method)
    && Boolean(expense.description?.trim())
    && expense.description.trim().length <= 160
    && Number.isSafeInteger(expense.amount) && expense.amount > 0
    && /^\d{4}-\d{2}-\d{2}$/.test(expense.dateISO ?? "")
    && Number.isFinite(new Date(expense.dateISO + "T00:00:00Z").getTime())
    && new Date(expense.dateISO + "T00:00:00Z").toISOString().slice(0, 10) === expense.dateISO
    && (expense.method !== "cash" || availableCash === undefined || expense.amount <= availableCash);
}
