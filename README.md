# estprop

**Estonian property decisions, not listings.**

🔗 **Live demo:** [https://estprop.vercel.app](https://estprop.vercel.app)

Type any Estonian address. Get the data kv.ee doesn't show you. Built entirely on free, no-auth public Estonian open-data APIs.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** (dark UI)
- **MapLibre GL JS** + OpenStreetMap basemap (v1) — Maa-amet orthophoto (v2)
- **proj4** for EPSG:3301 (Estonian Lambert 1996) → WGS84 transforms
- Zero backend — all data fetched directly from public APIs in the browser

## Live data sources (all free, no auth)

| # | Source | Used for |
|---|---|---|
| 1 | [In-AKS](https://aks.geoportaal.ee/inaks/inaadress/gazetteer) (`?address=…`) | Address autocomplete + resolve to WGS84 |
| 2 | [Estonian Cadastre API](https://cadastrepublic.kataster.ee/api/xroad/valid/{tunnus}) | Property record: area, land use, ownership, tax value, polygon |
| 3 | [OpenStreetMap](https://www.openstreetmap.org) tiles | Basemap (v1) |
| 4 | [Maa-amet WMS](https://kaart.maaamet.ee/wms/fotokaart) | Orthophoto (v2 — pre-render needed) |

See [DATA_SOURCES.md](DATA_SOURCES.md) for the full 50-source catalog covering schools, environment, energy, planning, etc.

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3010
```

Try typing `Viljandi mnt 47` in the search bar, or click the example tunnus `78401:001:0215`.

## Build for production

```bash
npm run build
npm start
```

## Project layout

```
src/
  app/
    layout.tsx     # root + globals
    page.tsx       # main page: search + map + property card
    globals.css
  components/
    AddressSearch.tsx  # In-AKS autocomplete dropdown
    MapView.tsx        # MapLibre + OSM
    PropertyCard.tsx   # cadastre data display
  lib/
    estdata.ts     # typed API adapters + coord transforms
  types/
    proj4.d.ts     # ambient proj4 types
PLAN.md            # 8-hour MVP build plan
DATA_SOURCES.md    # 50 free Estonian/EU data sources
```

## Roadmap (v2+)

Per [DATA_SOURCES.md §14](DATA_SOURCES.md) — the v1 dataset covers cadastral spine. Next:

- **NordAPI** wrapper (137 Estonian endpoints, single dependency)
- **EHR open-data CSV** (energy class, kasutusluba, build year)
- **Maa-amet htraru** (closed transaction prices per district)
- **EELIS / Muinsuskaitseamet** (heritage, environment, Natura 2000 overlays)
- **EHIS avaandmed** (schools)
- **Pre-rendered Maa-amet orthophoto tiles** (replace OSM basemap)
- **Tallinn/Tartu detail planeeringud** ArcGIS layers
- **Mortgage-readiness checklist** (driven by EHR + energy class + build year)

## License

Code: MIT. Data attribution: see in-app footer + [DATA_SOURCES.md](DATA_SOURCES.md).
