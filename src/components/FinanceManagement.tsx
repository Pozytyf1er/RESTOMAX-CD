import { useMemo, useState, type FormEvent } from "react";
import { Banknote, Check, ChartNoAxesCombined, CircleDollarSign, FileText, Plus, Wallet, X } from "lucide-react";
import type { CashMovement, CashMovementType, CashSession, Expense, ExpenseCategory, PaymentMethod, RestaurantOrder, Refund } from "../domain/types";
import { isSaleEligibleForRevenue, paidTotal } from "../domain/sales";
import { calculateExpectedCash } from "../domain/finance";
import { reservedRefundTotal } from "../domain/refunds";
import "./FinanceManagement.css";

type ExpenseInput = Pick<Expense, "category" | "description" | "amount" | "method" | "dateISO">;
type Props = {
  orders: RestaurantOrder[];
  expenses: Expense[];
  sessions: CashSession[];
  movements: CashMovement[];
  refunds: Refund[];
  onRecordRefund: (orderId: string, paymentId: string, amount: number, reason: string) => boolean;
  onCompleteRefund: (refundId: string) => boolean;
  onCancelRefund: (refundId: string) => boolean;
  onAddExpense: (expense: ExpenseInput) => boolean;
  onOpenSession: (openingBalance: number) => boolean;
  onCloseSession: (countedBalance: number) => boolean;
  onAddMovement: (movement: Pick<CashMovement, "type" | "amount" | "reason">) => boolean;
};

const expenseLabels: Record<ExpenseCategory, string> = {
  supplies: "Achats & approvisionnements", rent: "Loyer", utilities: "Électricité & eau",
  salaries: "Salaires & personnel", maintenance: "Entretien", marketing: "Marketing", other: "Autres",
};
const paymentLabels: Record<PaymentMethod, string> = { cash: "Espèces", mobile_money: "Mobile Money", card: "Carte bancaire", other: "Autres" };
const money = (amount: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount) + " FCFA";
const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Abidjan", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const formatDate = (value: string) => new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Abidjan" });

