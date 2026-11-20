import type { CashMovement, CashSession, Expense } from "./types";

export function canOpenCashSession(sessions: CashSession[], openingBalance: number): boolean;
export function calculateExpectedCash(session: CashSession, cashPayments: number, cashExpenses: number, movements: CashMovement[]): number;
export function canCloseCashSession(session: CashSession | undefined, countedBalance: number, cashPayments: number, cashExpenses: number, movements: CashMovement[]): boolean;
export function canRecordCashMovement(session: CashSession | undefined, movement: Pick<CashMovement, "type" | "amount" | "reason">, availableCash?: number): boolean;
export function canRecordExpense(expense: Pick<Expense, "category" | "description" | "amount" | "method" | "dateISO">, availableCash?: number): boolean;
