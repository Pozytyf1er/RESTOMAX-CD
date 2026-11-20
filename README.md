# Resto’MAX Core

Socle applicatif indépendant de Resto’MAX. Ce dépôt est distinct du dépôt réservé à Google AI Studio.

## Objectif
Application web React + TypeScript, en français, pensée pour les restaurants de Côte d’Ivoire et de l’UEMOA :
- Interface responsive **Midnight & Orange**.
- Paramètres régionaux : **XOF (FCFA)** et **Africa/Abidjan**.
- Espaces Propriétaire et Super-administrateur.
- Parcours commandes, cuisine/bar, caisse, stocks, achats, clients, fidélité et réservations.

## Architecture
- **Supabase Auth** : comptes et sessions.
- **Supabase PostgreSQL** : données métier transactionnelles.
- **RLS** : isolation stricte entre restaurants et droits par rôle.
- **Edge Functions / fonctions SQL** : opérations sensibles.
- **Supabase Storage** : médias et documents privés.

Projet dédié : `restomax-core` (`ekjlxxtrvhyfjajbjxwe`), région `eu-west-1`.
Le frontend n'est pas encore connecté et le schéma métier n'est pas encore appliqué. Les données de démonstration restent actives.

## Configuration frontend
Créer les variables d'environnement suivantes dans l'environnement d'exécution (ne jamais committer de clé secrète) :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

La clé publishable est prévue pour le navigateur avec RLS correctement activé. Ne jamais exposer `service_role` ou une clé secrète Supabase côté client.

## Développement
```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

## Limites connues
- L'interface utilise encore des données locales de démonstration.
- L'authentification réelle et la persistance des modules ne sont pas encore branchées.
- Les QR physiques, les sessions de table et PayDunya ne sont pas encore livrés.
- Aucun secret Supabase n'est requis pour construire la version de démonstration.

## Principes
1. Garder ce dépôt indépendant de `Pozytyf/restomax_d-mo`.
2. Ne jamais contourner RLS depuis le navigateur.
3. Garder les données de démonstration identifiables comme fictives.
4. Ne jamais publier en production sans validation explicite.
