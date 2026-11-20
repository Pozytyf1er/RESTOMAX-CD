# Resto’MAX — Plan de livraison technique

Une fonctionnalité n'est considérée comme terminée qu'après validation métier, tests automatisés, contrôle d'intégration et preuve sur le SHA exact.

## Références
- Charte Midnight & Orange, Inter, Lucide Outline, WCAG 2.2 AA.
- Maquettes Stitch validées comme référence des écrans.
- Français, XOF (FCFA), fuseau Africa/Abidjan.
- Dépôt : Pozytyf/restomax-core, branche main.
- Dépôt Pozytyf/restomax_d-mo réservé à AI Studio.
- PayDunya modèle B, compte propre à chaque restaurant, mode TEST uniquement.
- Aucun déploiement Production sans autorisation distincte.

## Phases
| Phase | Périmètre | État |
|---|---|---|
| P0-P9 | Interface, commandes, cuisine/bar, menu, QR, réservations, stocks, finance, équipe et Super-admin | Partiel — plusieurs flux restent en mémoire et les intégrations réelles sont à faire |
| P10 | Auth Supabase, PostgreSQL, RLS, isolation multi-tenant et persistance | En cours — projet dédié créé; intégration frontend et migrations à valider |
| P11 | Abonnements, facturation SaaS, support et intégrations | Partiel — écrans de démonstration; facturation et accès effectifs absents |

## Portes de certification
1. G0 — Schéma PostgreSQL versionné et contraintes métier.
2. G1 — RLS activé sur toutes les tables exposées, avec tests d'isolation A/B.
3. G2 — Auth réelle, invitation employés, suspension et révocation de sessions.
4. G3 — Opérations transactionnelles, idempotence et journal d'audit.
5. G4 — Persistance et intégrité de chaque module.
6. G5 — CI sur SHA exact : typecheck, tests et build tous verts.
7. G6 — Preview et tests navigateur responsive.
8. G7 — QR physique, sessions sécurisées et PayDunya TEST.
9. G8 — Validation métier finale avant toute activation Production.

Aucun déploiement n'est effectué dans cette phase.
