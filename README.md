# 🌙 Rezeptbuch

Persönliches Rezeptbuch als Web-App — vegetarisch, zyklusbasiert und (in der Lutealphase) histaminarm.

## Was die App kann

- **Zyklusbasierte Rezepte** — vier Phasen (Menstruation, Follikel, Ovulation, Luteal) mit jeweils passenden Rezepten
- **Zyklustracker** — Periodenstart eintragen, aktuelle Phase wird automatisch berechnet
- **Einkaufsliste** — Zutaten aus Rezepten hinzufügen, abhaken, teilen
- **KI-Rezept-Agent** — Rezeptideen basierend auf vorhandenen Zutaten und aktueller Phase
- **PWA** — installierbar auf dem Handy als App

## Tech-Stack

- React + Vite + Tailwind CSS
- Supabase (Auth, PostgreSQL, Edge Functions)
- Anthropic API (KI-Agent)
- GitHub Pages (Hosting)

## Setup

```bash
npm install
npm run dev
```

Benötigt eine `.env`-Datei mit:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Status

🚧 In aktiver Entwicklung — persönliches Lernprojekt.
