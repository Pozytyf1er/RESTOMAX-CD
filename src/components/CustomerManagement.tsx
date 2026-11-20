import { useMemo, useState, type FormEvent } from "react";
import { Gift, Mail, Phone, Plus, Search, Star, UserRound, Users, X, Award, ShoppingBag } from "lucide-react";
import type { Customer, LoyaltyReward, RestaurantOrder } from "../domain/types";
import { findLoyaltyCustomerForOrder } from "../domain/loyalty";

type Props = {
  customers: Customer[];
  orders: RestaurantOrder[];
  rewards: LoyaltyReward[];
  onAdd: (customer: Omit<Customer, "id" | "createdAt" | "points" | "rewardHistory">) => void;
  onUpdate: (customer: Customer) => void;
  onRedeem: (customerId: string, rewardId: string) => boolean;
};
const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);
const dateLabel = (value: string) => { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("fr-FR"); };
const tier = (points: number) => points >= 500 ? "Platine" : points >= 250 ? "Or" : points >= 100 ? "Argent" : "Découverte";

export default function CustomerManagement({ customers, orders, rewards, onAdd, onUpdate, onRedeem }: Props) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(customers[0]?.id ?? "");
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<"profile" | "history" | "rewards">("profile");
  const [error, setError] = useState("");
  const [redemptionMessage, setRedemptionMessage] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", birthday: "", preferences: "", notes: "", marketingConsent: false });
  const filtered = useMemo(() => customers.filter((customer) => [customer.name, customer.phone, customer.email].some((value) => value.toLowerCase().includes(query.toLowerCase()))), [customers, query]);
  const selected = customers.find((customer) => customer.id === selectedId) ?? filtered[0];
  const ordersForCustomer = (customer: Customer) => orders.filter((order) => findLoyaltyCustomerForOrder(customers, order)?.id === customer.id);
  const history = selected ? ordersForCustomer(selected).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
  const totalSpent = history.reduce((sum, order) => sum + order.lines.reduce((subtotal, line) => subtotal + line.quantity * line.unitPrice, 0), 0);
  const regulars = customers.filter((customer) => ordersForCustomer(customer).length >= 2).length;
  function redeem(rewardId: string) {
    if (!selected) return;
    const success = onRedeem(selected.id, rewardId);
    setRedemptionMessage(success ? "Récompense échangée. Les points ont été débités." : "Échange refusé : vérifiez le solde et la disponibilité de la récompense.");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) { setError("Le nom et le téléphone sont obligatoires."); return; }
    onAdd({ ...form, name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() });
    setForm({ name: "", phone: "", email: "", birthday: "", preferences: "", notes: "", marketingConsent: false });
    setError("");
    setShowForm(false);
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected) onUpdate({ ...selected, name: selected.name.trim(), phone: selected.phone.trim(), email: selected.email.trim() });
  }

  return <section className="customers-page">
    <div className="page-heading">
      <div><div className="eyebrow">RELATION CLIENT · FIDÉLISATION</div><h1>Clients & Fidélité</h1><p>Connaissez vos clients, retrouvez leurs habitudes et récompensez leur fidélité.</p></div>
      <button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={16}/> Nouveau client</button>
    </div>
    <div className="customers-metrics">
      <div><span>Fichier clients</span><strong>{customers.length}</strong><small>Profils enregistrés</small></div>
      <div><span>Clients réguliers</span><strong>{regulars}</strong><small>Au moins 2 commandes</small></div>
      <div><span>Points distribués</span><strong>{customers.reduce((sum, customer) => sum + customer.points, 0).toLocaleString("fr-FR")}</strong><small>Soldes disponibles</small></div>
      <div><span>Récompenses</span><strong>{customers.reduce((sum, customer) => sum + customer.rewardHistory.length, 0)}</strong><small>Avantages utilisés</small></div>
    </div>
    <div className="customers-layout">
      <aside className="panel customers-directory">
        <div className="panel-heading"><div><h2>Fichier clients</h2><p>{filtered.length} profil(s)</p></div><Users size={18}/></div>
        <label className="customers-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom, téléphone, e-mail…"/></label>
        <div className="customers-list">
          {filtered.map((customer) => {
            const count = ordersForCustomer(customer).length;
            return <button key={customer.id} className={selected?.id === customer.id ? "customer-list-item active" : "customer-list-item"} onClick={() => { setSelectedId(customer.id); setTab("profile"); }}>
              <span className="customer-avatar">{customer.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>
              <span className="customer-list-copy"><strong>{customer.name}</strong><small>{customer.phone}</small></span><span className="customer-list-count">{count} cmd.</span>
            </button>;
          })}
          {filtered.length === 0 && <div className="customers-empty">Aucun client trouvé.</div>}
        </div>
      </aside>
      {selected ? <main className="customers-detail">
        <section className="panel customer-profile-head">
          <div className="customer-identity"><span className="customer-avatar large">{selected.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><div><h2>{selected.name}</h2><p><span className="customer-tier"><Award size={13}/>{tier(selected.points)}</span><span className="customer-since">Client depuis {dateLabel(selected.createdAt)}</span></p></div></div>
          <div className="customer-points"><strong>{selected.points}</strong><span>points disponibles</span></div>
        </section>
        <div className="customers-tabs">
          <button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}><UserRound size={14}/> Coordonnées & préférences</button>
          <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}><ShoppingBag size={14}/> Historique ({history.length})</button>
          <button className={tab === "rewards" ? "active" : ""} onClick={() => setTab("rewards")}><Gift size={14}/> Fidélité & récompenses</button>
        </div>
        {tab === "profile" && <section className="panel customer-panel">
          <div className="panel-heading"><div><h2>Fiche client</h2><p>Coordonnées et informations utiles au service.</p></div></div>
          <form className="customer-form" onSubmit={saveProfile}>
            <label>Nom complet<input value={selected.name} onChange={(event) => onUpdate({ ...selected, name: event.target.value })} required/></label>
            <div className="customer-form-row">
              <label><Phone size={13}/> Téléphone<input value={selected.phone} onChange={(event) => onUpdate({ ...selected, phone: event.target.value })}/></label>
              <label><Mail size={13}/> E-mail<input type="email" value={selected.email} onChange={(event) => onUpdate({ ...selected, email: event.target.value })}/></label>
            </div>
            <label>Date d’anniversaire<input type="date" value={selected.birthday ?? ""} onChange={(event) => onUpdate({ ...selected, birthday: event.target.value })}/></label>
            <label>Préférences et habitudes<textarea rows={2} value={selected.preferences} onChange={(event) => onUpdate({ ...selected, preferences: event.target.value })} placeholder="Plats favoris, allergies signalées, préférences de service…"/></label>
            <label>Notes internes<textarea rows={2} value={selected.notes} onChange={(event) => onUpdate({ ...selected, notes: event.target.value })}/></label>
            <label className="customer-consent"><input type="checkbox" checked={selected.marketingConsent} onChange={(event) => onUpdate({ ...selected, marketingConsent: event.target.checked })}/> Autorise les communications commerciales</label>
            <button className="button button-primary" type="submit">Enregistrer la fiche</button>
          </form>
        </section>}
        {tab === "history" && <section className="panel customer-panel">
          <div className="panel-heading"><div><h2>Historique des commandes</h2><p>{history.length} commande(s) associée(s) · Total suivi {money(totalSpent)}</p></div></div>
          {history.length ? <div className="customer-order-history">{history.map((order) => <article key={order.id}>
            <div><strong>{order.id}</strong><small>{dateLabel(order.createdAt)} · {order.tableLabel}</small></div>
            <span className={"customer-order-status " + order.status}>{order.status === "served" ? "Servie" : order.status === "ready" ? "Prête" : order.status === "preparing" ? "En préparation" : order.status === "cancelled" ? "Annulée" : "Nouvelle"}</span>
            <strong>{money(order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0))}</strong>
            <div className="customer-order-lines">{order.lines.map((line, index) => <span key={line.itemId + index}>{line.quantity} × {line.name}</span>)}</div>
          </article>)}</div> : <div className="customers-empty">Aucune commande n’est encore rattachée à ce profil client.</div>}
        </section>}
        {tab === "rewards" && <>
          <section className="customer-loyalty-banner"><div><span>PROGRAMME DE FIDÉLITÉ</span><h2>{selected.points} points</h2><p>1 point est attribué par tranche de 1 000 FCFA sur une vente entièrement réglée et clôturée. Les remboursements confirmés reprennent les points correspondants.</p></div><Star size={30}/></section>
          <section className="panel customer-panel"><div className="panel-heading"><div><h2>Récompenses disponibles</h2><p>Échangez les points contre un avantage lors d’une prochaine visite.</p></div></div>
            {redemptionMessage && <p className={redemptionMessage.startsWith("Récompense échangée") ? "customer-success" : "customer-error"} role="status">{redemptionMessage}</p>}
            {selected.points < 0 && <p className="customer-error" role="status">Solde débiteur de {Math.abs(selected.points)} point(s) après remboursement. Les prochains gains compenseront ce solde avant de rendre des points échangeables.</p>}
            <div className="customer-reward-grid">{rewards.filter((reward) => reward.active).map((reward) => <article key={reward.id}><span className="reward-icon"><Gift size={17}/></span><h3>{reward.name}</h3><p>{reward.description}</p><div><strong>{reward.pointsCost} pts</strong><button className="button button-small button-primary" disabled={selected.points < reward.pointsCost} onClick={() => redeem(reward.id)}>Échanger</button></div></article>)}</div>
          </section>
          <section className="panel customer-panel"><div className="panel-heading"><div><h2>Journal des points</h2><p>Historique des gains, remboursements et échanges.</p></div></div>
            {selected.loyaltyTransactions?.length ? <div className="customer-redemption-list">{selected.loyaltyTransactions.slice(0, 20).map((entry) => <div key={entry.id}><Award size={15}/><strong>{entry.type === "earned" ? "Points gagnés" : entry.type === "refund_reversal" ? "Reprise après remboursement" : "Récompense échangée"}</strong><span>{entry.points > 0 ? "+" : ""}{entry.points} pts · {dateLabel(entry.createdAtISO)}</span></div>)}</div> : <div className="customers-empty">Aucun mouvement de points enregistré dans le journal. Les soldes initiaux de démonstration peuvent précéder ce journal.</div>}
          </section>
          <section className="panel customer-panel"><div className="panel-heading"><div><h2>Avantages déjà utilisés</h2><p>Historique des échanges de ce client.</p></div></div>
            {selected.rewardHistory.length ? <div className="customer-redemption-list">{selected.rewardHistory.map((entry, index) => <div key={entry.rewardName + index}><Gift size={15}/><strong>{entry.rewardName}</strong><span>{dateLabel(entry.redeemedAt)}</span></div>)}</div> : <div className="customers-empty">Aucune récompense échangée pour le moment.</div>}
          </section>
        </>}
      </main> : <div className="panel customers-empty">Sélectionnez un client ou créez une nouvelle fiche.</div>}
    </div>
    {showForm && <div className="customer-modal-backdrop" role="presentation"><form className="customer-modal" onSubmit={submit}>
      <div className="customer-modal-heading"><div><h2>Nouveau client</h2><p>Créez une fiche pour suivre ses commandes et ses points.</p></div><button type="button" className="icon-button" aria-label="Fermer" onClick={() => setShowForm(false)}><X size={17}/></button></div>
      <label>Nom complet<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required/></label>
      <label>Téléphone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required/></label>
      <label>E-mail<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })}/></label>
      <label>Date d’anniversaire<input type="date" value={form.birthday} onChange={(event) => setForm({ ...form, birthday: event.target.value })}/></label>
      <label>Préférences<textarea rows={2} value={form.preferences} onChange={(event) => setForm({ ...form, preferences: event.target.value })}/></label>
      <label>Notes<textarea rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })}/></label>
      <label className="customer-consent"><input type="checkbox" checked={form.marketingConsent} onChange={(event) => setForm({ ...form, marketingConsent: event.target.checked })}/> Consentement aux communications commerciales</label>
      {error && <p className="customer-error" role="alert">{error}</p>}
      <div className="customer-modal-actions"><button type="button" className="button button-quiet" onClick={() => setShowForm(false)}>Annuler</button><button type="submit" className="button button-primary">Créer le client</button></div>
    </form></div>}
  </section>;
}
