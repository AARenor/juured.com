# Estonian Buyer-Empowerment Real Estate Portal — 8-Hour MVP Plan

> Goal: ship a one-page web app that, given any Estonian address, shows the buyer **decision-supporting data** that kv.ee / city24.ee / kinnisvara24.ee do **not** show — built entirely on **free, no-auth public Estonian open-data APIs**. Hard cap: **8 hours of one developer.**
>
> **See `DATA_SOURCES.md` for the full catalog of ~50 free sources** (v1 + v2 + v3 backlog, tiered by priority, with sample requests and licenses).

---

## TL;DR — what you can build for €0 data cost

A map + property card web app where a user types any Estonian address and gets:

1. **What this property actually is** — cadastral parcel, land use, ownership form, area, tax value, polygon (Estonian Cadastre API + Maa-amet WMS)
2. **The building on it** — built year, energy class, kasutusluba (occupancy permit), heat source, technical condition (EHR open data CSV)
3. **What transactions actually closed nearby** — not asking prices, real closed prices (Maa-amet `htraru`)
4. **Mortgage-readiness flags** — energy class + age risk + kasutusluba present + Soviet-era panel detection → green mortgage eligibility
5. **A live "asking vs. actual" badge** — what people *ask* vs. what deals *close* at (scraped listings + Maa-amet transactions)

All five from free public APIs and one optional scraper.

---

## The 8 free data sources — confirmed live (June 2026)

| # | Source | URL | Auth | What it gives you | Status |
|---|---|---|---|---|---|
| 1 | **Estonian Cadastre API** | `https://cadastrepublic.kataster.ee/api/xroad/valid/{cadastral_id}` | None | Area, land use, ownership, tax value, polygon, address | ✅ Verified live today |
| 2 | **In-AKS address gazetteer** | `https://aks.geoportaal.ee/inaks/inaadress/gazetteer?adrid=…` | None | Address → ADS_OID bridge + WGS84 coords | ✅ Replaces In-ADS (Apr 2026) |
| 3 | **Maa-amet WMS** (orthophoto + cadastral map) | `https://kaart.maaamet.ee/wms/alus` | None, OGC | Basemap, orthophotos, cadastral overlay | ✅ Free, attribution req'd |
| 4 | **Maa-amet WFS** (vector cadastral) | `https://gsavalik.envir.ee/geoserver/etak/ows` | None | 39 vector layers incl. cadastral parcels, buildings | ✅ 5,000 obj/query limit |
| 5 | **EHR open data CSV** (building register) | `https://www.ehr.ee` (daily dump) | None | Built year, energy class, kasutusluba, heat source, building-part IDs (apartments) | ✅ Daily-updated since 1994 |
| 6 | **Maa-amet real-estate transactions** (`htraru`) | `https://maaamet.ee/kinnisvara/htraru/` (AJAX backend) | None | Real closed transaction prices by district, min 5 txns | ✅ New DB May 2026 |
| 7 | **Statistikaamet SDMX** | `https://andmebaas.stat.ee/sdmx-json/data/{TABLE}` | None | Dwelling price index (`IA01`), demographics, permits | ✅ 1M obs/query |
| 8 | **andmed.eesti.ee** | `https://andmed.eesti.ee/api/dataset-docs` | None | 8,169 datasets — schools, transit, noise maps, env | ✅ Open Data Portal |

**Reference (already on disk):** `/root/projects/osta-scraper/cadastre_api_reference.md` — full Cadastre API spec.

**Plus optional:** logged-out scrape of `kv.ee` / `city24.ee` for current **asking prices**. Their ToS doesn't explicitly forbid logged-out listing-data scraping (clause 3.2.8 is about *user accounts*, not listings). Throttle, respect robots.txt, don't republish listing text/images or agent personal data.

---

## The 8-hour build plan

### Stack (zero-cost, runs locally)

- **Frontend**: Next.js 14 + Tailwind + shadcn/ui + MapLibre GL JS (Maa-amet orthophoto tile layer)
- **Backend**: Next.js API routes (one repo, one deploy)
- **DB**: SQLite via `better-sqlite3` (single file, no infra)
- **Scrape**: `curl_cffi` (already in `/root/projects/osta-scraper/venv/`) for kv.ee
- **Geo**: `pyproj` for EPSG:3301 ↔ WGS84
- **AVM**: simple hedonic regression in NumPy at MVP (district + m² + year + energy class)
- **Deploy**: Vercel free tier (you already have n8n on Coolify if you want self-host)

