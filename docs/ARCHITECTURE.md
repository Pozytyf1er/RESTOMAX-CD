# Resto’MAX — Architecture cible et sécurité

## 1. Socle technique
- Frontend : React + TypeScript + Vite.
- Authentification : Supabase Auth.
- Données : PostgreSQL 17 via Supabase.
- Autorisation : Row Level Security (RLS), rôles et permissions vérifiés en base.
- Opérations sensibles : Supabase Edge Functions et fonctions SQL transactionnelles.
- Fichiers : Supabase Storage avec politiques dédiées.
- Région : `eu-west-1`.
- Devise : XOF (FCFA). Fuseau métier : `Africa/Abidjan`.
- Paiements : PayDunya modèle B, compte propre à chaque restaurant, mode TEST uniquement.
- Le dépôt AI Studio `Pozytyf/restomax_d-mo` reste indépendant.

## 2. Isolation multi-tenant
- Chaque restaurant est un tenant identifié par UUID.
- Toutes les tables métier possèdent `restaurant_id` et des clés étrangères composites empêchent les références croisées.
- Les appartenances et rôles résident dans `restaurant_memberships`; le rôle envoyé par le navigateur n'est jamais une preuve d'autorisation.
- RLS est activé sur chaque table exposée.
- Les politiques s'appuient sur `auth.uid()`, le statut actif du membre et le statut du restaurant.
- Les permissions personnalisées peuvent réduire ou accorder des droits uniquement à l'intérieur du plafond immuable du rôle.
- Le Super-administrateur plateforme est séparé des rôles restaurant et identifié par une revendication `app_metadata` gérée côté serveur.
- Les écritures financières, remboursements, clôtures, transitions de commande et mouvements de stock passent par des opérations atomiques et journalisées.

## 3. Rôles restaurant
- Propriétaire : contrôle du tenant et attribution de permissions dans le plafond du rôle cible.
- Manager : gère les rôles inférieurs, sans modifier un propriétaire ou un autre manager.
- Caissier : encaisse; annulation/remboursement uniquement si explicitement accordés et dans les plafonds.
- Serveur : commandes, tables et réservations; aucun encaissement par défaut.
- Cuisine/Bar : préparation et disponibilité; aucun accès aux rapports financiers.
- Une appartenance suspendue ou un restaurant suspendu est bloqué par RLS à chaque requête.

## 4. Domaines persistés
Restaurants, profils, appartenances, menu, options, tables, commandes et lignes, clients, fidélité, réservations, stocks et mouvements, fournisseurs, achats/réceptions, caisse, dépenses, remboursements, shifts, présence, abonnements, factures et journal d'audit.

## 5. QR physique et sessions de table
- Le QR identifie un restaurant et une table; le client ne choisit ni ne modifie la table.
- Le QR ne contient pas de secret réutilisable en clair.
- Le serveur valide jeton, statut restaurant/table et version.
- Session client via cookie HttpOnly, Secure, SameSite et durée limitée.
- Rotation incrémente la version et révoque immédiatement l'ancien QR.

## 6. Commandes et paiements
- Prix et lignes de commande figés côté serveur au moment de l'acceptation.
- Préparation, livraison, encaissement et clôture sont distincts.
- Paiements append-only et idempotents.
- Remboursements enregistrés comme événements séparés.
- Webhooks PayDunya signés, vérifiés côté serveur et idempotents.
- Secrets PayDunya séparés par tenant, mode TEST avant certification.

## 7. Portes de mise en service
1. Authentification, schéma SQL et RLS testés sur un environnement isolé.
2. Deux restaurants A/B testés avec des comptes distincts.
3. Un utilisateur suspendu et un restaurant suspendu sont refusés immédiatement.
4. Un rôle cuisine ne peut pas lire les données financières; un caissier ne peut pas modifier les permissions.
5. Les écritures critiques sont transactionnelles et idempotentes.
6. CI sur SHA exact : typecheck, tests et build tous verts.
7. Preview et parcours navigateur réels.
8. QR, PayDunya LIVE ou Production uniquement après autorisation distincte.

Aucun déploiement Vercel ou activation de paiements réels n'est effectué dans cette phase.
