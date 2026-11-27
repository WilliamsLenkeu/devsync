# DESIGN.md — DevSync (v5 · Milk Desk)

**Inspiré Odoo webclient « Milk » (v17+) + Material Design enterprise — pas un clone logo Odoo.**  
Remplace Phosphor Ops (v4) et cuivre (v3).

Références : [Odoo Brand Assets](https://www.odoo.com/page/brand-assets) · redesign Milk (primary CTA limité, control panel, 14px, badges) · Material surfaces / elevation / contained+outlined buttons.

## Scene

Bureau ops **clair**, grilles denses, control panel sticky, listes et boards lisibles. DevSync reste un outil collab eng — densité Odoo, pas landing cyber mint.

## Voice

clean · productive · guided (1 CTA primary clair par vue)

## Dials

| Surface | ENERGY | RHYTHM | MOTION |
| --- | --- | --- | --- |
| Landing | 3 | 3 | 3 (GSAP soft: staggers, pin léger) |
| App | 2 | 3 | 2–3 (route fade, list stagger, sheet — pas carnival) |

`prefers-reduced-motion` : skip pin/scrub/staggers.

## Color — Milk Desk (committed)

Produit **light-first** (comme Odoo UI post-purple). Teal = accent produit (équivalent rôle du secondary Odoo `#017E84` en primary UI — **pas** le mauve brand `#714B67` en chrome produit).

| Token | Role | Valeur |
| --- | --- | --- |
| Canvas / bg | Fond app | `#F8F9FA` |
| Surface | Cards, sheets, sidebar | `#FFFFFF` |
| Elevated | Menus, popovers | `#FFFFFF` + ombre Material soft |
| Hairline | Borders | `#DEE2E6` / `rgba(0,0,0,.125)` |
| Ink | Texte | `#212529` |
| Muted | Secondaire | `#8F8F8F` (gray brand Odoo) |
| **Primary** | CTA contained, sélection, tabs actifs | Teal `#017E84` |
| Primary-fg | Sur primary | `#FFFFFF` |
| Secondary btn | Outlined / filled soft | gray `#6C757D` bord + fond `#E9ECEF` |
| Success / Info / Warn / Danger | Sémantique Material-ish | green / cyan / amber / `#DC3545` |
| Dark mode (option) | Inversion soft | canvas `#1A1D21`, surface `#2B3035`, primary teal inchangé |

Interdit : purple mesh UI, mauve `#714B67` comme fill chrome dominant, mint phosphor abyss, cuivre, glow carnival, cream paper chaud.

## Type

- **UI** : Inter (comme Odoo brand) 14px base, titres 500–700 lh 1, body 400 lh 1.5.
- **Mono** : IBM Plex Mono ou JetBrains Mono pour clés techniques.
- Densité : lisible type Odoo Milk (14px), pas micro-13 cuivre.

## Layout & composants (langage Odoo)

1. **Control panel** : bandeau sous chrome — titre/breadcrumb à gauche, **peu** de boutons primary à droite, actions secondaires groupées (menu ⚙ / overflow).
2. **Boutons** : 1–2 `primary` contained max par vue ; secondary plus visibles (outlined/filled soft) ; text buttons pour hyper-secondary.
3. **Cards** : surface blanche, border légère, radius ~6–8px, elevation Material faible (1–2), pas de glass multi-shadow.
4. **Badges** : pills compactes, palette lisible (statut kanban).
5. **Tables / listes** : rows denses, hover soft gray, pas de cards pour chaque ligne.
6. **Sidebar** : claire, icônes + labels, app switcher feel ; topbar fine.
7. **Sheets / dialogs** : Material enter (GSAP scale+fade doux).

## Motion (GSAP — utile, pas déco)

- Route : fade court (~200ms).
- Listes/board : stagger léger à l’entrée.
- Dialog/sheet : enter/leave GSAP.
- Landing : staggers + scrub modéré.
- Pas de magnetic glow / wipe cyber.

## Landing

Hero clair ou soft gradient gris→blanc, brand DevSync, promesse, CTA teal, preuve board/dashboard, footer liens.

## Design Read

Reading as: Odoo-Milk-inspired Material enterprise for eng collab — light surfaces, teal guided CTAs, control-panel hierarchy, GSAP restrained, dials app ENERGY 2 / RHYTHM 3 / MOTION 2–3.
