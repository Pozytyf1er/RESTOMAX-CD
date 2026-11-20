import { useMemo, useState, type FormEvent } from "react";
import { Banknote, CheckCircle2, CircleDollarSign, CreditCard, MoreHorizontal, Smartphone, Wallet } from "lucide-react";
import type { OrderPayment, PaymentMethod, RestaurantOrder } from "../domain/types";

type Props = {
  orders: RestaurantOrder[];
  initialSelectedOrderId?: string | null;
  onPayment: (orderId: string, payment: OrderPayment) => boolean;
  onCloseSale: (orderId: string) => boolean;
};

const money = (amount: number) => new Intl.NumberFormat("fr-FR", {
  style: "currency", currency: "XOF", maximumFractionDigits: 0,
}).format(amount);

const totalOf = (order: RestaurantOrder) =>
  order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
const paidOf = (order: RestaurantOrder) =>
  (order.payments ?? []).reduce((sum, payment) => sum + payment.amount, 0);

export default function CashRegister({ orders, initialSelectedOrderId, onPayment, onCloseSale }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedOrderId ?? null);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const readyOrders = useMemo(() => orders.filter((order) =>
    ["ready", "served"].includes(order.status) && !order.closedAt && !order.closedAtISO
  ), [orders]);
  const closedOrders = useMemo(() => orders.filter((order) => Boolean(order.closedAt || order.closedAtISO)), [orders]);
  const selected = readyOrders.find((order) => order.id === selectedId) ?? null;
  const selectedTotal = selected ? totalOf(selected) : 0;
  const selectedPaid = selected ? paidOf(selected) : 0;
  const remaining = Math.max(0, selectedTotal - selectedPaid);
  const paidCount = readyOrders.filter((order) => paidOf(order) >= totalOf(order)).length;

  function openSale(orderId: string) {
    setSelectedId(orderId);
    setAmount("");
    setReference("");
    setMethod("cash");
    setError("");
    setNotice("");
  }

  function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const parsed = Number(amount);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      setError("Saisissez un montant supérieur à zéro.");
      return;
    }
    if (parsed > remaining) {
      setError("Le montant dépasse le solde restant.");
      return;
    }
    const now = new Date();
    const accepted = onPayment(selected.id, {
      id: "PAY-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
      method,
      amount: parsed,
      paidAt: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      paidAtISO: now.toISOString(),
      ...(method === "mobile_money" && reference.trim() ? { reference: reference.trim() } : {}),
    });
    if (!accepted) {
      setError("Le paiement n’a pas été enregistré. Vérifiez la session de caisse et réessayez.");
      return;
    }
    setAmount("");
    setReference("");
    setError("");
    setNotice("Paiement enregistré en mode démonstration.");
  }

  return <section className="cash-page">
    <div className="page-heading">
      <div><div className="eyebrow">FRONT OFFICE · ENCAISSEMENT</div><h1>Caisse & Encaissement</h1><p>Ouvrez les ventes prêtes ou servies, enregistrez un ou plusieurs règlements et clôturez la commande une fois soldée.</p></div>
      <span className="live-indicator"><i/> Caisse de démonstration</span>
    </div>

    <div className="cash-summary">
      <div><span>Ventes à encaisser</span><strong>{readyOrders.length}</strong></div>
      <div><span>Soldées · à clôturer</span><strong>{paidCount}</strong></div>
      <div><span>Ventes clôturées</span><strong>{closedOrders.length}</strong></div>
    </div>

    <div className="cash-layout">
      <section className="panel cash-orders-panel">
        <div className="panel-heading"><div><h2>Commandes à encaisser</h2><p>Les commandes prêtes ou déjà servies restent encaissables jusqu’à leur clôture.</p></div><span className="demo-tag">DÉMO</span></div>
        {readyOrders.length ? <div className="cash-order-list">
          {readyOrders.map((order) => {
            const total = totalOf(order);
            const paid = paidOf(order);
            const balance = Math.max(0, total - paid);
            return <article className={`cash-order-card ${selectedId === order.id ? "selected" : ""}`} key={order.id}>
              <div className="cash-order-main">
                <div><strong>{order.id}</strong><span>{order.tableLabel} · {order.customerName} · {order.createdAt}</span></div>
                <strong className="cash-order-total">{money(total)}</strong>
              </div>
              <div className="cash-order-progress"><span>Déjà réglé : {money(paid)}</span><strong>{balance > 0 ? `Reste ${money(balance)}` : "Montant soldé"}</strong></div>
              <div className="cash-order-actions"><span className={balance === 0 ? "cash-paid-tag" : "cash-due-tag"}>{balance === 0 ? "À clôturer" : "À encaisser"}</span><button className="button button-small button-primary" onClick={() => openSale(order.id)}><Wallet size={14}/> {selectedId === order.id ? "Vente ouverte" : "Ouvrir la vente"}</button></div>
            </article>;
          })}
        </div> : <div className="cash-empty"><CheckCircle2 size={26}/><strong>Aucune commande à encaisser</strong><span>Les commandes apparaîtront ici après leur passage à « Prête ».</span></div>}
      </section>

      <section className="panel cash-sale-panel">
        {!selected || selected.closedAt ? <div className="cash-empty cash-sale-empty"><CircleDollarSign size={29}/><strong>Aucune vente ouverte</strong><span>Sélectionnez une commande prête pour afficher son ticket et procéder à l’encaissement.</span></div> : <>
          <div className="panel-heading"><div><h2>Vente · {selected.id}</h2><p>{selected.tableLabel} · {selected.customerName}</p></div><span className="demo-tag">OUVERTE</span></div>
          <div className="cash-sale-lines">{selected.lines.map((line, index) => <div className="cash-sale-line" key={`${line.itemId}-${index}`}><span>{line.quantity} × {line.name}</span><strong>{money(line.quantity * line.unitPrice)}</strong></div>)}</div>
          <div className="cash-total-row"><span>Total de la vente</span><strong>{money(selectedTotal)}</strong></div>
          <div className="cash-payment-progress"><div><span>Déjà encaissé</span><strong>{money(selectedPaid)}</strong></div><div><span>Reste à payer</span><strong>{money(remaining)}</strong></div></div>
          {(selected.payments ?? []).length > 0 && <div className="cash-history"><strong>Historique des règlements</strong>{selected.payments!.map((payment) => <div key={payment.id}><span>{payment.method === "cash" ? "Espèces" : payment.method === "mobile_money" ? "Mobile Money" : payment.method === "card" ? "Carte bancaire" : "Autres"} · {payment.paidAt}{payment.reference ? ` · ${payment.reference}` : ""}</span><strong>{money(payment.amount)}</strong></div>)}</div>}
          {remaining > 0 ? <form className="cash-payment-form" onSubmit={recordPayment}>
            <strong>Enregistrer un règlement</strong>
            <fieldset><legend>Mode de paiement</legend>
              <label className={method === "cash" ? "selected" : ""}><input type="radio" name="payment-method" checked={method === "cash"} onChange={() => setMethod("cash")}/><Banknote size={16}/> Espèces</label>
              <label className={method === "mobile_money" ? "selected" : ""}><input type="radio" name="payment-method" checked={method === "mobile_money"} onChange={() => setMethod("mobile_money")}/><Smartphone size={16}/> Mobile Money</label>
              <label className={method === "card" ? "selected" : ""}><input type="radio" name="payment-method" checked={method === "card"} onChange={() => setMethod("card")}/><CreditCard size={16}/> Carte bancaire</label>
              <label className={method === "other" ? "selected" : ""}><input type="radio" name="payment-method" checked={method === "other"} onChange={() => setMethod("other")}/><MoreHorizontal size={16}/> Autres</label>
            </fieldset>
            <label className="cash-field">Montant reçu (FCFA)<input type="number" min="1" max={remaining} step="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={String(remaining)} required/></label>
            {(method === "mobile_money" || method === "card") && <label className="cash-field">Référence de transaction (facultatif)<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Ex. TXN-123456"/></label>}
            {error && <p className="cash-error" role="alert">{error}</p>}
            {notice && <p className="cash-notice" role="status">{notice}</p>}
            <button className="button button-primary cash-submit" type="submit"><CircleDollarSign size={15}/> Enregistrer le paiement</button>
            <small className="cash-demo-note">Les règlements sont enregistrés en mode démonstration. Aucun transfert Mobile Money ou bancaire réel n’est initié.</small>
          </form> : <div className="cash-settled"><CheckCircle2 size={18}/><div><strong>Vente intégralement réglée</strong><span>Vous pouvez maintenant clôturer cette commande.</span></div></div>}
          {remaining === 0 && <button className="button button-primary cash-close-button" onClick={() => { if (!onCloseSale(selected.id)) { setError("La clôture a été refusée. Vérifiez le paiement intégral et le statut de la commande."); return; } setSelectedId(null); setNotice(""); setError(""); }}>Clôturer la commande</button>}
        </>}
      </section>
    </div>

    {closedOrders.length > 0 && <section className="panel cash-closed-panel"><div className="panel-heading"><div><h2>Dernières ventes clôturées</h2><p>Historique des commandes soldées.</p></div></div><div className="cash-closed-list">{closedOrders.slice(0, 5).map((order) => <div key={order.id}><span><strong>{order.id}</strong><small>{order.tableLabel} · {order.closedAt || (order.closedAtISO ? new Date(order.closedAtISO).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—")}</small></span><strong>{money(totalOf(order))}</strong><span className="cash-paid-tag">Clôturée</span></div>)}</div></section>}
  </section>;
}
