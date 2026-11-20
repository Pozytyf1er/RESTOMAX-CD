# Fondation Supabase — Resto’MAX Core

## Projet
- Projet : `restomax-core`
- Project ref : `ekjlxxtrvhyfjajbjxwe`
- Région : `eu-west-1`
- PostgreSQL : 17
- Auth : Supabase Auth
- API navigateur : publishable key uniquement, avec RLS activé.
- Les clés `service_role` / secret ne doivent jamais être intégrées au frontend.

## Modèle multi-tenant
- `restaurants` : tenant, devise XOF, fuseau Africa/Abidjan et état.
- `restaurant_memberships` : utilisateur, rôle, statut actif et permissions personnalisées plafonnées.
- `profiles` : profil minimal lié à `auth.users`.
- Toutes les tables métier ont `restaurant_id`; les relations composites interdisent les références à des objets d'un autre restaurant.
- Les rôles plateforme proviennent exclusivement de `app_metadata` gérée côté serveur. Un rôle client ou `user_metadata` n'est jamais une autorité.

## Sécurité
- Schéma privé `private` pour les fonctions d'autorisation SECURITY DEFINER.
- RLS activé sur toutes les tables métier créées par la migration initiale.
- Les appartenances ne peuvent pas être créées ou modifiées directement par le navigateur.
- Les écritures métier directes sont fermées dans cette première migration. Les fonctions transactionnelles et opérations Edge seront ajoutées avant de brancher les écrans.
- Les autorisations sont recalculées depuis l'appartenance active et le statut du restaurant à chaque requête.
- Les plafonds du rôle sont vérifiés avant toute permission personnalisée.

## Migration initiale appliquée
Fichier : `supabase/migrations/20261119130000_initial_tenant_schema.sql`.

Tables initiales : profiles, restaurants, restaurant_memberships, menu_categories, menu_items, menu_options, dining_tables, customers, orders, order_items, inventory_items, stock_movements, reservations, cash_sessions, cash_movements, refunds, audit_logs.

## Configuration du client
Variables d'environnement :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Le client TypeScript est dans `src/lib/supabase.ts`. Il reste inactif si les variables ne sont pas présentes, afin de préserver le mode démonstration.

## Validations encore requises
1. Tests SQL/RLS avec deux restaurants et comptes de rôles différents.
2. Provisionnement sécurisé du premier propriétaire et invitation du personnel.
3. Fonctions transactionnelles pour commandes, caisse, remboursements, stocks et audit.
4. Connexion Auth et persistance React module par module.
5. Tests de suspension, d'idempotence et d'accès Super-admin.
6. CI verte sur le SHA exact avant de déclarer cette fondation certifiée.

Aucun déploiement Vercel n'a été effectué.
