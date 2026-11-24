# DESIGN.md — DevSync (v3)

Sources (langage UI produit + landing 2025/26) :
- Product chrome dense dark : hierarchy by brightness/hairlines (Linear/Plane observed patterns), one accent only.
- Marketing : product-first, sticky canvas + scroll narrative (Graphite compact feature scroll, Vercel product tour, 2026 SaaS scroll demos). Motion serves beats, not decoration.
- Différenciation : **pas** clone Linear indigo ; accent cuivre/ambre ; display Bricolage ; landing = **reel** scroll-pin avec screenshots réels.

## Scene

Nuit bureau eng, moniteur board en focus. L’app est un **outil dense**. La landing est un **film produit** contrôlé au scroll.

## Voice

precise · kinetic · evidentiary (on montre l’UI réelle)

## Dials

| Surface | ENERGY | RHYTHM | MOTION |
| --- | --- | --- | --- |
| Landing | 3 | 3 | 3 (GSAP pin + scrub reel) |
| App | 2 | 2 | 1–2 (150–250 ms state) |

`prefers-reduced-motion` : pas de pin scrub ; sections empilées statiques avec screenshots visibles.

## Color — Committed dark product

| Token | Role |
| --- | --- |
| Canvas | Near-black froid `oklch(0.12 0.01 260)` |
| Surface | Un cran plus clair, hairlines `oklch(1 0 0 / 8–12%)` |
| Field (light mode) | Off-white chroma≈0 (pas cream) |
| Accent | Cuivre/ambre signal (CTA, sélection, live) |
| Danger / overdue | Rouge / ambre sémantiques |

Interdit : purple mesh, cream paper, border-left décoratif >1px, glow carnival.

## Type

- **UI + landing display** : Bricolage Grotesque Variable (caractère, hors Inter/Geist/Sora reflex).
- **Mono** : JetBrains Mono (clés `WEB-12`).
- Produit : texte compact 13–14px, tracking serré display.

## Motif

- Hairlines + contraste de luminosité (pas de cards flottantes).
- Sync : accent ambre sur sélection / pip actif.
- Marketing proof = **screenshots réels** `/screenshots/*.png`.

## Landing structure (obligatoire)

1. Hero dark : brand + promesse + CTAs
2. **Reel pin** (scroll storytelling) : canvas sticky, scrub GSAP, chapitres Dashboard → Board → Live/roles, screenshots réels, progress
3. Index capacités (grille dense, faits produit)
4. CTA final
5. Footer liens réels

## App

Dark-first chrome, densité utile, listes/rows, empty = cause + action. MCP secondaire.

## Design Read

Reading as: eng-team collab tool (dense dark product) + cinematic product-reel marketing, dials landing ENERGY 3 / RHYTHM 3 / MOTION 3 · app ENERGY 2 / RHYTHM 2 / MOTION 1–2.