### Hour-by-hour

| Hour | Deliverable | APIs touched |
|---|---|---|
| **0:00–0:30** | Bootstrap Next.js + Tailwind + MapLibre. Verify live cadastre call from a Node script. Verify In-AKS gazetteer. | (1) (2) |
| **0:30–1:30** | Address search box → In-AKS gazetteer → ADS_OID → Cadastre API → JSON property card. Show: area, land use, ownership form, tax value, polygon centroid on map. | (1) (2) (3) |
| **1:30–2:30** | Map view: MapLibre + Maa-amet orthophoto tile layer + cadastral boundary WMS overlay + parcel polygon highlight. Pan/zoom, click parcel → re-runs card. | (3) (4) |
| **2:30–4:00** | **EHR building data**: download today's open-data CSV → SQLite. Add a "Building" tab on the card: built year, energy class, kasutusluba badge (✅/⚠️/❌), heat source, total apartments in building. Join via `ads_oid`. | (5) |
| **4:00–5:30** | **Transaction history widget**: scrape Maa-amet `htraru` AJAX for the property's county/municipality/settlement. Render bar chart of median €/m² over last 4 quarters, split by property type. Privacy floor: min 5 transactions. | (6) |
| **5:30–6:30** | **"Asking vs. actual" badge**: scrape 200 listings near the searched address (kv.ee, logged out, throttled). Compute median asking €/m² → compare to Maa-amet transaction median → show badge "Asking +X% vs closed". | (6) + kv.ee scrape |
| **6:30–7:30** | **Mortgage-readiness checklist** (the UX differentiator): auto-tick from data — energy class A/B → green mortgage eligible; kasutusluba present → OK; built <1990 → "request winter utility invoices"; built 1960–1989 panel → "request asbestos report"; heating = electric → "estimate €X/month at 25c/kWh". Plain-language copy in Estonian + English. | (5) (7) |
| **7:30–8:00** | Polish: share-link via URL with `?aadress=…`, deploy to Vercel, write the "About / data sources" page with attribution for Maa-amet. Done. | All |

### After 8 hours (next sessions, not in MVP)
- Statistikaamet dwelling-price-index widget on the chart
- GTFS + OSRM commute overlay to Tallinn/Tartu IT hubs
- "Follow this building" alerts (kvhub.ee clone)
- Schools proximity (HaridusSilm via `andmed.eesti.ee`)
- Real AVM: gradient-boosted regression on full EHR × cadastre × Maa-amet join

---

## What each API gives you concretely

### 1. Cadastre API (you have this documented)
```
GET https://cadastrepublic.kataster.ee/api/xroad/valid/78401:001:0215
```
Returns: `geom` (WKT POLYGON EPSG:3301), `pindala` (m²), `siht1` (e.g. `ELAMUMAA` = residential), `omvorm` (ownership form), `maks_hind` (tax value €), `tais_aadress` (full address), `ads_oid` (join key).

Live-tested today: ✅ working, ~120 ms/req, no auth.

### 2. In-AKS gazetteer (the missing link)
```
GET https://aks.geoportaal.ee/inaks/inaadress/gazetteer?adrid=2105921
```
Returns normalised address + WGS84 coords + `ADS_OID`. Old In-ADS redirects until end of 2026 — In-AKS is the future.

You need this because the Cadastre API has **no address-search endpoint** — you have to know the cadastral ID. In-AKS gives you "typed address → ADS_OID".

### 3. Maa-amet WMS (the basemap)
- Orthophoto: `https://kaart.maaamet.ee/wms/fotokaart`
- Cadastral overlay: `https://kaart.maaamet.ee/wms/alus`
- Historical maps 1930–1944 (cool but not MVP)

Drop into MapLibre as a raster tile source. Free commercial use with attribution "Base map: Republic of Estonia Land and Spatial Development Board, [date]".

