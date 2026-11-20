import { useMemo, useState } from "react";
import {
  ArrowUpRight, Armchair, Banknote, Bell, CalendarDays, ChartColumn,
  CheckCircle2, Clock3, QrCode, ShoppingCart, Table2, Target, Utensils,
  Users, Wallet, AlertTriangle, Package, CalendarClock,
} from "lucide-react";
import type {
  CashSession, Customer, DiningTable, InventoryItem, Reservation, RestaurantOrder, Refund,
} from "../domain/types";
import { ORDER_STATUS_LABELS } from "../domain/types";
import { isSaleEligibleForRevenue, paidTotal } from "../domain/sales";
import "./RestaurantDashboard.css";

type DashboardPage = "orders" | "menu" | "tables" | "customer" | "reports" | "cash" | "settings" | "subscription" | "inventory" | "finance" | "reservations" | "kitchen" | "bar" | "customers" | "team";
type Props = {
  orders: RestaurantOrder[];
  tables: DiningTable[];
  refunds: Refund[];
  inventory: InventoryItem[];
  cashSessions: CashSession[];
  reservations: Reservation[];
  customers: Customer[];
  onNavigate: (page: DashboardPage) => void;
};

type Period = "today" | "7" | "30";
type AlertItem = { id: string; title: string; detail: string; tone: "warning" | "danger"; page: DashboardPage };
type ActivityItem = { id: string; timestamp: number; title: string; detail: string; tag: string; tone: "order" | "customer" | "reservation" };

const money = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
const dateKey = (date: Date) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Abidjan", year: "numeric", month: "2-digit", day: "2-digit",
}).format(date);
const saleDate = (order: RestaurantOrder) => new Date(order.closedAtISO ?? order.createdAtISO ?? new Date().toISOString());
const orderDate = (order: RestaurantOrder) => new Date(order.createdAtISO ?? new Date().toISOString());

