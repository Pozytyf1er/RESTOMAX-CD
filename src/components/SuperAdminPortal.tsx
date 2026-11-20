import { useMemo, useState, type FormEvent } from "react";
import {
  Activity, AlertCircle, ArrowLeft, ArrowRight, BadgeCheck, Bell, Building2,
  CheckCircle2, CircleDollarSign, CreditCard, Headset, LayoutDashboard,
  LockKeyhole, LogOut, MoreHorizontal, Search, Settings, ShieldCheck, Users, Wallet, X, Crown, Store, Utensils, ChartNoAxesCombined,
} from "lucide-react";
import type {
  PlatformAuditEvent, PlatformInvoice, PlatformPlan, PlatformRestaurant, PlatformRestaurantStatus,
  PlatformSubscription, PlatformUser, SupportAccessGrant, SupportTicket, PlatformTicketStatus,
} from "../domain/types";
import "./SuperAdminPortal.css";

type Props = {
  restaurants: PlatformRestaurant[];
  plans: PlatformPlan[];
  subscriptions: PlatformSubscription[];
  invoices: PlatformInvoice[];
  users: PlatformUser[];
  tickets: SupportTicket[];
  auditEvents: PlatformAuditEvent[];
  grants: SupportAccessGrant[];
  onCreateRestaurant: (input: Pick<PlatformRestaurant, "name" | "ownerName" | "ownerEmail" | "city" | "country">, planId: string) => boolean;
  onChangeRestaurantStatus: (id: string, status: PlatformRestaurantStatus) => void;
  onChangeTicketStatus: (id: string, status: PlatformTicketStatus) => void;
  onToggleUser: (id: string, active: boolean) => void;
  onTogglePlan: (id: string, active: boolean) => void;
  onCreateGrant: (restaurantId: string, reason: string, scope: "read_only" | "limited", durationHours: number) => boolean;
  onReviewGrant: (id: string, action: "approve" | "revoke") => void;
  onExit: () => void;
};

type PlatformPage = "overview" | "restaurants" | "restaurant-detail" | "subscriptions" | "billing" | "users" | "support" | "audit" | "settings";

const restaurantStatus: Record<PlatformRestaurantStatus, string> = { active: "Actif", trial: "Essai", overdue: "Impayé", suspended: "Suspendu", terminated: "Clôturé" };
const ticketStatus: Record<PlatformTicketStatus, string> = { open: "Ouvert", in_progress: "En cours", resolved: "Résolu" };
const userRoleLabels = { super_admin: "Super-admin", support: "Support", sales: "Commercial", technical: "Technique", accounting: "Comptabilité", owner: "Propriétaire" };
const money = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value) + " FCFA";
const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Abidjan" }) : "—";
const timeLabel = (value?: string) => value ? new Date(value).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Abidjan" }) : "—";

