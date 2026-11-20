import { useMemo, useState } from "react";
import { Activity, Banknote, CalendarDays, ChartNoAxesCombined, ChefHat, Clock3, ShoppingBag, Store, TrendingUp, Users, Utensils } from "lucide-react";
import type { AttendanceEntry, Refund, Reservation, RestaurantOrder, StaffMember, StaffRole, StaffShift } from "../domain/types";
import { workedMinutes } from "../domain/hr";
import { isSaleEligibleForRevenue, paidTotal } from "../domain/sales";

type Props = { orders: RestaurantOrder[]; staff: StaffMember[]; reservations: Reservation[]; shifts: StaffShift[]; attendance: AttendanceEntry[]; refunds: Refund[] };
type Period = "7" | "30" | "90" | "custom";
const money = (amount: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
const roleLabels: Record<StaffRole, string> = { owner: "Propriétaire", manager: "Manager", cashier: "Caisse", server: "Service en salle", kitchen: "Cuisine & Bar" };
const roleIcons: Record<StaffRole, typeof Users> = { owner: Store, manager: Activity, cashier: Banknote, server: Users, kitchen: ChefHat };
const localDateKey = (date: Date) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Abidjan", year: "numeric", month: "2-digit", day: "2-digit",
}).format(date);
const parseClock = (clock: string | undefined, fallback: Date) => {
  const match = clock?.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  return new Date(localDateKey(fallback) + "T" + match[1].padStart(2, "0") + ":" + match[2] + ":00+00:00");
};
const parseOrderDate = (order: RestaurantOrder) => {
  if (order.createdAtISO) { const value = new Date(order.createdAtISO); if (!Number.isNaN(value.getTime())) return value; }
  return parseClock(order.createdAt, new Date());
};
const parseSaleDate = (order: RestaurantOrder) => {
  if (order.closedAtISO) { const value = new Date(order.closedAtISO); if (!Number.isNaN(value.getTime())) return value; }
  return parseClock(order.closedAt, parseOrderDate(order));
};
const formatDay = (key: string) => new Date(key + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", timeZone: "Africa/Abidjan" });
const hourOf = (order: RestaurantOrder) => Number(new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Abidjan", hour: "2-digit", hourCycle: "h23",
}).format(parseOrderDate(order)));

