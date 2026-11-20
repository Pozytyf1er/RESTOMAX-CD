import { useState, type FormEvent } from "react";
import { CalendarDays, Check, Clock3, Lock, LogIn, LogOut, Mail, Phone, Plus, Power, ShieldCheck, Users, X } from "lucide-react";
import type { AttendanceEntry, PermissionKey, StaffMember, StaffRole, StaffShift } from "../domain/types";
import { STAFF_ROLE_LABELS } from "../domain/types";
import { canAssignRole, canGrantCustomPermission, canManageStaff, hasPermission, rolePermissionCeiling } from "../domain/permissions";
import { canCancelShift, workedMinutes } from "../domain/hr";
import "./TeamManagement.css";

type Props = {
  initialTab?: "members" | "permissions" | "schedule";
  staff: StaffMember[];
  currentUserRole: StaffRole;
  onAdd: (member: Pick<StaffMember, "name" | "role"> & Partial<Pick<StaffMember, "phone" | "email">>) => boolean;
  onRoleChange: (id: string, role: StaffRole) => boolean;
  onActiveChange: (id: string, active: boolean) => boolean;
  onPermissionChange: (id: string, permission: PermissionKey, enabled: boolean) => boolean;
  shifts: StaffShift[];
  attendance: AttendanceEntry[];
  onCreateShift: (shift: Pick<StaffShift, "staffId" | "dateISO" | "startTime" | "endTime"> & Partial<Pick<StaffShift, "notes">>) => boolean;
  onCheckIn: (shiftId: string) => boolean;
  onCheckOut: (attendanceId: string) => boolean;
  onCancelShift: (shiftId: string) => boolean;
};

const roles: StaffRole[] = ["manager", "cashier", "server", "kitchen"];
const permissionOptions: { key: PermissionKey; label: string; description: string }[] = [
  { key: "orders.cancel", label: "Annuler une commande", description: "Autorise l’annulation avant clôture et remboursement." },
  { key: "payments.refund", label: "Effectuer un remboursement", description: "Reste soumis au plafond de remboursement configuré." },
  { key: "menu.price", label: "Modifier les prix", description: "Autorise la modification des tarifs du menu." },
  { key: "inventory.manage", label: "Gérer les stocks", description: "Autorise les entrées, sorties et ajustements de stock." },
  { key: "reports.view", label: "Consulter les rapports", description: "Autorise l’accès aux indicateurs de gestion." },
];
const matrixPermissions: { key: PermissionKey; label: string }[] = [
  { key: "orders.view", label: "Voir les commandes" },
  { key: "orders.create", label: "Créer des commandes" },
  { key: "orders.cancel", label: "Annuler" },
  { key: "payments.collect", label: "Encaisser" },
  { key: "payments.refund", label: "Rembourser" },
  { key: "menu.manage", label: "Gérer le menu" },
  { key: "inventory.manage", label: "Gérer les stocks" },
  { key: "reports.view", label: "Voir les rapports" },
  { key: "staff.manage", label: "Gérer l’équipe" },
];