function KpiCard({ icon: Icon, label, value, detail, tone, bars }: {
  icon: typeof Utensils; label: string; value: string; detail: string; tone: string; bars?: number[];
}) {
  return <article className={`owner-kpi owner-kpi-${tone}`}>
    <div className="owner-kpi-top"><span className="owner-kpi-icon"><Icon size={20}/></span><span className="owner-kpi-label">{label}</span></div>
    <strong className="owner-kpi-value">{value}</strong>
    <div className="owner-kpi-bottom"><span>{detail}</span>{bars && <div className="owner-sparkline" aria-hidden="true">{bars.map((height, index) => <i key={index} style={{ height: `${height}%` }}/>)}</div>}</div>
  </article>;
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}h`;
}

export default function RestaurantDashboard({
  orders, tables, refunds, inventory, cashSessions, reservations, customers, onNavigate,
}: Props) {
  const [period, setPeriod] = useState<Period>("today");
  const now = new Date();
  const today = dateKey(now);
  const paidOrders = orders.filter(isSaleEligibleForRevenue);
  const todaySales = paidOrders.filter((order) => dateKey(saleDate(order)) === today);
  const todayOrders = orders.filter((order) => dateKey(orderDate(order)) === today && order.status !== "cancelled");
  const todayRefunds = refunds.filter((refund) => refund.status === "completed" && dateKey(new Date(refund.createdAtISO)) === today).reduce((sum, refund) => sum + refund.amount, 0);
  const todayRevenue = Math.max(0, todaySales.reduce((sum, order) => sum + paidTotal(order), 0) - todayRefunds);
  const averageTicket = todaySales.length ? Math.round(todayRevenue / todaySales.length) : 0;
  const occupied = tables.filter((table) => table.status === "occupied").length;
  const available = tables.filter((table) => table.status === "available").length;
  const activeOrders = orders.filter((order) => order.status !== "cancelled" && !order.closedAt && !order.closedAtISO).length;
  const previousDay = new Date(now);
  previousDay.setDate(previousDay.getDate() - 1);
  const previousRevenue = paidOrders.filter((order) => dateKey(saleDate(order)) === dateKey(previousDay)).reduce((sum, order) => sum + paidTotal(order), 0);
  const revenueComparison = previousRevenue > 0
    ? `${todayRevenue >= previousRevenue ? "+" : ""}${Math.round((todayRevenue - previousRevenue) / previousRevenue * 100)} % vs hier`
    : "Comparaison indisponible";

  const chartPoints = useMemo(() => {
    if (period === "today") {
      const hours = [10, 12, 14, 16, 18, 19, 20, 22];
      const totals = new Map<number, number>();
      paidOrders.forEach((order) => {
        const date = saleDate(order);
        if (dateKey(date) === today) totals.set(date.getHours(), (totals.get(date.getHours()) ?? 0) + paidTotal(order));
      });
      return hours.map((hour) => ({ label: formatHour(hour), value: totals.get(hour) ?? 0 }));
    }
    const days = period === "7" ? 7 : 30;
    const bucketCount = period === "7" ? 7 : 6;
    const buckets = Array.from({ length: bucketCount }, (_, index) => {
      const startOffset = days - 1 - Math.floor(index * days / bucketCount);
      const endOffset = days - 1 - Math.floor((index + 1) * days / bucketCount) + 1;
      const start = new Date(now);
      start.setDate(start.getDate() - startOffset);
      const end = new Date(now);
      end.setDate(end.getDate() - Math.max(0, endOffset));
      const startKey = dateKey(start);
      const endKey = dateKey(end);
      const value = paidOrders.filter((order) => {
        const key = dateKey(saleDate(order));
        return key >= startKey && key <= endKey;
      }).reduce((sum, order) => sum + paidTotal(order), 0);
      return { label: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Africa/Abidjan" }).format(start), value };
    });
    return buckets;
  }, [period, orders, today]);
  const maxChartValue = Math.max(1, ...chartPoints.map((point) => point.value));

  const alerts: AlertItem[] = [
    ...inventory.filter((item) => item.quantity <= item.minimumQuantity).slice(0, 3).map((item) => ({
      id: `stock-${item.id}`, title: `${item.name} — stock bas`,
      detail: `${money(item.quantity)} ${item.unit} restant(s) · seuil ${money(item.minimumQuantity)} ${item.unit}`,
      tone: "warning" as const, page: "inventory" as const,
    })),
    ...reservations.filter((reservation) => reservation.status === "pending").slice(0, 2).map((reservation) => ({
      id: `reservation-${reservation.id}`, title: `Réservation à confirmer · ${reservation.customerName}`,
      detail: `${reservation.dateISO} à ${reservation.time} · ${reservation.partySize} personne(s)`,
      tone: "warning" as const, page: "reservations" as const,
    })),
    ...orders.filter((order) => ["new", "preparing"].includes(order.status) && order.createdAtISO && now.getTime() - orderDate(order).getTime() > 20 * 60 * 1000).slice(0, 2).map((order) => ({
      id: `delay-${order.id}`, title: `Commande en attente · ${order.id}`,
      detail: `${order.tableLabel} · reçue à ${order.createdAt}`,
      tone: "danger" as const, page: "kitchen" as const,
    })),
    ...cashSessions.filter((session) => session.status === "closed" && typeof session.variance === "number" && session.variance !== 0).slice(-1).map((session) => ({
      id: `cash-${session.id}`, title: `Écart de caisse · ${money(session.variance ?? 0)} FCFA`,
      detail: `Session clôturée le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "Africa/Abidjan" }).format(new Date(session.closedAtISO ?? session.openedAtISO))}`,
      tone: "danger" as const, page: "finance" as const,
    })),
  ].slice(0, 5);

  const recentActivity: ActivityItem[] = [
    ...orders.map((order) => ({
      id: `order-${order.id}`, timestamp: orderDate(order).getTime(),
      title: order.status === "new" ? `Nouvelle commande ${order.id}` : `Commande ${order.id}`,
      detail: `${order.tableLabel} · ${order.customerName}`,
      tag: ORDER_STATUS_LABELS[order.status], tone: "order" as const,
    })),
    ...customers.map((customer) => ({
      id: `customer-${customer.id}`, timestamp: new Date(`${customer.createdAt}T12:00:00+00:00`).getTime(),
      title: "Nouveau client enregistré", detail: customer.name, tag: "Client", tone: "customer" as const,
    })),
    ...reservations.map((reservation) => ({
      id: `reservation-${reservation.id}`, timestamp: new Date(reservation.createdAtISO).getTime(),
      title: "Réservation enregistrée", detail: `${reservation.customerName} · ${reservation.partySize} personne(s)`,
      tag: reservation.status === "confirmed" ? "Confirmée" : reservation.status === "pending" ? "À confirmer" : "Réservation",
      tone: "reservation" as const,
    })),
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

  const chartTitle = period === "today" ? "Ventes par heure" : "Ventes par jour";
  const todayLabel = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Abidjan" }).format(now);
  const timeLabel = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Abidjan" }).format(now);

  return <section className="owner-dashboard">
    <div className="owner-dashboard-heading">
      <div><h1>Tableau de bord</h1><p>Votre activité en un coup d’œil</p></div>
      <div className="owner-dashboard-meta"><div className="owner-dashboard-date"><CalendarDays size={16}/><span>Aujourd’hui</span><small>{todayLabel} · {timeLabel}</small></div><span className="owner-demo-badge"><ChartColumn size={14}/> Données de démonstration</span></div>
    </div>

    <div className="owner-kpi-grid">
      <KpiCard icon={Banknote} label="CA du jour" value={`${money(todayRevenue)} FCFA`} detail={revenueComparison} tone="orange"/>
      <KpiCard icon={ShoppingCart} label="Commandes" value={String(todayOrders.length)} detail={`${activeOrders} en cours`} tone="blue"/>
      <KpiCard icon={Wallet} label="Panier moyen" value={`${money(averageTicket)} FCFA`} detail={todaySales.length ? `${todaySales.length} vente(s) clôturée(s)` : "Aucune vente clôturée"} tone="teal"/>
      <KpiCard icon={Armchair} label="Tables occupées" value={`${occupied} / ${tables.length}`} detail={`${available} disponible(s)`} tone="violet"/>
      <KpiCard icon={Target} label="Objectif du mois" value="À définir" detail="Objectif non configuré" tone="green"/>
    </div>

    <div className="owner-main-grid">
      <section className="owner-panel owner-sales-panel">
        <header className="owner-panel-heading"><div><h2>{chartTitle}</h2><p>Ventes réellement clôturées · FCFA</p></div><div className="owner-period-tabs" role="group" aria-label="Période des ventes">
          <button className={period === "today" ? "active" : ""} onClick={() => setPeriod("today")}>Aujourd’hui</button>
          <button className={period === "7" ? "active" : ""} onClick={() => setPeriod("7")}>7 jours</button>
          <button className={period === "30" ? "active" : ""} onClick={() => setPeriod("30")}>30 jours</button>
        </div></header>
        <div className="owner-chart" role="img" aria-label={`${chartTitle}: ${chartPoints.map((point) => `${point.label}, ${money(point.value)} FCFA`).join("; ")}`}>
          <div className="owner-chart-y"><span>{money(maxChartValue)}</span><span>{money(Math.round(maxChartValue / 2))}</span><span>0</span></div>
          <div className="owner-chart-bars">{chartPoints.map((point) => <div className="owner-chart-column" key={point.label}><div className="owner-chart-track"><i style={{ height: `${point.value ? Math.max(5, point.value / maxChartValue * 100) : 0}%` }}/></div><strong>{point.value ? money(point.value) : "—"}</strong><small>{point.label}</small></div>)}</div>
        </div>
      </section>

      <section className="owner-panel owner-alert-panel">
        <header className="owner-panel-heading"><div><h2><Bell size={17}/> Alertes à traiter</h2><p>Points nécessitant votre attention</p></div><span className="owner-alert-count">{alerts.length}</span></header>
        {alerts.length ? <div className="owner-alert-list">{alerts.map((alert) => <article key={alert.id} className={`owner-alert-row ${alert.tone}`}><span className="owner-alert-icon">{alert.tone === "danger" ? <AlertTriangle size={18}/> : <Package size={18}/>}</span><div><strong>{alert.title}</strong><small>{alert.detail}</small></div><button onClick={() => onNavigate(alert.page)} aria-label={`Ouvrir: ${alert.title}`}>Voir</button></article>)}</div> : <div className="owner-alert-empty"><CheckCircle2 size={20}/><strong>Aucune alerte à traiter</strong><span>Les stocks, réservations et opérations suivis sont à jour.</span></div>}
        <button className="owner-alert-link" onClick={() => onNavigate(alerts[0]?.page ?? "inventory")}>Voir les alertes <ArrowUpRight size={14}/></button>
      </section>
    </div>

    <section className="owner-panel owner-quick-panel">
      <header className="owner-panel-heading"><h2><ChartColumn size={17}/> Actions rapides</h2></header>
      <div className="owner-quick-grid">
        <button className="owner-quick-action primary" onClick={() => onNavigate("customer")}><span><ShoppingCart size={21}/></span><strong>Nouvelle commande</strong></button>
        <button className="owner-quick-action" onClick={() => onNavigate("menu")}><span><Utensils size={21}/></span><strong>Gérer le menu</strong></button>
        <button className="owner-quick-action" onClick={() => onNavigate("tables")}><span><Table2 size={22}/></span><strong>Voir les tables</strong></button>
        <button className="owner-quick-action" type="button" disabled aria-label="Génération des QR codes indisponible tant que le backend sécurisé n’est pas raccordé" title="Backend QR sécurisé à raccorder"><span><QrCode size={22}/></span><strong>QR codes bientôt</strong></button>
      </div>
      <p className="owner-qr-note">Les QR physiques ne sont pas encore générés : leur activation attend le backend sécurisé.</p>
    </section>

    <section className="owner-panel owner-activity-panel">
      <header className="owner-panel-heading"><h2><Clock3 size={17}/> Activité récente</h2><button className="owner-link" onClick={() => onNavigate("orders")}>Voir tout <ArrowUpRight size={14}/></button></header>
      {recentActivity.length ? <div className="owner-activity-list">{recentActivity.map((activity) => <article key={activity.id}><span className={`owner-activity-icon ${activity.tone}`}>{activity.tone === "customer" ? <Users size={16}/> : activity.tone === "reservation" ? <CalendarClock size={16}/> : <ShoppingCart size={16}/>}</span><div><strong>{activity.title}</strong><small>{activity.detail}</small></div><em>{activity.tag}</em><time>{new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Abidjan" }).format(new Date(activity.timestamp))}</time></article>)}</div> : <div className="owner-activity-empty">Aucune activité enregistrée pour le moment.</div>}
    </section>
    <footer className="owner-dashboard-footer"><span><CheckCircle2 size={15}/> Interface de démonstration · données locales non persistantes</span><span>{todayLabel} · {timeLabel}</span></footer>
  </section>;
}