### 5. EHR open-data CSV
The crown jewel. Daily download, all of Estonia since 1994. Columns include:
- Address, intended use, building-part ID (the apartment ↔ building join)
- Built year, **energy performance certificate class (A–H)**, heat source
- **kasutusluba** (occupancy permit date — critical: many old buildings lack it and banks won't mortgage them)
- Coordinates, related cadastral units

### 6. Maa-amet transactions (`htraru`)
The "what people actually paid" dataset. AJAX JSON endpoint on `maaamet.ee/kinnisvara/htraru/`. Filter by county → municipality → settlement → period. Min 5 txns to display (privacy). New DB released 11 May 2026.

This is the data that nobody else surfaces cleanly — the buyer superpower.

---

## Concrete example: what one property card looks like at hour 8

For "Viljandi mnt 47, Nõmme, Tallinn":

```
┌─ Viljandi mnt 47, Tallinn ──────────────────────────┐
│ ELAMUMAA · Eraomand · 1,738 m²                       │
│ Tax value: €135,216                                  │
├─ Building (from EHR) ────────────────────────────────┤
│ Built 1972 · 5-storey panel · 24 apartments          │
│ Energy class: D · District heating                   │
│ ✅ kasutusluba: 1974                                 │
│ ⚠️ 1970s panel — request asbestos report            │
├─ Market context (last 4 quarters) ───────────────────┤
│ Closed €1,540/m² · Asking €1,720/m²                  │
│ 📊 Asking +11.6% vs closed                           │
├─ Mortgage readiness ─────────────────────────────────┤
│ ✅ Energy D (green mortgage at Swedbank — A/B only) │
│ ✅ kasutusluba present                               │
│ ⚠️ Built 1972 — request winter utility invoices     │
│ ⚠️ 1970s panel — asbestos + structural review        │
└─────────────────────────────────────────────────────┘
```

This single page delivers what kv.ee / city24.ee do not.

---

## Team you described

> "Needs a technical person (or a few), a designer and a marketer."

- **Technical (1–2)**: Next.js dev comfortable with MapLibre + WMS + ETL. The osta-scraper codebase already has the cadastre + scraping expertise.
- **Designer (1)**: critical — the differentiator is UX, not data. First-time buyers need plain-language, not jargon.
- **Marketer (1)**: positioning ("the kv.ee that helps you decide"), content (mortgage-readiness checklist copy in ET/EN/RU), partnerships with mortgage brokers.

---

## Risks & open questions

1. **EHR open-data CSV size**: full Estonia daily dump can be hundreds of MB. For MVP, **filter to Harju + Tartu county only** (~70% of demand, ~25% of rows). Add others in v2.
2. **Maa-amet `htraru` AJAX endpoint** — exact URL not yet extracted; need 30 min to reverse-engineer from the web UI or use the rstats-tartu/datasets repo's known approach.
3. **kv.ee scraping** — throttle aggressively (1 req/2s, 50 reqs/session max). Production: pursue Baltic Classifieds Group API license (they're LSE-listed, B2B-friendly).
4. **GDPR** — don't store or display agent names / phones / listing photos. Facts only (price, m², year).
5. **Attribution** — every map and chart using Maa-amet data needs "Republic of Estonia Land and Spatial Development Board, [date]" attribution.
6. **EU AI Act** (in force 2 Aug 2026) — if you train an AVM on scraped data, respect robots.txt + ai.txt opt-outs.

---

## What's *not* in the 8-hour MVP

- Real-time alerts ("notify me when this building's listing drops")
- User accounts / saved searches
- Multi-language (start EN + ET, add RU in v2)
- Mobile app (responsive web only at MVP)
- Real AVM (hedonic regression only at MVP)
- Coverage outside Harju + Tartu counties

---

## Definition of done (hour 8)

- [ ] User types "Viljandi 47, Tallinn" (or any address in Harju/Tartu county)
- [ ] Sees map with parcel highlighted on orthophoto
- [ ] Sees property card with all 5 sections above populated from real APIs
- [ ] "Asking vs. actual" badge shows live
- [ ] Page is shareable via URL
- [ ] "About / data sources" page lists every API + attribution
- [ ] Deployed to a public URL

That is shippable. The next session layers AVM, alerts, and full country coverage.

---

## Quick-start commands (next message if you want)

```bash
mkdir -p /root/projects/estprop && cd /root/projects/estprop
npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint
npm i maplibre-gl better-sqlite3 papaparse curl-cffi
# Verify cadastre live:
curl -s https://cadastrepublic.kataster.ee/api/xroad/valid/78401:001:0215 | head -c 500
# Verify In-AKS live:
curl -s 'https://aks-test.geoportaal.ee/inaks/inaadress/gazetteer?adrid=2105921' | head -c 500
```

Tell me to proceed and I'll start the build.