export default function SuperAdminPortal({
  restaurants, plans, subscriptions, invoices, users, tickets, auditEvents, grants,
  onCreateRestaurant, onChangeRestaurantStatus, onChangeTicketStatus, onToggleUser, onTogglePlan, onCreateGrant, onReviewGrant, onExit,
}: Props) {
  const [page, setPage] = useState<PlatformPage>("overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PlatformRestaurantStatus>("all");
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [grantRestaurantId, setGrantRestaurantId] = useState(restaurants[0]?.id ?? "");
  const [grantReason, setGrantReason] = useState("");
  const [grantScope, setGrantScope] = useState<"read_only" | "limited">("read_only");
  const [grantDuration, setGrantDuration] = useState("1");
  const [grantError, setGrantError] = useState("");
  const [toast, setToast] = useState("");
  const [showRestaurantForm, setShowRestaurantForm] = useState(false);
  const [newRestaurantName, setNewRestaurantName] = useState("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newRestaurantCity, setNewRestaurantCity] = useState("Abidjan");
  const [newRestaurantCountry, setNewRestaurantCountry] = useState("Côte d’Ivoire");
  const [newRestaurantPlan, setNewRestaurantPlan] = useState(plans.find((plan) => plan.active)?.id ?? "");
  const [restaurantFormError, setRestaurantFormError] = useState("");

  const activeRestaurants = restaurants.filter((restaurant) => restaurant.status === "active").length;
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === "active").length;
  const monthlyRevenue = subscriptions.filter((subscription) => subscription.status === "active").reduce((sum, subscription) => sum + (subscription.amountXOF ?? 0), 0);
  const selectedRestaurant = restaurants.find((restaurant) => restaurant.id === selectedRestaurantId);
  const filteredRestaurants = useMemo(() => restaurants.filter((restaurant) => {
    const q = search.toLocaleLowerCase("fr");
    const matchesSearch = !q || [restaurant.name, restaurant.ownerName, restaurant.ownerEmail, restaurant.city].some((value) => value.toLocaleLowerCase("fr").includes(q));
    return matchesSearch && (statusFilter === "all" || restaurant.status === statusFilter);
  }), [restaurants, search, statusFilter]);
  const planCounts = plans.map((plan) => ({ ...plan, count: subscriptions.filter((subscription) => subscription.planId === plan.id && subscription.status !== "cancelled").length }));
  const openTickets = tickets.filter((ticket) => ticket.status !== "resolved");
  const platformUserCount = users.filter((user) => user.role !== "owner").length + restaurants.reduce((sum, restaurant) => sum + restaurant.userCount, 0);
  const totalUsersLabel = new Intl.NumberFormat("fr-FR").format(platformUserCount);

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2600); }
  function openRestaurant(id: string) { setSelectedRestaurantId(id); setPage("restaurant-detail"); }
  function changeRestaurantStatus(restaurant: PlatformRestaurant, status: PlatformRestaurantStatus) {
    onChangeRestaurantStatus(restaurant.id, status);
    notify(`${restaurant.name} : statut « ${restaurantStatus[status]} » enregistré dans la démonstration.`);
  }
  function exportPlatformReport() {
    const headers = ["Restaurant", "Propriétaire", "E-mail", "Ville", "Pays", "Formule", "Statut", "Utilisateurs", "Créé le", "Dernière activité"];
    const rows = restaurants.map((restaurant) => [
      restaurant.name, restaurant.ownerName, restaurant.ownerEmail, restaurant.city, restaurant.country,
      restaurant.planName, restaurantStatus[restaurant.status], restaurant.userCount,
      dateLabel(restaurant.createdAtISO), timeLabel(restaurant.lastActivityISO),
    ]);
    const summary = [
      ["SYNTHÈSE PLATEFORME", "VALEUR"],
      ["Restaurants actifs", activeRestaurants],
      ["Restaurants au total", restaurants.length],
      ["Utilisateurs total", platformUserCount],
      ["Revenus plateforme mensuels (FCFA)", monthlyRevenue || "À définir"],
      ["Abonnements actifs", activeSubscriptions],
      [],
      headers,
    ];
    const csv = [...summary, ...rows].map((row) => row.map((value) => '"' + String(value ?? "").replace(/"/g, '""') + '"').join(";")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "restomax-plateforme-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    notify("Rapport CSV téléchargé.");
  }

  function submitRestaurant(event: FormEvent) {
    event.preventDefault(); setRestaurantFormError("");
    const accepted = onCreateRestaurant({
      name: newRestaurantName.trim(), ownerName: newOwnerName.trim(), ownerEmail: newOwnerEmail.trim(),
      city: newRestaurantCity.trim(), country: newRestaurantCountry.trim(),
    }, newRestaurantPlan);
    if (!accepted) { setRestaurantFormError("Vérifiez les informations, l’e-mail et la formule sélectionnée."); return; }
    setNewRestaurantName(""); setNewOwnerName(""); setNewOwnerEmail(""); setNewRestaurantCity("Abidjan"); setNewRestaurantCountry("Côte d’Ivoire"); setShowRestaurantForm(false);
    notify("Restaurant ajouté en mode démonstration.");
  }

  function submitGrant(event: FormEvent) {
    event.preventDefault(); setGrantError("");
    if (!grantRestaurantId || !grantReason.trim() || !onCreateGrant(grantRestaurantId, grantReason.trim(), grantScope, Number(grantDuration))) {
      setGrantError("Sélectionnez un restaurant, indiquez un motif et une durée valide.");
      return;
    }
    setGrantReason(""); notify("Demande d’accès support enregistrée.");
  }

  const nav = [
    { id: "overview" as const, label: "Tableau de bord", icon: LayoutDashboard },
    { id: "restaurants" as const, label: "Restaurants clients", icon: Store },
    { id: "restaurant-detail" as const, label: "Fiche restaurant", icon: Building2 },
    { id: "subscriptions" as const, label: "Offres et abonnements", icon: BadgeCheck },
    { id: "billing" as const, label: "Facturation", icon: Wallet },
    { id: "users" as const, label: "Utilisateurs", icon: Users },
    { id: "support" as const, label: "Support et tickets", icon: Headset, count: openTickets.length },
    { id: "audit" as const, label: "Journal d’audit", icon: Activity },
    { id: "settings" as const, label: "Paramètres plateforme", icon: Settings },
  ];

  return <div className="sa-shell">
    <aside className="sa-sidebar">
      <div className="sa-brand"><span className="sa-brand-mark"><Utensils size={19}/></span><span>Resto<span>’</span>MAX<small>SUPER-ADMINISTRATEUR</small></span></div>
      <div className="sa-workspace-label">ESPACE PLATEFORME</div>
      <nav className="sa-nav">{nav.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" aria-label={item.label} title={item.label} aria-current={page === item.id || (item.id === "restaurants" && page === "restaurant-detail") ? "page" : undefined} className={page === item.id || (item.id === "restaurants" && page === "restaurant-detail") ? "active" : ""} onClick={() => setPage(item.id)}><Icon size={17}/><span>{item.label}</span>{item.count ? <em>{item.count}</em> : null}</button>; })}</nav>
      <div className="sa-sidebar-spacer"/>
      <div className="sa-pro-card"><div className="sa-pro-icon"><Crown size={16}/></div><strong>Resto’MAX Pro</strong><p>La plateforme de gestion de votre réseau de restaurants.</p><button onClick={() => setPage("subscriptions")}>Gérer les offres <ArrowRight size={13}/></button></div>
      <div className="sa-profile"><span className="sa-avatar">SA</span><div><strong>Super Admin</strong><small>Administrateur plateforme</small></div><button onClick={onExit} title="Retour à l’espace restaurant"><LogOut size={16}/></button></div>
    </aside>

    <main className="sa-main">
      <header className="sa-topbar">
        <div className="sa-breadcrumb"><span>Espace Super-administrateur</span><span>/</span><strong>{nav.find((item) => item.id === page)?.label ?? "Fiche restaurant"}</strong></div>
        <div className="sa-top-actions"><span className="sa-demo-pill">APERÇU DÉMO</span><button className="sa-icon-button" aria-label="Notifications non configurées" disabled><Bell size={17}/><i/></button><span className="sa-top-avatar">SA</span></div>
      </header>

      <div className="sa-content">
        {page === "overview" && <>
          <div className="sa-page-heading"><div><span className="sa-eyebrow">CENTRE DE CONTRÔLE</span><h1>Tableau de bord plateforme</h1><p>Vue d’ensemble de votre plateforme Resto’MAX.</p></div><button className="sa-export-button" onClick={exportPlatformReport}><ChartNoAxesCombined size={15}/> Rapport global</button></div>
          <div className="sa-kpi-grid">
            <article className="sa-kpi"><span className="sa-kpi-icon orange"><Store size={18}/></span><div><small>Restaurants actifs</small><strong>{activeRestaurants}</strong><em className="neutral">{restaurants.length} établissements au total</em></div><svg viewBox="0 0 90 34" className="sa-spark"><path d="M2 27 L14 22 L25 25 L36 14 L47 18 L58 9 L70 13 L88 3" /></svg></article>
            <article className="sa-kpi"><span className="sa-kpi-icon blue"><Users size={18}/></span><div><small>Utilisateurs total</small><strong>{totalUsersLabel}</strong><em className="neutral">Comptes plateforme et utilisateurs restaurants</em></div><svg viewBox="0 0 90 34" className="sa-spark blue"><path d="M2 28 L14 23 L25 24 L36 17 L47 20 L58 12 L70 9 L88 3" /></svg></article>
            <article className="sa-kpi"><span className="sa-kpi-icon green"><CircleDollarSign size={18}/></span><div><small>Revenus plateforme</small><strong>{monthlyRevenue ? money(monthlyRevenue) : "À définir"}</strong><em className="neutral">{monthlyRevenue ? "Abonnements actifs" : "Tarifs des formules non configurés"}</em></div><svg viewBox="0 0 90 34" className="sa-spark green"><path d="M2 29 L14 26 L25 18 L36 20 L47 13 L58 15 L70 7 L88 2" /></svg></article>
            <article className="sa-kpi"><span className="sa-kpi-icon violet"><CreditCard size={18}/></span><div><small>Abonnements actifs</small><strong>{activeSubscriptions}</strong><em className="neutral">{subscriptions.length} contrats enregistrés</em></div><svg viewBox="0 0 90 34" className="sa-spark violet"><path d="M2 26 L14 24 L25 18 L36 21 L47 12 L58 15 L70 8 L88 5" /></svg></article>
          </div>
          <div className="sa-dashboard-grid">
            <section className="sa-card sa-chart-card"><header><div><h2>Croissance globale</h2><p>Évolution des revenus et du nombre de restaurants · données de démonstration</p></div><select aria-label="Période du graphique" defaultValue="6" disabled><option value="6">6 derniers mois</option><option value="12">12 derniers mois</option></select></header><div className="sa-chart-legend"><span><i className="revenue"/> Revenus</span><span><i className="restaurants"/> Restaurants</span></div><div className="sa-line-chart"><div className="sa-y-labels"><span>30 M</span><span>20 M</span><span>10 M</span><span>0</span></div><svg viewBox="0 0 650 220" preserveAspectRatio="none" role="img" aria-label="Progression des revenus et des restaurants"><defs><linearGradient id="sa-revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff8738" stopOpacity=".22"/><stop offset="100%" stopColor="#ff8738" stopOpacity="0"/></linearGradient></defs><path className="sa-grid-line" d="M0 18 H650 M0 78 H650 M0 138 H650 M0 198 H650"/><path className="sa-area" d="M0 168 C55 160 65 150 130 145 S220 130 260 122 S350 98 390 106 S470 70 520 62 S600 35 650 25 L650 198 L0 198 Z"/><path className="sa-revenue-line" d="M0 168 C55 160 65 150 130 145 S220 130 260 122 S350 98 390 106 S470 70 520 62 S600 35 650 25"/><path className="sa-restaurants-line" d="M0 185 C60 181 90 176 130 169 S220 164 260 155 S350 146 390 139 S470 132 520 121 S600 113 650 105"/></svg><div className="sa-x-labels"><span>Juin</span><span>Juil.</span><span>Août</span><span>Sept.</span><span>Oct.</span><span>Nov.</span></div></div></section>
            <section className="sa-card sa-plan-card"><header><div><h2>Répartition des abonnements</h2><p>Abonnements actifs par formule</p></div><button className="sa-more-button" onClick={() => setPage("subscriptions")}><MoreHorizontal size={18}/></button></header><div className="sa-donut-wrap"><div className="sa-donut"><div><strong>{activeSubscriptions}</strong><small>Actifs</small></div></div></div><div className="sa-plan-legend">{planCounts.map((plan,index)=><div key={plan.id}><span className={`dot dot-${index}`}/><span>{plan.name}</span><strong>{plan.count}</strong></div>)}</div><button className="sa-text-link" onClick={() => setPage("subscriptions")}>Voir les abonnements <ArrowRight size={13}/></button></section>
          </div>
          <div className="sa-lower-grid">
            <section className="sa-card"><header><div><h2>Nouveaux restaurants</h2><p>Derniers établissements inscrits</p></div><button className="sa-text-link" onClick={() => setPage("restaurants")}>Tout voir <ArrowRight size={13}/></button></header><div className="sa-new-restaurants">{restaurants.slice().sort((a,b)=>b.createdAtISO.localeCompare(a.createdAtISO)).slice(0,4).map((restaurant)=> <button key={restaurant.id} onClick={()=>openRestaurant(restaurant.id)}><span className="sa-restaurant-logo">{restaurant.name.slice(0,1)}</span><span><strong>{restaurant.name}</strong><small>{restaurant.city}, {restaurant.country}</small></span><em className={`sa-status ${restaurant.status}`}>{restaurantStatus[restaurant.status]}</em></button>)}</div></section>
            <section className="sa-card"><header><div><h2>Tickets de support</h2><p>Demandes nécessitant une attention</p></div><button className="sa-text-link" onClick={() => setPage("support")}>Voir tout <ArrowRight size={13}/></button></header><div className="sa-ticket-list">{openTickets.slice(0,3).map((ticket)=><button key={ticket.id} onClick={()=>setPage("support")}><span className={`sa-ticket-priority ${ticket.priority}`}/><span><strong>{ticket.subject}</strong><small>{ticket.id} · {ticket.restaurantName}</small></span><em>{ticketStatus[ticket.status]}</em></button>)}{!openTickets.length && <div className="sa-empty">Aucun ticket en attente.</div>}</div></section>
          </div>
          <section className="sa-card sa-activity-card"><header><div><h2>Activité récente</h2><p>Dernières opérations effectuées sur la plateforme</p></div><button className="sa-text-link" onClick={() => setPage("audit")}>Journal complet <ArrowRight size={13}/></button></header><div className="sa-activity-list">{auditEvents.slice(0,4).map((event)=><article key={event.id}><span className="sa-activity-dot"/><div><strong>{event.action}</strong><p>{event.description}</p><small>{event.actor} · {timeLabel(event.createdAtISO)}</small></div><em>{event.target}</em></article>)}</div></section>
          <footer className="sa-system-footer"><span><i/> Interface de démonstration · backend non connecté</span><span>Chiffres d’aperçu · <strong>Resto’MAX v1.0.0</strong></span></footer>
        </>}

        {page === "restaurants" && <section className="sa-page-section"><div className="sa-page-heading"><div><span className="sa-eyebrow">GESTION DU PARC CLIENT</span><h1>Restaurants clients</h1><p>Consultez et gérez les établissements de la plateforme.</p></div><div className="sa-heading-actions"><span className="sa-count-chip">{restaurants.length} établissements</span><button className="sa-primary-button" onClick={()=>setShowRestaurantForm(true)}><Store size={14}/> Nouveau restaurant</button></div></div><div className="sa-toolbar"><div className="sa-search"><Search size={15}/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Rechercher un restaurant, propriétaire, ville…"/></div><select value={statusFilter} onChange={(event)=>setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">Tous les statuts</option>{Object.entries(restaurantStatus).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div><div className="sa-card sa-table-card"><div className="sa-table-scroll"><table className="sa-table"><thead><tr><th>ÉTABLISSEMENT</th><th>PROPRIÉTAIRE</th><th>FORMULE</th><th>UTILISATEURS</th><th>STATUT</th><th>DERNIÈRE ACTIVITÉ</th><th/></tr></thead><tbody>{filteredRestaurants.map((restaurant)=><tr key={restaurant.id}><td><strong>{restaurant.name}</strong><small>{restaurant.city}, {restaurant.country}</small></td><td>{restaurant.ownerName}<small>{restaurant.ownerEmail}</small></td><td>{restaurant.planName}</td><td>{restaurant.userCount}</td><td><em className={`sa-status ${restaurant.status}`}>{restaurantStatus[restaurant.status]}</em></td><td>{timeLabel(restaurant.lastActivityISO)}</td><td><button className="sa-row-action" onClick={()=>openRestaurant(restaurant.id)}>Ouvrir <ArrowRight size={13}/></button></td></tr>)}</tbody></table></div>{!filteredRestaurants.length && <div className="sa-empty">Aucun restaurant ne correspond à cette recherche.</div>}</div></section>}

        {showRestaurantForm && <div className="sa-modal-backdrop" role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget)setShowRestaurantForm(false);}}><section className="sa-modal" role="dialog" aria-modal="true" aria-labelledby="sa-create-restaurant-title"><header><div><h2 id="sa-create-restaurant-title">Créer un restaurant</h2><p>Un espace d’essai sera créé en mémoire. Aucun e-mail d’invitation ni paiement réel ne sera déclenché.</p></div><button className="sa-more-button" onClick={()=>setShowRestaurantForm(false)} aria-label="Fermer"><X size={17}/></button></header><form onSubmit={submitRestaurant}><label>Nom du restaurant<input required maxLength={100} value={newRestaurantName} onChange={(event)=>setNewRestaurantName(event.target.value)} placeholder="Nom de l’établissement"/></label><label>Nom du propriétaire<input required maxLength={100} value={newOwnerName} onChange={(event)=>setNewOwnerName(event.target.value)} placeholder="Nom complet"/></label><label>E-mail du propriétaire<input required type="email" value={newOwnerEmail} onChange={(event)=>setNewOwnerEmail(event.target.value)} placeholder="proprietaire@restaurant.ci"/></label><div className="sa-modal-two"><label>Ville<input required value={newRestaurantCity} onChange={(event)=>setNewRestaurantCity(event.target.value)}/></label><label>Pays<input required value={newRestaurantCountry} onChange={(event)=>setNewRestaurantCountry(event.target.value)}/></label></div><label>Formule d’essai<select value={newRestaurantPlan} onChange={(event)=>setNewRestaurantPlan(event.target.value)}>{plans.filter((plan)=>plan.active).map((plan)=><option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>{restaurantFormError && <p className="sa-form-error" role="alert">{restaurantFormError}</p>}<footer><button type="button" className="sa-secondary-button" onClick={()=>setShowRestaurantForm(false)}>Annuler</button><button type="submit" className="sa-primary-button">Créer l’espace</button></footer></form></section></div>}
        {page === "restaurant-detail" && !selectedRestaurant && <section className="sa-page-section"><div className="sa-page-heading"><div><span className="sa-eyebrow">FICHE ÉTABLISSEMENT</span><h1>Fiche restaurant</h1><p>Sélectionnez un établissement pour consulter sa fiche et ses actions de gestion.</p></div><button className="sa-primary-button" onClick={() => setPage("restaurants")}><Store size={14}/> Voir les restaurants</button></div><div className="sa-card sa-empty" role="status">Aucun restaurant sélectionné.</div></section>}
        {page === "restaurant-detail" && selectedRestaurant && <section className="sa-page-section"><button className="sa-back-button" onClick={()=>setPage("restaurants")}><ArrowLeft size={15}/> Retour aux restaurants</button><div className="sa-page-heading"><div><span className="sa-eyebrow">FICHE ÉTABLISSEMENT</span><h1>{selectedRestaurant.name}</h1><p>{selectedRestaurant.city}, {selectedRestaurant.country} · Créé le {dateLabel(selectedRestaurant.createdAtISO)}</p></div><em className={`sa-status ${selectedRestaurant.status}`}>{restaurantStatus[selectedRestaurant.status]}</em></div><div className="sa-detail-grid"><article className="sa-card"><h2>Informations générales</h2><dl><dt>Propriétaire</dt><dd>{selectedRestaurant.ownerName}</dd><dt>E-mail</dt><dd>{selectedRestaurant.ownerEmail}</dd><dt>Utilisateurs</dt><dd>{selectedRestaurant.userCount}</dd><dt>Dernière activité</dt><dd>{timeLabel(selectedRestaurant.lastActivityISO)}</dd><dt>Renouvellement</dt><dd>{dateLabel(selectedRestaurant.renewalAtISO)}</dd></dl></article><article className="sa-card"><h2>Abonnement</h2><div className="sa-plan-highlight"><BadgeCheck size={19}/><div><strong>{selectedRestaurant.planName}</strong><small>Formule attribuée</small></div></div><p className="sa-muted">Les tarifs et conditions commerciales doivent être configurés avant l’activation de la facturation réelle.</p><button className="sa-secondary-button" onClick={()=>setPage("subscriptions")}>Gérer les abonnements</button></article><article className="sa-card sa-detail-actions"><h2>Actions plateforme</h2>{selectedRestaurant.status === "suspended" ? <button className="sa-primary-button" onClick={()=>changeRestaurantStatus(selectedRestaurant,"active")}><CheckCircle2 size={15}/> Réactiver le restaurant</button> : selectedRestaurant.status !== "terminated" ? <button className="sa-warning-button" onClick={()=>changeRestaurantStatus(selectedRestaurant,"suspended")}><LockKeyhole size={15}/> Suspendre l’accès</button> : <p className="sa-muted">Cet établissement est clôturé logiquement.</p>}{selectedRestaurant.status !== "terminated" && <button className="sa-danger-button" onClick={()=>changeRestaurantStatus(selectedRestaurant,"terminated")}><X size={15}/> Clôturer logiquement</button>}<p className="sa-muted">La clôture logique bloque l’accès sans supprimer l’historique commercial.</p></article></div></section>}

        {page === "subscriptions" && <section className="sa-page-section"><div className="sa-page-heading"><div><span className="sa-eyebrow">OFFRES COMMERCIALES</span><h1>Offres & abonnements</h1><p>Gérez les formules, les capacités et les abonnements des restaurants.</p></div><span className="sa-count-chip">{activeSubscriptions} abonnements actifs</span></div><div className="sa-plan-grid">{plans.map((plan,index)=><article className="sa-card sa-plan-tile" key={plan.id}><span className={`sa-plan-badge plan-${index}`}>{plan.name}</span><h2>{plan.description}</h2><strong className="sa-plan-price">Tarif à configurer</strong><small>{subscriptions.filter((sub)=>sub.planId===plan.id&&sub.status!=="cancelled").length} abonnement(s)</small><ul><li>{plan.maxUsers} utilisateurs maximum</li><li>{plan.maxEstablishments} établissement(s)</li><li>{plan.maxTables} tables</li>{plan.features.map((feature)=><li key={feature}>{feature}</li>)}</ul><button className={plan.active ? "sa-secondary-button" : "sa-primary-button"} onClick={()=>onTogglePlan(plan.id,!plan.active)}>{plan.active ? "Désactiver l’offre" : "Activer l’offre"}</button><em className={plan.active ? "sa-plan-active" : "sa-plan-inactive"}>{plan.active ? "Offre active" : "Offre inactive"}</em></article>)}</div><div className="sa-card sa-table-card"><header><h2>Abonnements des restaurants</h2></header><div className="sa-table-scroll"><table className="sa-table"><thead><tr><th>RESTAURANT</th><th>FORMULE</th><th>STATUT</th><th>DÉBUT</th><th>RENOUVELLEMENT</th></tr></thead><tbody>{subscriptions.map((subscription)=><tr key={subscription.id}><td>{subscription.restaurantName}</td><td>{subscription.planName}</td><td><em className={`sa-status ${subscription.status}`}>{subscription.status === "active" ? "Actif" : subscription.status === "trial" ? "Essai" : subscription.status === "overdue" ? "Impayé" : "Annulé"}</em></td><td>{dateLabel(subscription.startedAtISO)}</td><td>{dateLabel(subscription.renewsAtISO)}</td></tr>)}</tbody></table></div></div></section>}

        {page === "billing" && <section className="sa-page-section"><div className="sa-page-heading"><div><span className="sa-eyebrow">REVENUS PLATEFORME</span><h1>Facturation</h1><p>Suivez les factures, les échéances et les paiements d’abonnement.</p></div><span className="sa-count-chip">Tarifs à configurer</span></div><div className="sa-billing-kpis"><article className="sa-card"><small>Factures payées</small><strong>{invoices.filter((invoice)=>invoice.status==="paid").length}</strong></article><article className="sa-card"><small>En attente</small><strong>{invoices.filter((invoice)=>invoice.status==="pending").length}</strong></article><article className="sa-card"><small>En retard</small><strong>{invoices.filter((invoice)=>invoice.status==="overdue").length}</strong></article></div><div className="sa-card sa-table-card"><header><h2>Factures émises</h2></header><div className="sa-table-scroll"><table className="sa-table"><thead><tr><th>RÉFÉRENCE</th><th>RESTAURANT</th><th>ÉMISE LE</th><th>ÉCHÉANCE</th><th>MONTANT</th><th>STATUT</th></tr></thead><tbody>{invoices.map((invoice)=><tr key={invoice.id}><td><strong>{invoice.number}</strong></td><td>{invoice.restaurantName}</td><td>{dateLabel(invoice.issuedAtISO)}</td><td>{dateLabel(invoice.dueAtISO)}</td><td>{invoice.amountXOF === undefined ? "À configurer" : money(invoice.amountXOF)}</td><td><em className={`sa-status ${invoice.status}`}>{invoice.status === "paid" ? "Payée" : invoice.status === "pending" ? "En attente" : invoice.status === "overdue" ? "En retard" : "Annulée"}</em></td></tr>)}</tbody></table></div></div><p className="sa-info-note"><AlertCircle size={15}/> Le modèle de prix et de commission n’étant pas encore arrêté, aucune facture réelle ni aucun montant de plan n’est calculé dans cette démonstration.</p></section>}

        {page === "users" && <section className="sa-page-section"><div className="sa-page-heading"><div><span className="sa-eyebrow">ACCÈS & COMPTES</span><h1>Utilisateurs</h1><p>Comptes de la plateforme et propriétaires des restaurants.</p></div><span className="sa-count-chip">{users.length} comptes de démonstration</span></div><div className="sa-card sa-table-card"><div className="sa-table-scroll"><table className="sa-table"><thead><tr><th>UTILISATEUR</th><th>RÔLE</th><th>RESTAURANT</th><th>DERNIÈRE CONNEXION</th><th>STATUT</th><th>ACTION</th></tr></thead><tbody>{users.map((user)=><tr key={user.id}><td><strong>{user.name}</strong><small>{user.email}</small></td><td>{userRoleLabels[user.role]}</td><td>{restaurants.find((restaurant)=>restaurant.id===user.restaurantId)?.name ?? "Plateforme"}</td><td>{timeLabel(user.lastLoginAtISO)}</td><td><em className={`sa-status ${user.active ? "active" : "suspended"}`}>{user.active ? "Actif" : "Suspendu"}</em></td><td><button className="sa-row-action" onClick={()=>onToggleUser(user.id,!user.active)}>{user.active ? "Désactiver" : "Réactiver"}</button></td></tr>)}</tbody></table></div></div><p className="sa-info-note"><ShieldCheck size={15}/> Les rôles plateforme sont distincts des rôles restaurant. Les droits réels seront appliqués par l’authentification et les politiques serveur.</p></section>}

        {page === "support" && <section className="sa-page-section"><div className="sa-page-heading"><div><span className="sa-eyebrow">ASSISTANCE CLIENT</span><h1>Support & tickets</h1><p>Traitez les demandes et encadrez les interventions sur les restaurants.</p></div><span className="sa-count-chip">{openTickets.length} ticket(s) ouvert(s)</span></div><div className="sa-support-grid"><section className="sa-card"><header><h2>Tickets de support</h2></header>{tickets.map((ticket)=><article className="sa-support-ticket" key={ticket.id}><div><span className={`sa-ticket-priority ${ticket.priority}`}/><strong>{ticket.subject}</strong><small>{ticket.id} · {ticket.restaurantName} · {ticket.category}</small><small>{ticket.messagesCount} message(s) · {timeLabel(ticket.createdAtISO)}</small></div><div><em className={`sa-status ${ticket.status}`}>{ticketStatus[ticket.status]}</em><select aria-label={`Statut ${ticket.id}`} value={ticket.status} onChange={(event)=>onChangeTicketStatus(ticket.id,event.target.value as PlatformTicketStatus)}><option value="open">Ouvert</option><option value="in_progress">En cours</option><option value="resolved">Résolu</option></select></div></article>)}</section><section className="sa-card"><header><h2>Accès support encadrés</h2></header><p className="sa-muted">Toute intervention doit être justifiée, limitée dans le temps et journalisée. En mode démo, aucune session réelle n’est ouverte.</p><form className="sa-grant-form" onSubmit={submitGrant}><label>Restaurant<select value={grantRestaurantId} onChange={(event)=>setGrantRestaurantId(event.target.value)}>{restaurants.filter((restaurant)=>restaurant.status!=="terminated").map((restaurant)=><option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}</select></label><label>Motif<textarea required maxLength={240} value={grantReason} onChange={(event)=>setGrantReason(event.target.value)} placeholder="Décrire l’incident ou la demande du client"/></label><label>Type d’accès<select value={grantScope} onChange={(event)=>setGrantScope(event.target.value as typeof grantScope)}><option value="read_only">Lecture seule</option><option value="limited">Accès limité</option></select></label><label>Durée<select value={grantDuration} onChange={(event)=>setGrantDuration(event.target.value)}><option value="1">1 heure</option><option value="2">2 heures</option><option value="4">4 heures</option></select></label>{grantError && <p className="sa-form-error" role="alert">{grantError}</p>}<button className="sa-primary-button" type="submit">Créer une demande d’accès</button></form></section></div><section className="sa-card sa-table-card"><header><h2>Demandes d’accès support</h2></header><div className="sa-grant-list">{grants.map((grant)=><article key={grant.id}><div><strong>{grant.restaurantName}</strong><small>{grant.requestedBy} · {grant.reason}</small><small>{grant.scope === "read_only" ? "Lecture seule" : "Accès limité"} · {timeLabel(grant.startsAtISO)} → {timeLabel(grant.expiresAtISO)}</small></div><em className={`sa-status ${grant.status}`}>{grant.status === "pending" ? "En attente" : grant.status === "active" ? "Actif" : grant.status === "revoked" ? "Révoqué" : "Expiré"}</em><div>{grant.status === "pending" && <button className="sa-row-action" onClick={()=>onReviewGrant(grant.id,"approve")}>Approuver</button>}{grant.status === "active" && <button className="sa-row-action danger" onClick={()=>onReviewGrant(grant.id,"revoke")}>Révoquer</button>}</div></article>)}</div></section></section>}

        {page === "audit" && <section className="sa-page-section"><div className="sa-page-heading"><div><span className="sa-eyebrow">TRAÇABILITÉ</span><h1>Audit & activités</h1><p>Historique des opérations sensibles sur la plateforme.</p></div><span className="sa-count-chip">{auditEvents.length} événements</span></div><div className="sa-card sa-audit-list">{auditEvents.slice().sort((a,b)=>b.createdAtISO.localeCompare(a.createdAtISO)).map((event)=><article key={event.id}><span className="sa-audit-icon"><Activity size={16}/></span><div><strong>{event.action}</strong><p>{event.description}</p><small>{event.actor} · Cible : {event.target}</small></div><time>{timeLabel(event.createdAtISO)}</time></article>)}</div><p className="sa-info-note"><LockKeyhole size={15}/> Le journal présenté ici est une donnée de démonstration en mémoire. Le journal de production devra être append-only et protégé côté serveur.</p></section>}

        {page === "settings" && <section className="sa-page-section"><div className="sa-page-heading"><div><span className="sa-eyebrow">CONFIGURATION GLOBALE</span><h1>Paramètres plateforme</h1><p>Référentiels et règles globales de Resto’MAX.</p></div></div><div className="sa-settings-grid"><article className="sa-card"><h2>Paramètres régionaux</h2><label>Langue par défaut<input value="Français" readOnly/></label><label>Devise par défaut<input value="XOF · Franc CFA" readOnly/></label><label>Fuseau horaire<input value="Africa/Abidjan" readOnly/></label><label>Pays de lancement<input value="Côte d’Ivoire · UEMOA" readOnly/></label></article><article className="sa-card"><h2>Règles commerciales</h2><div className="sa-setting-row"><span>Tarifs des formules</span><strong>À définir</strong></div><div className="sa-setting-row"><span>Commission plateforme</span><strong>Non configurée</strong></div><div className="sa-setting-row"><span>Durée d’essai</span><strong>À valider</strong></div><div className="sa-setting-row"><span>Règle de renouvellement</span><strong>À valider</strong></div><p className="sa-muted">Aucune valeur tarifaire n’est inventée tant que le modèle économique n’a pas été validé.</p></article><article className="sa-card"><h2>Sécurité & conformité</h2><div className="sa-setting-row"><span>Isolation des restaurants</span><strong>À appliquer en base</strong></div><div className="sa-setting-row"><span>Journal d’audit serveur</span><strong>À raccorder</strong></div><div className="sa-setting-row"><span>Accès support temporaire</span><strong>Maquette fonctionnelle</strong></div><div className="sa-setting-row"><span>Authentification plateforme</span><strong>À raccorder</strong></div></article></div></section>}
      </div>
    </main>
    {toast && <div className="sa-toast" role="status">{toast}</div>}
  </div>;
}
