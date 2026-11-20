import { useMemo, useState, type FormEvent } from "react";
import { LockKeyhole, MapPin, Pencil, Plus, QrCode, Trash2, Users, X } from "lucide-react";
import type { DiningTable, TableStatus } from "../domain/types";

type Draft = { id?: string; label: string; area: string; seats: string; status: TableStatus };
type Props = {
  tables: DiningTable[];
  onAdd: (table: Omit<DiningTable, "id" | "status">) => void;
  onEdit: (table: DiningTable) => void;
  onRemove: (id: string) => void;
  onStatus: (id: string, status: TableStatus) => void;
};

const statusLabel: Record<TableStatus, string> = {
  available: "Disponible",
  occupied: "Occupée",
  reserved: "Réservée",
  cleaning: "À nettoyer",
  unavailable: "Indisponible",
};

export default function TablesManagement({ tables, onAdd, onEdit, onRemove, onStatus }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const areas = useMemo(() => [...new Set(tables.map((table) => table.area).filter(Boolean))].sort(), [tables]);
  const available = tables.filter((table) => table.status === "available").length;
  const occupied = tables.filter((table) => table.status === "occupied").length;
  const reserved = tables.filter((table) => table.status === "reserved").length;
  const cleaning = tables.filter((table) => table.status === "cleaning").length;
  const unavailable = tables.filter((table) => table.status === "unavailable").length;
  const capacity = tables.reduce((sum, table) => sum + table.seats, 0);

  function openCreate() {
    setError("");
    setDraft({ label: "", area: areas[0] ?? "Salle", seats: "2", status: "available" });
  }

  function openEdit(table: DiningTable) {
    setError("");
    setDraft({ ...table, seats: String(table.seats) });
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const label = draft.label.trim();
    const area = draft.area.trim();
    const seats = Number(draft.seats);
    if (!label || !area || !Number.isInteger(seats) || seats < 1 || seats > 30) {
      setError("Renseignez un nom, un espace et une capacité comprise entre 1 et 30 places.");
      return;
    }
    if (tables.some((table) => table.id !== draft.id && table.label.trim().toLowerCase() === label.toLowerCase())) {
      setError("Ce nom de table existe déjà. Choisissez un identifiant unique.");
      return;
    }
    if (draft.id) onEdit({ id: draft.id, label, area, seats, status: draft.status });
    else onAdd({ label, area, seats });
    setDraft(null);
  }

  function remove(table: DiningTable) {
    if (table.status !== "available") return;
    if (window.confirm(`Supprimer la table ${table.label} ? Cette action ne concerne que les données de démonstration.`)) onRemove(table.id);
  }

  return <section className="tables-management">
    <PageHeading
      title="Tables & QR"
      description="Organisez vos espaces, gérez la capacité et préparez les QR physiques associés à chaque table."
      onAdd={openCreate}
    />
    <div className="tables-summary-grid">
      <Summary label="Total des tables" value={tables.length} icon="table" />
      <Summary label="Disponibles" value={available} icon="available" />
      <Summary label="Occupées" value={occupied} icon="occupied" />
      <Summary label="Places assises" value={capacity} icon="capacity" />
    </div>

    <div className="tables-section">
      <div className="tables-section-heading"><div><h2>Plan des espaces</h2><p>{areas.length} espace(s) configuré(s) · {reserved} réservée(s) · {cleaning} à nettoyer · {unavailable} indisponible(s)</p></div><span className="demo-tag">GESTION LOCALE</span></div>
      {tables.length === 0 ? <div className="tables-empty">Aucune table pour le moment. Créez votre première table pour organiser le restaurant.</div> :
        areas.map((area) => <section className="tables-section" key={area}>
          <div className="tables-section-heading"><div><h2>{area}</h2><p>{tables.filter((table) => table.area === area).length} table(s)</p></div></div>
          <div className="tables-management-grid">
            {tables.filter((table) => table.area === area).map((table) => <article className="table-management-card" key={table.id}>
              <div className="table-management-top">
                <div><div className="table-management-name">{table.label}</div><div className="table-management-area"><MapPin size={12}/>{table.area}</div></div>
                <span className={`table-management-status ${table.status}`}>{statusLabel[table.status]}</span>
              </div>
              <div className="table-management-capacity"><Users size={14}/>{table.seats} place{table.seats > 1 ? "s" : ""}</div>
              <div className="table-management-actions">
                <select aria-label={`Statut de ${table.label}`} value={table.status} onChange={(event) => onStatus(table.id, event.target.value as TableStatus)}>
                  <option value="available">Disponible</option><option value="occupied">Occupée</option><option value="reserved">Réservée</option><option value="cleaning">À nettoyer</option><option value="unavailable">Indisponible</option>
                </select>
                <div>
                  <button onClick={() => openEdit(table)} aria-label={`Modifier ${table.label}`}><Pencil size={13}/> Modifier</button>
                  <button onClick={() => remove(table)} disabled={table.status !== "available"} aria-label={`Supprimer ${table.label}`}><Trash2 size={13}/></button>
                </div>
              </div>
              <div className="table-qr-panel">
                <div className="table-qr-placeholder"><QrCode size={23}/></div>
                <div><strong>QR physique de {table.label}</strong><p>Le code sera généré et associé automatiquement à cette table lors de l’activation du service sécurisé.</p></div>
                <span>NON GÉNÉRÉ</span>
              </div>
            </article>)}
          </div>
        </section>)
      }
    </div>

    <div className="tables-qr-notice"><LockKeyhole size={18}/><div><strong>QR physiques — génération sécurisée à venir</strong><p>Chaque table recevra son propre QR. La génération, la révocation immédiate des anciens codes, la version du QR et l’ouverture d’une session client sécurisée seront branchées au backend lors du chantier base de données/sécurité. Aucun QR fictif ou réutilisable n’est exposé ici.</p></div></div>

    {draft && <div className="table-editor-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDraft(null); }}>
      <form className="table-editor" onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="table-editor-title">
        <header className="table-editor-header"><div><h2 id="table-editor-title">{draft.id ? "Modifier la table" : "Nouvelle table"}</h2><p>Configurez son identifiant, son espace et sa capacité.</p></div><button type="button" aria-label="Fermer" onClick={() => setDraft(null)}><X size={17}/></button></header>
        <div className="table-editor-fields">
          <label>Nom / numéro de table<input autoFocus value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} placeholder="Ex. T5" maxLength={24}/></label>
          <label>Espace / zone<input list="table-area-options" value={draft.area} onChange={(event) => setDraft({ ...draft, area: event.target.value })} placeholder="Ex. Terrasse" maxLength={40}/><datalist id="table-area-options">{areas.map((area) => <option key={area} value={area}/>)}</datalist></label>
          <label>Nombre de places<input type="number" min="1" max="30" step="1" value={draft.seats} onChange={(event) => setDraft({ ...draft, seats: event.target.value })}/></label>
          {draft.id && <label>Statut<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as TableStatus })}><option value="available">Disponible</option><option value="occupied">Occupée</option><option value="reserved">Réservée</option></select></label>}
          {error && <p className="table-editor-error" role="alert">{error}</p>}
        </div>
        <footer className="table-editor-footer"><button type="button" className="button button-secondary" onClick={() => setDraft(null)}>Annuler</button><button type="submit" className="button button-primary"><Plus size={14}/>{draft.id ? "Enregistrer" : "Créer la table"}</button></footer>
      </form>
    </div>}
  </section>;
}

function PageHeading({ title, description, onAdd }: { title: string; description: string; onAdd: () => void }) {
  return <div className="page-heading"><div><div className="eyebrow">SALLE · TERRASSE · QR PHYSIQUES</div><h1>{title}</h1><p>{description}</p></div><button className="button button-primary" onClick={onAdd}><Plus size={16}/> Ajouter une table</button></div>;
}

function Summary({ label, value, icon }: { label: string; value: number; icon: string }) {
  return <div className="tables-summary-card"><div><span>{label}</span><strong>{value}</strong></div><div className="tables-summary-icon">{icon === "capacity" ? <Users size={17}/> : icon === "available" ? <QrCode size={17}/> : <MapPin size={17}/>}</div></div>;
}