export default function ReportsStatistics({ orders, staff, reservations, shifts, attendance, refunds }: Props) {
  const today = localDateKey(new Date());
  const [period, setPeriod] = useState<Period>("30");
  const [from, setFrom] = useState(() => { const date = new Date(); date.setDate(date.getDate() - 29); return localDateKey(date); });
  const [to, setTo] = useState(today);
  const [tab, setTab] = useState<"sales" | "products" | "team" | "traffic">("sales");
  const start = period === "custom" ? from : (() => { const date = new Date(); date.setDate(date.getDate() - (Number(period) - 1)); return localDateKey(date); })();
  const end = period === "custom" ? to : today;
  const rangeStart = new Date(start + "T00:00:00+00:00");
  const rangeEnd = new Date(end + "T23:59:59.999+00:00");
  const completedSales = useMemo(() => orders.filter(isSaleEligibleForRevenue).map((order) => ({ order, date: parseSaleDate(order), amount: paidTotal(order) })).filter(({ date }) => date >= rangeStart && date <= rangeEnd), [orders, start, end]);
  const periodOrders = useMemo(() => orders.filter((order) => order.status !== "cancelled").filter((order) => { const date = parseOrderDate(order); return date >= rangeStart && date <= rangeEnd; }), [orders, start, end]);
  const completedRefunds = refunds.filter((refund) => refund.status === "completed" && new Date(refund.createdAtISO) >= rangeStart && new Date(refund.createdAtISO) <= rangeEnd);
  const refundTotal = completedRefunds.reduce((sum, refund) => sum + refund.amount, 0);
  const revenue = completedSales.reduce((sum, sale) => sum + sale.amount, 0) - refundTotal;
  const orderCount = completedSales.length;
  const averageTicket = orderCount ? revenue / orderCount : 0;
  const previousStart = new Date(rangeStart); previousStart.setDate(previousStart.getDate() - Math.max(1, Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1));
  const previousEnd = new Date(rangeStart.getTime() - 1);
  const previousGrossRevenue = orders.filter(isSaleEligibleForRevenue).filter((order) => { const date = parseSaleDate(order); return date >= previousStart && date <= previousEnd; }).reduce((sum, order) => sum + paidTotal(order), 0);
  const previousRefundTotal = refunds.filter((refund) => refund.status === "completed" && new Date(refund.createdAtISO) >= previousStart && new Date(refund.createdAtISO) <= previousEnd).reduce((sum, refund) => sum + refund.amount, 0);
  const previousRevenue = previousGrossRevenue - previousRefundTotal;
  const growth = previousRevenue ? ((revenue - previousRevenue) / previousRevenue) * 100 : null;

  const productRows = useMemo(() => {
    const products = new Map<string, { id: string; name: string; quantity: number; revenue: number }>();
    completedSales.forEach(({ order }) => order.lines.forEach((line) => {
      const current = products.get(line.itemId) ?? { id: line.itemId, name: line.name, quantity: 0, revenue: 0 };
      current.quantity += line.quantity;
      current.revenue += line.quantity * line.unitPrice;
      products.set(line.itemId, current);
    }));
    return [...products.values()].sort((a, b) => b.revenue - a.revenue);
  }, [completedSales]);
  const daily = useMemo(() => {
    const span = Math.max(1, Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1);
    const buckets = new Map<string, { label: string; revenue: number; orders: number }>();
    if (span <= 14) {
      for (let i = 0; i < span; i++) { const date = new Date(rangeStart); date.setDate(date.getDate() + i); const key = localDateKey(date); buckets.set(key, { label: formatDay(key), revenue: 0, orders: 0 }); }
      completedSales.forEach(({ date, amount }) => { const key = localDateKey(date); const item = buckets.get(key); if (item) { item.revenue += amount; item.orders += 1; } });
      completedRefunds.forEach((refund) => { const key = localDateKey(new Date(refund.createdAtISO)); const item = buckets.get(key); if (item) item.revenue -= refund.amount; });
    } else {
      for (let i = 0; i < span; i += 7) { const date = new Date(rangeStart); date.setDate(date.getDate() + i); const key = localDateKey(date); buckets.set(key, { label: formatDay(key), revenue: 0, orders: 0 }); }
      completedSales.forEach(({ date, amount }) => { const offset = Math.floor((date.getTime() - rangeStart.getTime()) / 86400000); const index = Math.floor(offset / 7) * 7; const bucketDate = new Date(rangeStart); bucketDate.setDate(bucketDate.getDate() + index); const item = buckets.get(localDateKey(bucketDate)); if (item) { item.revenue += amount; item.orders += 1; } });
      completedRefunds.forEach((refund) => { const date = new Date(refund.createdAtISO); const offset = Math.floor((date.getTime() - rangeStart.getTime()) / 86400000); const index = Math.floor(offset / 7) * 7; const bucketDate = new Date(rangeStart); bucketDate.setDate(bucketDate.getDate() + index); const item = buckets.get(localDateKey(bucketDate)); if (item) item.revenue -= refund.amount; });
    }
    return [...buckets.values()];
  }, [completedSales, completedRefunds, start, end]);
  const maxBar = Math.max(1, ...daily.map((item) => item.revenue));
  const onSite = periodOrders.filter((order) => order.tableLabel !== "À emporter").length;
  const takeaway = periodOrders.length - onSite;
  const periodShifts = shifts.filter((shift) => shift.dateISO >= start && shift.dateISO <= end && shift.status !== "cancelled");
  const periodAttendance = attendance.filter((entry) => entry.dateISO >= start && entry.dateISO <= end);
  const presentCount = periodAttendance.length;
  const lateCount = periodAttendance.filter((entry) => entry.status === "late").length;
  const workedHours = periodAttendance.reduce((sum, entry) => sum + workedMinutes(entry) / 60, 0);
  const periodReservations = reservations.filter((reservation) => {
    const date = new Date(reservation.dateISO + "T12:00:00+00:00");
    return date >= rangeStart && date <= rangeEnd && !["cancelled", "no_show"].includes(reservation.status);
  });
  const confirmedReservations = periodReservations.filter((reservation) => reservation.status !== "pending");
  const expectedCovers = confirmedReservations.reduce((sum, reservation) => sum + reservation.partySize, 0);
  const pendingReservations = periodReservations.filter((reservation) => reservation.status === "pending").length;
  const noShowReservations = reservations.filter((reservation) => reservation.dateISO >= start && reservation.dateISO <= end && reservation.status === "no_show").length;
  const customerOrderCounts = new Map<string, number>();
  periodOrders.forEach((order) => {
    const name = order.customerName.trim().toLocaleLowerCase("fr");
    if (name && !/^client( qr| sur place)?$/i.test(name)) customerOrderCounts.set(name, (customerOrderCounts.get(name) ?? 0) + 1);
  });
  const identifiedCustomers = customerOrderCounts.size;
  const repeatCustomers = [...customerOrderCounts.values()].filter((count) => count > 1).length;
  const peakHours = new Map<number, number>();
  periodOrders.forEach((order) => { const hour = hourOf(order); peakHours.set(hour, (peakHours.get(hour) ?? 0) + 1); });
  const busiestHour = [...peakHours.entries()].sort((a, b) => b[1] - a[1])[0];
  const roleActivity = (role: StaffRole) => {
    if (role === "kitchen") return periodOrders.filter((order) => order.preparedByRole === "kitchen" || order.lines.some((line) => line.preparationStatus === "preparing" || line.preparationStatus === "ready")).length;
    if (role === "cashier") return completedSales.filter(({ order }) => order.closedByRole === "cashier" || Boolean(order.closedAt || order.closedAtISO)).length;
    if (role === "server") return periodOrders.filter((order) => order.servedByRole === "server" || order.status === "served").length;
    if (role === "manager") return 0;
    return 0;
  };
  const activeStaff = staff.filter((member) => member.active);
  const roles = ["owner", "manager", "cashier", "server", "kitchen"] as StaffRole[];
  const maxProduct = Math.max(1, ...productRows.map((item) => item.revenue));

  return <section className="reports-page">
    <div className="page-heading"><div><div className="eyebrow">PILOTAGE DE L’ÉTABLISSEMENT</div><h1>Rapports & Statistiques</h1><p>Analysez les ventes, les articles, l’activité de l’équipe et la fréquentation.</p></div><div className="reports-period"><CalendarDays size={16}/><select aria-label="Période du rapport" value={period} onChange={(event) => setPeriod(event.target.value as Period)}><option value="7">7 derniers jours</option><option value="30">30 derniers jours</option><option value="90">90 derniers jours</option><option value="custom">Période personnalisée</option></select></div></div>
    {period === "custom" && <div className="reports-custom-range"><label>Du<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)}/></label><label>Au<input type="date" value={to} min={from} max={today} onChange={(event) => setTo(event.target.value)}/></label></div>}
    <div className="reports-kpis">
      <article><span><Banknote size={15}/> Chiffre d’affaires encaissé</span><strong>{money(revenue)}</strong><small>{growth === null ? "Pas de période précédente comparable" : `${growth >= 0 ? "+" : ""}${growth.toFixed(1)} % vs période précédente`}</small></article>
      <article><span><ShoppingBag size={15}/> Ventes clôturées</span><strong>{orderCount}</strong><small>Commandes intégralement réglées</small></article>
      <article><span><TrendingUp size={15}/> Panier moyen</span><strong>{money(averageTicket)}</strong><small>CA encaissé / ventes clôturées</small></article>
      <article><span><Users size={15}/> Équipe active</span><strong>{activeStaff.length}</strong><small>Sur {staff.length} membre(s) enregistré(s)</small></article>
      <article><span><Banknote size={15}/> Remboursements confirmés</span><strong>{money(refundTotal)}</strong><small>Sur la période sélectionnée</small></article>
    </div>
    <div className="reports-tabs" role="tablist" aria-label="Sections des rapports">
      <button className={tab === "sales" ? "active" : ""} onClick={() => setTab("sales")}><ChartNoAxesCombined size={15}/> Ventes</button>
      <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}><Utensils size={15}/> Articles</button>
      <button className={tab === "team" ? "active" : ""} onClick={() => setTab("team")}><Users size={15}/> Équipes</button>
      <button className={tab === "traffic" ? "active" : ""} onClick={() => setTab("traffic")}><Store size={15}/> Fréquentation</button>
    </div>
    {tab === "sales" && <div className="reports-main-grid">
      <section className="panel reports-panel reports-chart-panel"><div className="panel-heading"><div><h2>Évolution du chiffre d’affaires</h2><p>Ventes encaissées · {start} au {end}</p></div><span className="reports-chart-total">{money(revenue)}</span></div>
        {orderCount ? <div className="reports-chart" role="img" aria-label="Graphique du chiffre d’affaires par jour ou semaine">{daily.map((item, index) => <div className="reports-bar-column" key={item.label + index}><strong>{item.revenue ? money(item.revenue) : "—"}</strong><div className="reports-bar-track"><span style={{ height: (Math.max(0, item.revenue) / maxBar * 100) + "%" }}/></div><small>{item.label}</small></div>)}</div> : <div className="reports-empty">Aucune vente clôturée sur cette période. Les ventes apparaîtront après encaissement complet.</div>}
      </section>
      <section className="panel reports-panel"><div className="panel-heading"><div><h2>Modes de paiement</h2><p>Répartition des encaissements</p></div></div><div className="reports-payment-list">{([["cash", "Espèces"], ["mobile_money", "Mobile Money"], ["card", "Carte bancaire"], ["other", "Autres"]] as const).map(([method, label]) => { const amount = completedSales.reduce((sum, sale) => sum + (sale.order.payments ?? []).filter((payment) => payment.method === method).reduce((subtotal, payment) => subtotal + payment.amount, 0), 0) - completedRefunds.filter((refund) => refund.method === method).reduce((sum, refund) => sum + refund.amount, 0); return <div key={method}><span>{label}</span><strong>{money(amount)}</strong><div className="reports-progress"><i style={{ width: (revenue > 0 ? Math.max(0, amount / revenue * 100) : 0) + "%" }}/></div></div>; })}</div></section>
    </div>}
    {tab === "products" && <section className="panel reports-panel"><div className="panel-heading"><div><h2>Performance des articles</h2><p>Classement sur les ventes clôturées, avant allocation des remboursements par article.</p></div><span className="reports-muted">{productRows.length} référence(s) vendue(s)</span></div>
      {productRows.length ? <div className="reports-product-list">{productRows.map((item, index) => <article key={item.id}><span className="reports-rank">{index + 1}</span><div className="reports-product-main"><div><strong>{item.name}</strong><small>{item.quantity} unité(s) vendue(s)</small></div><div className="reports-progress"><i style={{ width: (item.revenue / maxProduct * 100) + "%" }}/></div></div><strong className="reports-product-revenue">{money(item.revenue)}</strong></article>)}</div> : <div className="reports-empty">Aucun article vendu sur cette période.</div>}
    </section>}
    {tab === "team" && <><div className="reports-traffic-grid reports-team-kpis"><article className="panel"><span><CalendarDays size={17}/> Shifts planifiés</span><strong>{periodShifts.length}</strong><small>Hors shifts annulés</small></article><article className="panel"><span><Users size={17}/> Présences pointées</span><strong>{presentCount}</strong><small>Entrées enregistrées</small></article><article className="panel"><span><Clock3 size={17}/> Retards</span><strong>{lateCount}</strong><small>Après la tolérance de 5 minutes</small></article><article className="panel"><span><Clock3 size={17}/> Heures travaillées</span><strong>{workedHours.toFixed(1)} h</strong><small>Selon les pointages d’entrée/sortie</small></article></div><div className="reports-team-grid">{roles.map((role) => { const Icon = roleIcons[role]; const members = staff.filter((member) => member.role === role); return <article className="panel reports-team-card" key={role}><span className="reports-team-icon"><Icon size={18}/></span><div><h3>{roleLabels[role]}</h3><p>{members.filter((member) => member.active).length} membre(s) actif(s) · {members.length ? members.map((member) => member.name).join(", ") : "Aucun membre enregistré"}</p><strong>{roleActivity(role)} opération(s) observée(s)</strong></div></article>; })}<p className="reports-note">Les heures et retards proviennent des pointages enregistrés. Les opérations par rôle restent calculées à partir du cycle des commandes.</p></div></>}
    {tab === "traffic" && <div className="reports-traffic-grid">
      <article className="panel"><span><ShoppingBag size={17}/> Commandes reçues</span><strong>{periodOrders.length}</strong><small>Hors commandes annulées</small></article>
      <article className="panel"><span><Store size={17}/> Sur place</span><strong>{onSite}</strong><small>{periodOrders.length ? (onSite / periodOrders.length * 100).toFixed(0) : 0}% des commandes</small></article>
      <article className="panel"><span><ShoppingBag size={17}/> À emporter</span><strong>{takeaway}</strong><small>{periodOrders.length ? (takeaway / periodOrders.length * 100).toFixed(0) : 0}% des commandes</small></article>
      <article className="panel"><span><Users size={17}/> Clients identifiés</span><strong>{identifiedCustomers}</strong><small>Clients distincts nommés</small></article>
      <article className="panel"><span><Clock3 size={17}/> Heure de pointe</span><strong>{busiestHour ? String(busiestHour[0]).padStart(2, "0") + " h – " + String((busiestHour[0] + 1) % 24).padStart(2, "0") + " h" : "—"}</strong><small>{busiestHour ? busiestHour[1] + " commande(s) sur ce créneau" : "Pas de commande sur la période"}</small></article>
      <article className="panel"><span><Users size={17}/> Clients récurrents</span><strong>{repeatCustomers}</strong><small>Au moins 2 commandes sur la période</small></article>
      <article className="panel"><span><CalendarDays size={17}/> Réservations</span><strong>{periodReservations.length}</strong><small>{pendingReservations} demande(s) en attente</small></article>
      <article className="panel"><span><Users size={17}/> Couverts réservés</span><strong>{expectedCovers}</strong><small>Confirmés, arrivés ou installés</small></article>
      <article className="panel"><span><Clock3 size={17}/> Absences</span><strong>{noShowReservations}</strong><small>Réservations non honorées</small></article>
      <p className="reports-note">Les couverts réservés sont des prévisions. La fréquentation réelle nécessite de confirmer les couverts effectivement installés ou servis pour chaque commande.</p>
    </div>}
    <div className="reports-footnote"><Activity size={14}/> Les chiffres d’affaires reposent sur les ventes clôturées. Les commandes ouvertes, annulées ou non intégralement réglées ne sont pas comptabilisées comme ventes encaissées.</div>
  </section>;
}
