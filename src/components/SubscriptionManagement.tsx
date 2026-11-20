import { CalendarDays, CheckCircle2, CreditCard, FileText, ShieldCheck } from "lucide-react";
import "./SubscriptionManagement.css";

export default function SubscriptionManagement() {
  return <section className="subscription-page">
    <header className="page-heading"><div><div className="eyebrow">PLATEFORME · FACTURATION</div><h1>Abonnement & Facturation</h1><p>Consultez votre formule et les services associés à votre établissement.</p></div><span className="demo-tag">DÉMONSTRATION</span></header>
    <section className="subscription-current panel">
      <div className="subscription-current-icon"><ShieldCheck size={24}/></div>
      <div className="subscription-current-copy"><span>VOTRE ABONNEMENT ACTUEL</span><h2>Aucun abonnement réel associé</h2><p>Cette instance fonctionne avec des données de démonstration. Aucun contrat, renouvellement ou paiement réel n’est enregistré.</p></div>
      <div className="subscription-current-state"><span className="subscription-state-dot"/> Mode démo</div>
    </section>
    <section className="panel subscription-pending">
      <div className="subscription-pending-icon"><CreditCard size={23}/></div>
      <div><span className="subscription-pending-label">ARBITRAGE MÉTIER REQUIS</span><h2>Modèle économique non défini</h2>
        <p>Les formules, leurs modules inclus, les tarifs, la périodicité, les essais, les renouvellements et les règles de résiliation ne sont pas encore validés. Aucun prix ni engagement ne sera inventé.</p>
        <ul><li><CheckCircle2 size={15}/>Définition des formules et des modules</li><li><CheckCircle2 size={15}/>Tarification FCFA et périodicités</li><li><CheckCircle2 size={15}/>Période d’essai, renouvellement et résiliation</li><li><CheckCircle2 size={15}/>Factures, taxes et moyens de paiement</li></ul>
      </div>
      <span className="subscription-pending-status">En attente de validation</span>
    </section>
    <section className="panel subscription-history">
      <header><div className="subscription-history-icon"><FileText size={19}/></div><div><h2>Historique de facturation</h2><p>Factures, reçus et échéances de votre abonnement.</p></div></header>
      <div className="subscription-history-empty"><CalendarDays size={22}/><strong>Aucune facture réelle disponible</strong><span>Les factures apparaîtront ici après l’activation d’un abonnement sur la plateforme.</span></div>
    </section>
  </section>;
}
