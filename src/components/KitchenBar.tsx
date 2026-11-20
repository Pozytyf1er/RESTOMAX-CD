import { useMemo, useState } from "react";
import { Check, Clock3, Coffee, Flame, Play, Utensils } from "lucide-react";
import type { MenuItem, PreparationStatus, RestaurantOrder } from "../domain/types";

type Props = {
  orders: RestaurantOrder[];
  items: MenuItem[];
  onLineStatus: (orderId: string, lineIndex: number, status: PreparationStatus) => void;
  stationFilter?: "dish" | "drink";
};

type Station = "dish" | "drink";
const moneyTime = (value: string) => value || "—";

export default function KitchenBar({ orders, items, onLineStatus, stationFilter }: Props) {
  const [filter, setFilter] = useState<"all" | PreparationStatus>("all");
  const activeOrders = orders.filter((order) => !["served", "cancelled"].includes(order.status));
  const stations = useMemo(() => ({
    dish: activeOrders.flatMap((order) => order.lines.map((line, index) => ({
      order, line, index,
      station: (items.find((item) => item.id === line.itemId)?.type ?? "dish") as Station,
      status: line.preparationStatus ?? (order.status === "preparing" ? "preparing" : order.status === "ready" ? "ready" : "new"),
    }))).filter((entry) => entry.station === "dish" && (filter === "all" || entry.status === filter)),
    drink: activeOrders.flatMap((order) => order.lines.map((line, index) => ({
      order, line, index,
      station: (items.find((item) => item.id === line.itemId)?.type ?? "dish") as Station,
      status: line.preparationStatus ?? (order.status === "preparing" ? "preparing" : order.status === "ready" ? "ready" : "new"),
    }))).filter((entry) => entry.station === "drink" && (filter === "all" || entry.status === filter)),
  }), [activeOrders, items, filter]);

  const allEntries = stationFilter ? stations[stationFilter] : [...stations.dish, ...stations.drink];
  const count = (status: PreparationStatus) => allEntries.filter((entry) => entry.status === status).length;

  function renderStation(station: Station) {
    const entries = stations[station];
    const isBar = station === "drink";
    const Icon = isBar ? Coffee : Flame;
    return <section className="kitchen-station" aria-label={isBar ? "Préparations du bar" : "Préparations de la cuisine"}>
      <header className="kitchen-station-header">
        <div className={`kitchen-station-icon ${isBar ? "bar" : "cuisine"}`}><Icon size={20}/></div>
        <div><h2>{isBar ? "BAR" : "CUISINE"}</h2><p>{isBar ? "Boissons & rafraîchissements" : "Plats & préparations chaudes"}</p></div>
        <strong className="kitchen-station-count">{entries.length}</strong>
      </header>
      <div className="kitchen-ticket-list">
        {entries.map(({ order, line, index, status }) => <article className={`kitchen-ticket kitchen-ticket-${status}`} key={`${order.id}-${index}`}>
          <div className="kitchen-ticket-top">
            <strong>{order.id}</strong>
            <span className={`kitchen-status kitchen-status-${status}`}>{status === "new" ? "Nouvelle" : status === "preparing" ? "En cours" : "Prête"}</span>
          </div>
          <div className="kitchen-ticket-meta"><span>{order.tableLabel}</span><span><Clock3 size={12}/> {moneyTime(order.createdAt)}</span></div>
          <div className="kitchen-ticket-item">
            <span className="kitchen-quantity">{line.quantity}×</span>
            <div><strong>{line.name}</strong>{line.options?.length ? <small>{line.options.join(" · ")}</small> : null}</div>
          </div>
          {line.comment && <div className="kitchen-comment"><strong>Note client</strong><p>{line.comment}</p></div>}
          <div className="kitchen-ticket-actions">
            {status === "new" && <button className="button button-primary" onClick={() => onLineStatus(order.id, index, "preparing")}><Play size={14}/> Démarrer</button>}
            {status === "preparing" && <button className="button button-primary" onClick={() => onLineStatus(order.id, index, "ready")}><Check size={15}/> Marquer prête</button>}
            {status === "ready" && <span className="kitchen-ready-label"><Check size={15}/> Prête à envoyer</span>}
          </div>
        </article>)}
        {entries.length === 0 && <div className="kitchen-empty"><Utensils size={22}/><strong>Aucune préparation</strong><span>Les nouvelles commandes apparaîtront ici.</span></div>}
      </div>
    </section>;
  }

  return <section className="kitchen-page">
    <div className="page-heading">
      <div><div className="eyebrow">PRODUCTION · POSTE OPÉRATIONNEL</div><h1>{stationFilter === "dish" ? "Cuisine" : stationFilter === "drink" ? "Bar" : "Cuisine & Bar"}</h1><p>Réceptionnez les commandes et suivez chaque préparation jusqu’à sa mise à disposition.</p></div>
      <span className="live-indicator"><i/> Flux de démonstration</span>
    </div>
    <div className="kitchen-summary">
      <div><span>Nouvelles</span><strong>{count("new")}</strong></div>
      <div><span>En préparation</span><strong>{count("preparing")}</strong></div>
      <div><span>Prêtes</span><strong>{count("ready")}</strong></div>
    </div>
    <div className="kitchen-toolbar">
      <div><strong>Tickets de préparation</strong><span>{allEntries.length} article(s) actif(s)</span></div>
      <div className="kitchen-filters" aria-label="Filtrer les préparations">
        {(["all", "new", "preparing", "ready"] as const).map((value) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value === "all" ? "Tout" : value === "new" ? "Nouvelles" : value === "preparing" ? "En cours" : "Prêtes"}</button>)}
      </div>
    </div>
    <div className="kitchen-stations">{(stationFilter ? [stationFilter] : ["dish", "drink"] as const).map(renderStation)}</div>
    <p className="helper-note">Le statut général d’une commande passe à « Prête » lorsque tous ses articles sont prêts. Les commandes servies ou annulées quittent les postes de préparation.</p>
  </section>;
}