export default function TeamManagement({ initialTab = "members", staff, currentUserRole, onAdd, onRoleChange, onActiveChange, onPermissionChange, shifts, attendance, onCreateShift, onCheckIn, onCheckOut, onCancelShift }: Props) {
  const [tab, setTab] = useState<"members" | "permissions" | "schedule">(initialTab);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("cashier");
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [shiftStaffId, setShiftStaffId] = useState(staff.find((member) => member.active && member.role !== "owner")?.id ?? "");
  const [shiftDate, setShiftDate] = useState(new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Abidjan", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
  const [shiftStart, setShiftStart] = useState("08:00");
  const [shiftEnd, setShiftEnd] = useState("16:00");
  const [shiftNotes, setShiftNotes] = useState("");
  const [shiftError, setShiftError] = useState("");
  const activeCount = staff.filter((member) => member.active).length;
  const selectedMember = staff.find((member) => member.id === selectedId) ?? null;

  function submit(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    if (!name.trim() || name.trim().length > 80) { setFormError("Saisissez un nom valide (80 caractères maximum)."); return; }
    if (!canAssignRole(currentUserRole, role)) { setFormError("Vous ne pouvez pas attribuer ce rôle."); return; }
    if (!onAdd({ name: name.trim(), role, ...(phone.trim() ? { phone: phone.trim() } : {}), ...(email.trim() ? { email: email.trim() } : {}) })) {
      setFormError("Le membre n’a pas pu être ajouté.");
      return;
    }
    setName(""); setPhone(""); setEmail(""); setRole("cashier"); setShowForm(false);
  }

  function changeRole(member: StaffMember, nextRole: StaffRole) {
    setActionError("");
    if (!canManageStaff(currentUserRole, member.role) || !canAssignRole(currentUserRole, nextRole) || !onRoleChange(member.id, nextRole)) {
      setActionError("Cette modification de rôle n’est pas autorisée.");
    }
  }

  function changeActive(member: StaffMember) {
    setActionError("");
    if (!canManageStaff(currentUserRole, member.role) || !onActiveChange(member.id, !member.active)) {
      setActionError("Vous ne pouvez pas modifier le statut de ce membre.");
    }
  }

  function submitShift(event: FormEvent) {
    event.preventDefault(); setShiftError("");
    if (!onCreateShift({ staffId: shiftStaffId, dateISO: shiftDate, startTime: shiftStart, endTime: shiftEnd, notes: shiftNotes.trim() })) {
      setShiftError("Créneau invalide : vérifiez l’employé, la date, les horaires et les chevauchements.");
      return;
    }
    setShiftNotes(""); setShowShiftForm(false);
  }

  function handleShiftAction(action: () => boolean, message: string) {
    setActionError("");
    if (!action()) setActionError(message);
  }

  function changePermission(member: StaffMember, permission: PermissionKey, enabled: boolean) {
    setActionError("");
    if (!canGrantCustomPermission(currentUserRole, member.role, permission) || !onPermissionChange(member.id, permission, enabled)) {
      setActionError("Cette permission dépasse le plafond du rôle ou votre niveau d’autorisation.");
    }
  }

  return <section className="team-management-page">
    <header className="page-heading"><div><div className="eyebrow">RESSOURCES HUMAINES</div><h1>Employés</h1><p>Gérez les membres, les rôles et les autorisations de votre établissement.</p></div><button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={16}/> Ajouter un membre</button></header>
    <div className="team-kpis"><article><Users size={18}/><span>Membres enregistrés</span><strong>{staff.length}</strong></article><article><ShieldCheck size={18}/><span>Comptes actifs</span><strong>{activeCount}</strong></article><article><Lock size={18}/><span>Accès suspendus</span><strong>{staff.length - activeCount}</strong></article></div>
    <div className="team-tabs"><button className={tab === "members" ? "active" : ""} onClick={() => setTab("members")}>Membres de l’équipe</button><button className={tab === "permissions" ? "active" : ""} onClick={() => setTab("permissions")}>Rôles & permissions</button><button className={tab === "schedule" ? "active" : ""} onClick={() => setTab("schedule")}>Planning & présence</button></div>
    {actionError && <p className="team-action-error" role="alert">{actionError}</p>}
    {tab === "members" && <section className="panel team-panel">
      <div className="team-panel-heading"><div><h2>Membres de l’établissement</h2><p>Les changements de rôle et de statut sont appliqués au modèle de démonstration.</p></div><span className="demo-tag">DÉMO</span></div>
      <div className="team-member-list">{staff.map((member) => {
        const manageable = canManageStaff(currentUserRole, member.role);
        return <article className="team-member-row" key={member.id}>
          <div className="team-member-avatar">{member.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div>
          <div className="team-member-identity"><strong>{member.name}</strong><small>{member.email || "Adresse e-mail non renseignée"}</small>{member.phone && <small>{member.phone}</small>}</div>
          <div className="team-member-role"><label>Rôle</label><select value={member.role} disabled={!manageable} onChange={(event) => changeRole(member, event.target.value as StaffRole)}><option value={member.role}>{STAFF_ROLE_LABELS[member.role]}</option>{roles.filter((nextRole) => nextRole !== member.role && canAssignRole(currentUserRole, nextRole)).map((nextRole) => <option key={nextRole} value={nextRole}>{STAFF_ROLE_LABELS[nextRole]}</option>)}</select></div>
          <span className={`team-member-status ${member.active ? "active" : "inactive"}`}><i/>{member.active ? "Actif" : "Suspendu"}</span>
          <div className="team-member-actions"><button className="team-permission-button" onClick={() => setSelectedId(selectedId === member.id ? null : member.id)} disabled={!permissionOptions.some((permission) => canGrantCustomPermission(currentUserRole, member.role, permission.key))}>{selectedId === member.id ? "Fermer" : "Permissions"}</button><button className="team-power-button" onClick={() => changeActive(member)} disabled={!manageable} aria-label={member.active ? "Suspendre le membre" : "Réactiver le membre"}><Power size={16}/></button></div>
        </article>;
      })}</div>
      {selectedMember && <section className="team-permission-editor"><header><div><h3>Permissions personnalisées · {selectedMember.name}</h3><p>Les droits accordés ne peuvent jamais dépasser le plafond du rôle {STAFF_ROLE_LABELS[selectedMember.role]}.</p></div><button className="icon-button" onClick={() => setSelectedId(null)} aria-label="Fermer les permissions"><X size={17}/></button></header>
        {permissionOptions.filter((item) => rolePermissionCeiling(selectedMember.role).includes(item.key)).map((item) => <label className="team-permission-row" key={item.key}><span><strong>{item.label}</strong><small>{item.description}</small></span><input type="checkbox" checked={hasPermission(selectedMember.role, item.key, selectedMember.permissions)} onChange={(event) => changePermission(selectedMember, item.key, event.target.checked)}/></label>)}
        {!permissionOptions.some((item) => rolePermissionCeiling(selectedMember.role).includes(item.key)) && <p className="team-no-permissions">Aucune permission personnalisable dans le plafond de ce rôle.</p>}
      </section>}
    </section>}
    {tab === "schedule" && <section className="panel team-schedule-panel">
      <div className="team-panel-heading"><div><h2>Planning des services</h2><p>Planifiez les shifts et suivez les heures d’arrivée et de départ.</p></div><button className="button button-primary" onClick={() => { setShiftStaffId(staff.find((member) => member.active && member.role !== "owner")?.id ?? ""); setShowShiftForm(true); }} disabled={!staff.some((member) => member.active)}><Plus size={15}/> Planifier un service</button></div>
      <div className="team-shift-list">{shifts.slice().sort((a,b)=>a.dateISO.localeCompare(b.dateISO)||a.startTime.localeCompare(b.startTime)).map((shift) => {
        const member = staff.find((entry) => entry.id === shift.staffId);
        const record = attendance.find((entry) => entry.shiftId === shift.id);
        const statusLabel = shift.status === "cancelled" ? "Annulé" : shift.status === "completed" ? "Terminé" : record ? record.checkOutISO ? "Pointage terminé" : record.status === "late" ? "En retard" : "Présent" : "Planifié";
        return <article className="team-shift-row" key={shift.id}>
          <div className="team-shift-date"><CalendarDays size={16}/><strong>{new Date(shift.dateISO + "T12:00:00Z").toLocaleDateString("fr-FR",{day:"2-digit",month:"short",timeZone:"Africa/Abidjan"})}</strong></div>
          <div className="team-shift-employee"><strong>{member?.name ?? "Membre supprimé"}</strong><small>{member ? STAFF_ROLE_LABELS[member.role] : "—"}</small></div>
          <div className="team-shift-hours"><Clock3 size={14}/><strong>{shift.startTime} – {shift.endTime}</strong>{record && <small>{record.checkOutISO ? `${(workedMinutes(record)/60).toFixed(1)} h effectuées` : `Arrivée : ${new Date(record.checkInISO).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",timeZone:"Africa/Abidjan"})}`}</small>}</div>
          <span className={`team-shift-status ${record?.status === "late" ? "late" : shift.status}`}>{statusLabel}</span>
          <div className="team-shift-actions">
            {shift.status === "scheduled" && !record && <button onClick={() => handleShiftAction(() => onCheckIn(shift.id), "Pointage impossible : vérifiez la date, le statut de l’employé et le shift.")}><LogIn size={14}/> Arrivée</button>}
            {shift.status === "scheduled" && record && !record.checkOutISO && <button onClick={() => handleShiftAction(() => onCheckOut(record.id), "Le pointage de sortie n’a pas pu être enregistré.")}><LogOut size={14}/> Départ</button>}
            {canCancelShift(shift, attendance) && <button className="cancel" onClick={() => handleShiftAction(() => onCancelShift(shift.id), "Ce shift ne peut plus être annulé.")}>Annuler</button>}
          </div>
        </article>;
      })}{!shifts.length && <div className="team-no-permissions">Aucun service planifié pour le moment.</div>}</div>
      <div className="team-attendance-summary"><strong>Pointages enregistrés</strong><span>{attendance.length} entrée(s)</span><span>{attendance.filter((entry)=>entry.checkOutISO).length} sortie(s)</span><span>{attendance.filter((entry)=>entry.status === "late").length} retard(s)</span></div>
    </section>}
    {showShiftForm && <div className="team-modal-backdrop" role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget)setShowShiftForm(false);}}><section className="team-modal" role="dialog" aria-modal="true" aria-labelledby="shift-modal-title"><header><div><h2 id="shift-modal-title">Planifier un service</h2><p>Un même employé ne peut pas avoir deux shifts qui se chevauchent.</p></div><button className="icon-button" onClick={()=>setShowShiftForm(false)} aria-label="Fermer"><X size={18}/></button></header><form onSubmit={submitShift}><label>Employé<select value={shiftStaffId} onChange={(event)=>setShiftStaffId(event.target.value)}>{staff.filter((member)=>member.active).map((member)=><option key={member.id} value={member.id}>{member.name} · {STAFF_ROLE_LABELS[member.role]}</option>)}</select></label><label>Date<input type="date" min={new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Abidjan",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())} value={shiftDate} onChange={(event)=>setShiftDate(event.target.value)}/></label><div className="team-shift-time-fields"><label>Début<input type="time" value={shiftStart} onChange={(event)=>setShiftStart(event.target.value)}/></label><label>Fin<input type="time" value={shiftEnd} onChange={(event)=>setShiftEnd(event.target.value)}/></label></div><label>Notes<input value={shiftNotes} onChange={(event)=>setShiftNotes(event.target.value)} placeholder="Service du midi, remplacement…"/></label>{shiftError && <p className="team-action-error" role="alert">{shiftError}</p>}<footer><button type="button" className="button button-secondary" onClick={()=>setShowShiftForm(false)}>Annuler</button><button type="submit" className="button button-primary">Enregistrer le shift</button></footer></form></section></div>}
    {tab === "permissions" && <section className="panel team-permission-matrix">
      <div className="team-panel-heading"><div><h2>Matrice des autorisations</h2><p>Les droits sont limités par rôle. Un refus explicite prévaut sur les droits par défaut.</p></div></div>
      <div className="team-matrix-wrap"><table><thead><tr><th>Permission</th><th>Propriétaire</th><th>Manager</th><th>Caissier</th><th>Serveur</th><th>Cuisine / Bar</th></tr></thead><tbody>{matrixPermissions.map((permission) => <tr key={permission.key}><th>{permission.label}</th>{(["owner", "manager", "cashier", "server", "kitchen"] as StaffRole[]).map((memberRole) => <td key={memberRole}>{hasPermission(memberRole, permission.key) ? <Check size={15}/> : <span>—</span>}</td>)}</tr>)}</tbody></table></div>
      <div className="team-platform-note"><ShieldCheck size={17}/><p><strong>Super-admin de plateforme</strong> : rôle distinct. Il n’obtient aucun accès automatique aux commandes, clients ou finances d’un restaurant. Toute assistance sensible doit être autorisée, temporaire et auditée.</p></div>
    </section>}
    <p className="team-demo-note">Les profils sont encore stockés dans la session de démonstration. L’invitation par e-mail, la connexion individuelle, la révocation des sessions et l’audit serveur seront activés avec le backend sécurisé.</p>

    {showForm && <div className="team-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}>
      <section className="team-modal" role="dialog" aria-modal="true" aria-labelledby="team-modal-title"><header><div><h2 id="team-modal-title">Ajouter un membre</h2><p>Créez un profil de démonstration dans l’équipe.</p></div><button className="icon-button" onClick={() => setShowForm(false)} aria-label="Fermer"><X size={18}/></button></header>
        <form onSubmit={submit}><label>Nom complet<input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nom et prénom"/></label><label>Téléphone (facultatif)<span className="team-input-icon"><Phone size={14}/><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+225 07 00 00 00 00"/></span></label><label>E-mail (facultatif)<span className="team-input-icon"><Mail size={14}/><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nom@restaurant.ci"/></span></label><label>Rôle<select value={role} onChange={(event) => setRole(event.target.value as StaffRole)}>{roles.filter((candidate) => canAssignRole(currentUserRole, candidate)).map((candidate) => <option key={candidate} value={candidate}>{STAFF_ROLE_LABELS[candidate]}</option>)}</select></label>{formError && <p className="team-action-error" role="alert">{formError}</p>}<footer><button type="button" className="button button-secondary" onClick={() => setShowForm(false)}>Annuler</button><button type="submit" className="button button-primary"><Plus size={15}/> Ajouter</button></footer></form>
      </section>
    </div>}
  </section>;
}