export default function FinanceManagement({ orders, expenses, sessions, movements, refunds, onAddExpense, onOpenSession, onCloseSession, onAddMovement, onRecordRefund, onCompleteRefund, onCancelRefund }: Props) {
  const [tab, setTab] = useState<"overview" | "expenses" | "cash" | "journal" | "refunds">("overview");
  const [showExpense, setShowExpense] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showMovement, setShowMovement] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>("supplies");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseMethod, setExpenseMethod] = useState<PaymentMethod>("cash");
  const [expenseDate, setExpenseDate] = useState(todayKey());
  const [openingBalance, setOpeningBalance] = useState("25000");
  const [countedBalance, setCountedBalance] = useState("");
  const [movementType, setMovementType] = useState<CashMovementType>("out");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [refundOrderId, setRefundOrderId] = useState("");
  const [refundPaymentId, setRefundPaymentId] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [formError, setFormError] = useState("");

  const start = new Date(todayKey() + "T12:00:00Z");
  start.setUTCDate(start.getUTCDate() - 29);
  const startKey = todayKeyFrom(start);
  const recentSales = orders.filter(isSaleEligibleForRevenue).filter((order) => {
    const date = (order.closedAtISO ?? order.createdAtISO ?? "").slice(0, 10);
    return date >= startKey && date <= todayKey();
  });
  const recentRefunds = refunds.filter((refund) => refund.createdAtISO.slice(0, 10) >= startKey && refund.createdAtISO.slice(0, 10) <= todayKey());
  const completedRefunds = recentRefunds.filter((refund) => refund.status === "completed");
  const refundTotal = completedRefunds.reduce((sum, refund) => sum + refund.amount, 0);
  const revenue = recentSales.reduce((sum, order) => sum + paidTotal(order), 0) - refundTotal;
  const recentExpenses = expenses.filter((expense) => expense.dateISO >= startKey && expense.dateISO <= todayKey());
  const expenseTotal = recentExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const operatingResult = revenue - expenseTotal;
  const currentSession = sessions.find((session) => session.status === "open");
  const sessionCashPayments = currentSession ? orders.reduce((sum, order) => sum + (order.payments ?? []).filter((payment) => payment.method === "cash" && payment.cashSessionId === currentSession.id).reduce((sub, payment) => sub + payment.amount, 0), 0) : 0;
  const sessionCashExpenses = currentSession ? expenses.filter((expense) => expense.method === "cash" && expense.cashSessionId === currentSession.id).reduce((sum, expense) => sum + expense.amount, 0) : 0;
  const expectedCash = currentSession ? calculateExpectedCash(currentSession, sessionCashPayments, sessionCashExpenses, movements) : 0;
  const methodTotals = (["cash", "mobile_money", "card", "other"] as PaymentMethod[]).map((method) => ({
    method, amount: recentSales.reduce((sum, order) => sum + (order.payments ?? []).filter((payment) => payment.method === method).reduce((sub, payment) => sub + payment.amount, 0), 0) - completedRefunds.filter((refund) => refund.method === method).reduce((sum, refund) => sum + refund.amount, 0),
  }));
  const journal = useMemo(() => [
    ...orders.flatMap((order) => (order.payments ?? []).map((payment) => ({ id: payment.id, label: `Paiement · ${order.id}`, detail: paymentLabels[payment.method], amount: payment.amount, date: payment.paidAtISO ?? order.createdAtISO ?? new Date().toISOString(), kind: "payment" as const }))),
    ...expenses.map((expense) => ({ id: expense.id, label: expense.description, detail: expenseLabels[expense.category] + " · " + paymentLabels[expense.method], amount: -expense.amount, date: expense.createdAtISO, kind: "expense" as const })),
    ...completedRefunds.map((refund) => ({ id: refund.id, label: "Remboursement · " + refund.orderId, detail: paymentLabels[refund.method] + " · " + refund.reason, amount: -refund.amount, date: refund.createdAtISO, kind: "refund" as const })),
    ...movements.filter((movement) => !movement.relatedRefundId).map((movement) => ({ id: movement.id, label: movement.reason, detail: movement.type === "in" ? "Entrée de caisse" : "Sortie de caisse", amount: movement.type === "in" ? movement.amount : -movement.amount, date: movement.createdAtISO, kind: "movement" as const })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30), [orders, expenses, movements, completedRefunds]);

  function resetExpense() { setExpenseDescription(""); setExpenseAmount(""); setExpenseCategory("supplies"); setExpenseMethod("cash"); setExpenseDate(todayKey()); }
  function submitExpense(event: FormEvent) {
    event.preventDefault(); setFormError("");
    const ok = onAddExpense({ category: expenseCategory, description: expenseDescription.trim(), amount: Number(expenseAmount), method: expenseMethod, dateISO: expenseDate });
    if (!ok) { setFormError("Vérifiez le libellé et le montant. Une dépense en espèces exige une caisse ouverte et un solde suffisant."); return; }
    resetExpense(); setShowExpense(false);
  }
  function submitOpen(event: FormEvent) {
    event.preventDefault(); setFormError("");
    if (!onOpenSession(Number(openingBalance))) { setFormError("Une caisse est déjà ouverte ou le fond initial est invalide."); return; }
    setShowOpen(false);
  }
  function submitClose(event: FormEvent) {
    event.preventDefault(); setFormError("");
    if (!onCloseSession(Number(countedBalance))) { setFormError("Saisissez un montant compté valide pour clôturer la caisse."); return; }
    setCountedBalance(""); setShowClose(false);
  }
  const eligibleRefundOrders = orders.filter((order) => isSaleEligibleForRevenue(order) && order.paymentStatus !== "refunded");
  const selectedRefundOrder = eligibleRefundOrders.find((order) => order.id === refundOrderId);
  const selectedRefundPayment = selectedRefundOrder?.payments?.find((payment) => payment.id === refundPaymentId);
  const refundRemaining = selectedRefundPayment ? selectedRefundPayment.amount - reservedRefundTotal(refunds, selectedRefundPayment.id) : 0;

  function submitRefund(event: FormEvent) {
    event.preventDefault(); setFormError("");
    if (!onRecordRefund(refundOrderId, refundPaymentId, Number(refundAmount), refundReason.trim())) {
      setFormError("Remboursement refusé : vérifiez le montant restant, le motif, les droits et la caisse.");
      return;
    }
    setRefundAmount(""); setRefundReason(""); setRefundOrderId(""); setRefundPaymentId("");
  }

  function submitMovement(event: FormEvent) {
    event.preventDefault(); setFormError("");
    if (!onAddMovement({ type: movementType, amount: Number(movementAmount), reason: movementReason.trim() })) { setFormError("Une caisse ouverte, un montant entier positif et un motif sont requis."); return; }
    setMovementAmount(""); setMovementReason(""); setShowMovement(false);
  }

  return <section className="finance-page">
    <header className="page-heading"><div><div className="eyebrow">PILOTAGE FINANCIER</div><h1>Finance & Comptabilité</h1><p>Suivez les encaissements, les dépenses et les clôtures de caisse. Les états comptables certifiés restent à raccorder.</p></div><span className="demo-tag">DÉMONSTRATION</span></header>
    <div className="finance-tabs"><button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>Synthèse</button><button className={tab === "expenses" ? "active" : ""} onClick={() => setTab("expenses")}>Dépenses</button><button className={tab === "cash" ? "active" : ""} onClick={() => setTab("cash")}>Caisse & clôture</button><button className={tab === "journal" ? "active" : ""} onClick={() => setTab("journal")}>Journal</button><button className={tab === "refunds" ? "active" : ""} onClick={() => setTab("refunds")}>Remboursements</button></div>

    {tab === "overview" && <>
      <div className="finance-kpis"><article><span><CircleDollarSign size={17}/> Chiffre d’affaires encaissé</span><strong>{money(revenue)}</strong><small>Ventes clôturées · 30 jours</small></article><article><span><Wallet size={17}/> Dépenses enregistrées</span><strong>{money(expenseTotal)}</strong><small>Charges · 30 jours</small></article><article><span><CircleDollarSign size={17}/> Remboursements confirmés</span><strong>{money(refundTotal)}</strong><small>Sur les 30 derniers jours</small></article><article><span><ChartNoAxesCombined size={17}/> Solde après dépenses saisies</span><strong className={operatingResult >= 0 ? "positive" : "negative"}>{money(operatingResult)}</strong><small>CA encaissé moins dépenses enregistrées</small></article><article><span><Banknote size={17}/> Fond de caisse attendu</span><strong>{currentSession ? money(expectedCash) : "—"}</strong><small>{currentSession ? "Session en cours" : "Aucune session ouverte"}</small></article></div>
      <div className="finance-main-grid"><section className="panel finance-panel"><header><div><h2>Encaissements par moyen</h2><p>Répartition des ventes clôturées · 30 jours</p></div></header>{methodTotals.map(({ method, amount }) => <div className="finance-method-row" key={method}><span>{paymentLabels[method]}</span><strong>{money(amount)}</strong><div><i style={{ width: (revenue > 0 ? Math.max(0, amount / revenue * 100) : 0) + "%" }}/></div></div>)}</section>
        <section className="panel finance-panel"><header><div><h2>Session de caisse</h2><p>Suivi du fond et des mouvements en espèces</p></div></header>{currentSession ? <><div className="finance-session-status"><i/> Caisse ouverte depuis le {formatDate(currentSession.openedAtISO)}</div><div className="finance-session-line"><span>Fond initial</span><strong>{money(currentSession.openingBalance)}</strong></div><div className="finance-session-line"><span>Encaissements espèces</span><strong>+ {money(sessionCashPayments)}</strong></div><div className="finance-session-line"><span>Dépenses espèces</span><strong>− {money(sessionCashExpenses)}</strong></div><div className="finance-session-total"><span>Solde attendu</span><strong>{money(expectedCash)}</strong></div><button className="button button-primary" onClick={() => setTab("cash")}>Gérer la caisse</button></> : <div className="finance-empty">Aucune session de caisse ouverte.</div>}</section></div>
    </>}

    {tab === "expenses" && <section className="panel finance-panel"><header><div><h2>Registre des dépenses</h2><p>Charges saisies sur les 30 derniers jours · {recentExpenses.length} opération(s)</p></div><button className="button button-primary" onClick={() => setShowExpense(true)}><Plus size={15}/> Nouvelle dépense</button></header><div className="finance-expense-list">{recentExpenses.map((expense) => <article key={expense.id}><span className="finance-expense-icon"><FileText size={16}/></span><div><strong>{expense.description}</strong><small>{expenseLabels[expense.category]} · {formatDate(expense.createdAtISO)}</small></div><span>{paymentLabels[expense.method]}</span><strong className="negative">− {money(expense.amount)}</strong></article>)}{!recentExpenses.length && <div className="finance-empty">Aucune dépense enregistrée sur cette période.</div>}</div></section>}

    {tab === "cash" && <div className="finance-cash-grid"><section className="panel finance-panel"><header><div><h2>Session de caisse</h2><p>Une seule session peut être ouverte à la fois.</p></div></header>{currentSession ? <><div className="finance-session-status"><i/> Session ouverte · {formatDate(currentSession.openedAtISO)}</div><div className="finance-session-total"><span>Solde théorique</span><strong>{money(expectedCash)}</strong></div><div className="finance-session-line"><span>Fond initial</span><strong>{money(currentSession.openingBalance)}</strong></div><div className="finance-session-line"><span>Ventes espèces depuis ouverture</span><strong>+ {money(sessionCashPayments)}</strong></div><div className="finance-session-line"><span>Dépenses espèces depuis ouverture</span><strong>− {money(sessionCashExpenses)}</strong></div><div className="finance-cash-actions"><button className="button button-secondary" onClick={() => setShowMovement(true)}><Plus size={14}/> Mouvement</button><button className="button button-primary" onClick={() => setShowClose(true)}>Clôturer la caisse</button></div></> : <><div className="finance-empty">La caisse est fermée. Ouvrez une session avant d’enregistrer des mouvements.</div><button className="button button-primary" onClick={() => setShowOpen(true)}>Ouvrir une session</button></>}</section>
      <section className="panel finance-panel"><header><div><h2>Historique des clôtures</h2><p>Écarts entre le solde attendu et le montant compté.</p></div></header>{sessions.filter((session) => session.status === "closed").map((session) => <article className="finance-closed-session" key={session.id}><div><strong>{formatDate(session.closedAtISO ?? session.openedAtISO)}</strong><small>Fond initial : {money(session.openingBalance)}</small></div><div><span>Compté</span><strong>{money(session.countedBalance ?? 0)}</strong></div><div><span>Écart</span><strong className={(session.variance ?? 0) === 0 ? "positive" : "negative"}>{money(session.variance ?? 0)}</strong></div></article>)}{!sessions.some((session) => session.status === "closed") && <div className="finance-empty">Aucune clôture enregistrée.</div>}</section>
      <section className="panel finance-panel"><header><div><h2>Mouvements de caisse</h2><p>Entrées et sorties hors ventes et dépenses.</p></div></header>{movements.slice().sort((a,b) => b.createdAtISO.localeCompare(a.createdAtISO)).map((movement) => <article className="finance-movement-row" key={movement.id}><span>{movement.type === "in" ? "Entrée" : "Sortie"}</span><strong>{movement.reason}</strong><em className={movement.type === "in" ? "positive" : "negative"}>{movement.type === "in" ? "+" : "−"} {money(movement.amount)}</em></article>)}{!movements.length && <div className="finance-empty">Aucun mouvement de caisse.</div>}</section></div>}

    {tab === "refunds" && <div className="finance-refunds-grid"><section className="panel finance-panel"><header><div><h2>Enregistrer un remboursement</h2><p>Le remboursement en espèces sort immédiatement de la caisse. Les remboursements Mobile Money/carte restent en attente de confirmation manuelle.</p></div></header><form className="finance-refund-form" onSubmit={submitRefund}><label>Vente clôturée<select required value={refundOrderId} onChange={(event)=>{const orderId=event.target.value;setRefundOrderId(orderId);const order=eligibleRefundOrders.find((entry)=>entry.id===orderId);setRefundPaymentId(order?.payments?.[0]?.id??"");}}><option value="">Sélectionner une vente</option>{eligibleRefundOrders.map((order)=><option key={order.id} value={order.id}>{order.id} · {order.customerName} · {money(paidTotal(order))}</option>)}</select></label><label>Paiement d’origine<select required value={refundPaymentId} onChange={(event)=>setRefundPaymentId(event.target.value)}><option value="">Sélectionner un paiement</option>{(selectedRefundOrder?.payments??[]).map((payment)=><option key={payment.id} value={payment.id}>{paymentLabels[payment.method]} · {money(payment.amount)} · reste {money(payment.amount-reservedRefundTotal(refunds,payment.id))}</option>)}</select></label><label>Montant à rembourser (FCFA)<input required type="number" min={1} max={refundRemaining} step={1} value={refundAmount} onChange={(event)=>setRefundAmount(event.target.value)} placeholder="0"/></label><small className="finance-refund-remaining">Montant remboursable restant : {money(refundRemaining)}</small><label>Motif du remboursement<input required minLength={8} maxLength={200} value={refundReason} onChange={(event)=>setRefundReason(event.target.value)} placeholder="Ex. article non conforme"/></label>{formError && <p className="finance-form-error" role="alert">{formError}</p>}<button type="submit" className="button button-primary">Enregistrer le remboursement</button></form></section><section className="panel finance-panel"><header><div><h2>Historique des remboursements</h2><p>{refunds.length} opération(s) · les montants en attente sont réservés contre les doublons.</p></div></header><div className="finance-refund-list">{refunds.slice().sort((a,b)=>b.createdAtISO.localeCompare(a.createdAtISO)).map((refund)=><article key={refund.id}><div><strong>{refund.orderId}</strong><small>{paymentLabels[refund.method]} · {formatDate(refund.createdAtISO)}</small><small>{refund.reason}</small></div><div><strong className={refund.status==="completed"?"negative":"pending"}>{refund.status==="completed"?"− ":""}{money(refund.amount)}</strong><em className={`refund-status ${refund.status}`}>{refund.status==="completed"?"Confirmé":refund.status==="pending"?"À confirmer":"Annulé"}</em>{refund.status==="pending" && <><button className="finance-confirm-refund" onClick={()=>{if(!onCompleteRefund(refund.id))setFormError("Impossible de confirmer ce remboursement.");}}>Confirmer le transfert</button><button className="finance-cancel-refund" onClick={()=>{if(!onCancelRefund(refund.id))setFormError("Impossible d’annuler ce remboursement.");}}>Annuler</button></>}</div></article>)}{!refunds.length && <div className="finance-empty">Aucun remboursement enregistré.</div>}</div></section></div>}

    {tab === "journal" && <section className="panel finance-panel"><header><div><h2>Journal financier</h2><p>Dernières opérations de paiement, dépenses et mouvements.</p></div></header><div className="finance-journal">{journal.map((entry) => <article key={entry.id}><span className={`finance-journal-icon ${entry.kind}`}>{entry.kind === "payment" ? <Wallet size={15}/> : entry.kind === "expense" ? <FileText size={15}/> : entry.kind === "refund" ? <CircleDollarSign size={15}/> : <Banknote size={15}/>}</span><div><strong>{entry.label}</strong><small>{entry.detail} · {formatDate(entry.date)}</small></div><strong className={entry.amount >= 0 ? "positive" : "negative"}>{entry.amount >= 0 ? "+" : "−"} {money(Math.abs(entry.amount))}</strong></article>)}</div></section>}

    {showExpense && <div className="finance-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowExpense(false); }}><section className="finance-modal" role="dialog" aria-modal="true" aria-labelledby="expense-title"><header><div><h2 id="expense-title">Nouvelle dépense</h2><p>Enregistrez une charge du restaurant.</p></div><button className="icon-button" onClick={() => setShowExpense(false)} aria-label="Fermer"><X size={18}/></button></header><form onSubmit={submitExpense}><label>Catégorie<select value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value as ExpenseCategory)}>{Object.entries(expenseLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Libellé<input required maxLength={160} value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} placeholder="Ex. achat de marchandises"/></label><label>Montant (FCFA)<input required type="number" min={1} step={1} value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} placeholder="0"/></label><label>Moyen de paiement<select value={expenseMethod} onChange={(event) => setExpenseMethod(event.target.value as PaymentMethod)}>{Object.entries(paymentLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Date<input required type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)}/></label>{formError && <p className="finance-form-error" role="alert">{formError}</p>}<footer><button type="button" className="button button-secondary" onClick={() => setShowExpense(false)}>Annuler</button><button type="submit" className="button button-primary"><Check size={15}/> Enregistrer</button></footer></form></section></div>}
    {showOpen && <div className="finance-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowOpen(false); }}><section className="finance-modal" role="dialog" aria-modal="true" aria-labelledby="cash-open-title"><header><div><h2 id="cash-open-title">Ouvrir la caisse</h2><p>Saisissez le fond initial réellement présent.</p></div><button className="icon-button" onClick={() => setShowOpen(false)} aria-label="Fermer"><X size={18}/></button></header><form onSubmit={submitOpen}><label>Fond initial (FCFA)<input required type="number" min={0} step={1} value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)}/></label>{formError && <p className="finance-form-error" role="alert">{formError}</p>}<footer><button type="button" className="button button-secondary" onClick={() => setShowOpen(false)}>Annuler</button><button type="submit" className="button button-primary">Ouvrir</button></footer></form></section></div>}
    {showClose && <div className="finance-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowClose(false); }}><section className="finance-modal" role="dialog" aria-modal="true" aria-labelledby="cash-close-title"><header><div><h2 id="cash-close-title">Clôturer la caisse</h2><p>Solde attendu : {money(expectedCash)}. Comptez les espèces avant validation.</p></div><button className="icon-button" onClick={() => setShowClose(false)} aria-label="Fermer"><X size={18}/></button></header><form onSubmit={submitClose}><label>Montant réellement compté (FCFA)<input required type="number" min={0} step={1} value={countedBalance} onChange={(event) => setCountedBalance(event.target.value)}/></label>{formError && <p className="finance-form-error" role="alert">{formError}</p>}<footer><button type="button" className="button button-secondary" onClick={() => setShowClose(false)}>Annuler</button><button type="submit" className="button button-primary">Confirmer la clôture</button></footer></form></section></div>}
    {showMovement && <div className="finance-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowMovement(false); }}><section className="finance-modal" role="dialog" aria-modal="true" aria-labelledby="movement-title"><header><div><h2 id="movement-title">Mouvement de caisse</h2><p>Tracez une entrée ou une sortie hors vente.</p></div><button className="icon-button" onClick={() => setShowMovement(false)} aria-label="Fermer"><X size={18}/></button></header><form onSubmit={submitMovement}><label>Type<select value={movementType} onChange={(event) => setMovementType(event.target.value as CashMovementType)}><option value="out">Sortie d’espèces</option><option value="in">Entrée d’espèces</option></select></label><label>Montant (FCFA)<input required type="number" min={1} step={1} value={movementAmount} onChange={(event) => setMovementAmount(event.target.value)} placeholder="0"/></label><label>Motif<input required maxLength={160} value={movementReason} onChange={(event) => setMovementReason(event.target.value)} placeholder="Motif du mouvement"/></label>{formError && <p className="finance-form-error" role="alert">{formError}</p>}<footer><button type="button" className="button button-secondary" onClick={() => setShowMovement(false)}>Annuler</button><button type="submit" className="button button-primary">Enregistrer</button></footer></form></section></div>}
  </section>;
}

function todayKeyFrom(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Abidjan", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
