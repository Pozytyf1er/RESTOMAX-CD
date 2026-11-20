import { useMemo, useState, type FormEvent } from "react";
import { CalendarDays, Check, Clock3, Plus, Users, X } from "lucide-react";
import type { DiningTable, Reservation, ReservationStatus } from "../domain/types";
import "./ReservationsManagement.css";

type ReservationInput = Pick<Reservation, "customerName" | "phone" | "partySize" | "dateISO" | "time" | "durationMinutes"> & Partial<Pick<Reservation, "tableId" | "notes">>;
type Props = {
  reservations: Reservation[];
  tables: DiningTable[];
  onCreate: (reservation: ReservationInput) => boolean;
  onStatus: (id: string, status: ReservationStatus) => void;
  onAssign: (id: string, tableId: string) => boolean;
};

const labels: Record<ReservationStatus, string> = {
  pending: "À confirmer", confirmed: "Confirmée", arrived: "Arrivée",
  seated: "Installée", completed: "Terminée", cancelled: "Annulée", no_show: "Non présentée",
};
const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Abidjan", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const formatDate = (value: string) => new Date(value + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Abidjan" });

export default function ReservationsManagement({ reservations, tables, onCreate, onStatus, onAssign }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"today" | "all">("today");
  const [statusFilter, setStatusFilter] = useState<"all" | ReservationStatus>("all");
  const [search, setSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [dateISO, setDateISO] = useState(todayKey());
  const [time, setTime] = useState("19:00");
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [tableId, setTableId] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const todayReservations = reservations.filter((item) => item.dateISO === todayKey() && !["cancelled", "no_show"].includes(item.status));
  const expectedGuests = todayReservations.reduce((sum, item) => sum + item.partySize, 0);
  const pendingCount = reservations.filter((item) => item.status === "pending").length;
  const seatedCount = todayReservations.filter((item) => item.status === "seated").length;

  const filtered = useMemo(() => reservations.filter((item) => {
    if (filter === "today" && item.dateISO !== todayKey()) return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    const query = search.trim().toLocaleLowerCase("fr");
    if (query && !`${item.customerName} ${item.phone} ${item.tableLabel ?? ""}`.toLocaleLowerCase("fr").includes(query)) return false;
    return true;
  }).sort((a, b) => a.dateISO.localeCompare(b.dateISO) || a.time.localeCompare(b.time)), [reservations, filter, statusFilter, search]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    const ok = onCreate({ customerName, phone, partySize, dateISO, time, durationMinutes, ...(tableId ? { tableId } : {}), notes });
    if (!ok) { setFormError("Vérifiez les informations, la capacité et les conflits de réservation. Le formulaire est conservé."); return; }
    setCustomerName(""); setPhone(""); setPartySize(2); setTime("19:00"); setDurationMinutes(90); setTableId(""); setNotes("");
    setShowForm(false);
  }

  function availableActions(item: Reservation) {
    if (item.status === "pending") return <><button className="reservation-action confirm" onClick={() => onStatus(item.id, "confirmed")}><Check size={13}/> Confirmer</button><button className="reservation-action cancel" onClick={() => onStatus(item.id, "cancelled")}><X size={13}/> Annuler</button></>;
    if (item.status === "confirmed") return <><button className="reservation-action confirm" onClick={() => onStatus(item.id, "arrived")}>Arrivée</button><button className="reservation-action cancel" onClick={() => onStatus(item.id, "no_show")}>Non présentée</button><button className="reservation-action cancel" onClick={() => onStatus(item.id, "cancelled")}>Annuler</button></>;
    if (item.status === "arrived") return <><button className="reservation-action confirm" onClick={() => onStatus(item.id, "seated")}>Installer</button><button className="reservation-action cancel" onClick={() => onStatus(item.id, "cancelled")}>Annuler</button></>;
    if (item.status === "seated") return <button className="reservation-action confirm" onClick={() => onStatus(item.id, "completed")}>Terminer</button>;
    return <span className="reservation-no-action">—</span>;
  }

  return <section className="reservations-page">
    <header className="page-heading"><div><div className="eyebrow">SALLE · ACCUEIL</div><h1>Réservations</h1><p>Organisez les arrivées, les couverts et l’attribution des tables.</p></div><button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={16}/> Nouvelle réservation</button></header>
    <div className="reservation-kpis">
      <article><span><CalendarDays size={17}/> Réservations du jour</span><strong>{todayReservations.length}</strong><small>Hors annulations et absences</small></article>
      <article><span><Clock3 size={17}/> À confirmer</span><strong>{pendingCount}</strong><small>Demandes en attente</small></article>
      <article><span><Users size={17}/> Couverts attendus</span><strong>{expectedGuests}</strong><small>Clients prévus aujourd’hui</small></article>
      <article><span><Check size={17}/> Installés</span><strong>{seatedCount}</strong><small>Réservations en cours de service</small></article>
    </div>
    <section className="panel reservation-list-panel">
      <div className="reservation-toolbar">
        <div><h2>Planning des réservations</h2><p>{filtered.length} réservation(s) affichée(s)</p></div>
        <div className="reservation-filters">
          <select value={filter} onChange={(event) => setFilter(event.target.value as "today" | "all")} aria-label="Période"><option value="today">Aujourd’hui</option><option value="all">Toutes les dates</option></select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | ReservationStatus)} aria-label="Statut"><option value="all">Tous les statuts</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Client, téléphone, table..." aria-label="Rechercher une réservation"/>
        </div>
      </div>
      <div className="reservation-table-wrap"><table className="reservation-table"><thead><tr><th>Date & heure</th><th>Client</th><th>Couverts</th><th>Table</th><th>Statut</th><th>Actions</th></tr></thead><tbody>
        {filtered.map((item) => <tr key={item.id}>
          <td><strong>{formatDate(item.dateISO)}</strong><small>{item.time} · {item.durationMinutes} min</small></td>
          <td><strong>{item.customerName}</strong><small>{item.phone}</small>{item.notes && <small className="reservation-note">{item.notes}</small>}</td>
          <td><span className="reservation-guests"><Users size={13}/>{item.partySize}</span></td>
          <td>{item.tableLabel ?? "À attribuer"}{!["cancelled", "no_show", "completed", "seated"].includes(item.status) && <select className="reservation-assign" value={item.tableId ?? ""} onChange={(event) => { if (event.target.value) onAssign(item.id, event.target.value); }} aria-label={`Attribuer une table à ${item.customerName}`}><option value="">À attribuer</option>{tables.filter((table) => table.seats >= item.partySize && !["cleaning", "unavailable"].includes(table.status)).map((table) => <option key={table.id} value={table.id}>{table.label} · {table.seats} places</option>)}</select>}</td>
          <td><span className={`reservation-status status-${item.status}`}>{labels[item.status]}</span></td>
          <td><div className="reservation-actions">{availableActions(item)}</div></td>
        </tr>)}
        {!filtered.length && <tr><td colSpan={6}><div className="reservation-empty"><CalendarDays size={24}/><strong>Aucune réservation pour ce filtre</strong><span>Créez une réservation ou modifiez la période affichée.</span></div></td></tr>}
      </tbody></table></div>
    </section>

    {showForm && <div className="reservation-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}>
      <section className="reservation-modal" role="dialog" aria-modal="true" aria-labelledby="reservation-modal-title">
        <header><div><h2 id="reservation-modal-title">Nouvelle réservation</h2><p>Renseignez les informations du client et du créneau.</p></div><button className="icon-button" onClick={() => setShowForm(false)} aria-label="Fermer"><X size={18}/></button></header>
        <form onSubmit={submit}>
          <div className="reservation-form-grid">
            <label>Nom du client<input required maxLength={80} value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nom et prénom"/></label>
            <label>Téléphone<input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+225 07 00 00 00 00"/></label>
            <label>Nombre de couverts<input required type="number" min={1} max={20} step={1} value={partySize} onChange={(event) => setPartySize(Number(event.target.value))}/></label>
            <label>Durée prévue<select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))}><option value={60}>1 heure</option><option value={90}>1 h 30</option><option value={120}>2 heures</option><option value={180}>3 heures</option><option value={240}>4 heures</option></select></label>
            <label>Date<input required type="date" min={todayKey()} value={dateISO} onChange={(event) => setDateISO(event.target.value)}/></label>
            <label>Heure<input required type="time"  value={time} onChange={(event) => setTime(event.target.value)}/></label>
            <label className="reservation-form-wide">Table (facultatif)<select value={tableId} onChange={(event) => setTableId(event.target.value)}><option value="">À attribuer plus tard</option>{tables.filter((table) => table.seats >= partySize && !["cleaning", "unavailable"].includes(table.status)).map((table) => <option key={table.id} value={table.id}>{table.label} · {table.area} · {table.seats} places</option>)}</select></label>
            <label className="reservation-form-wide">Notes particulières<textarea rows={3} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Allergies, anniversaire, préférence de placement..."/></label>
          </div>
          {formError && <p className="reservation-form-error" role="alert">{formError}</p>}
          <footer><button type="button" className="button button-secondary" onClick={() => setShowForm(false)}>Annuler</button><button type="submit" className="button button-primary"><Check size={15}/> Enregistrer</button></footer>
        </form>
      </section>
    </div>}
  </section>;
}
