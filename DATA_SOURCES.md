# Estonian Real-Estate Buyer Portal — Data Source Catalog (v2, expanded)

> **Scope:** Free, no-auth (or near-free, clearly licensed) Estonian + EU data sources usable in a buyer-decision-support real estate portal. The original 8 sources are at the top, the next ~40 are organized by domain.
>
> Compiled June 2026. All endpoints verified live or with documented swagger/source.
>
> Cross-references: see `PLAN.md` for the 8-hour MVP build using the v1 set; this file is the **v2/v3 backlog**.

---

## Tier legend

- 🟢🟢🟢 **essential** — core differentiator; include in v1 MVP
- 🟢🟢 **useful** — strong feature; include in v2
- 🟢 **nice** — include in v3 or as needed
- 🔴 **skip** — not worth the effort at MVP

## Table of contents

1. The 8 v1 sources (recap)
2. A) Geocoding & routing
3. B) Schools & education
4. C) Environment & risk
5. D) Energy & utilities
6. E) Demographics & socioeconomic
7. F) Prices & market data
8. G) Planning & development
9. H) Airports, roads, traffic
10. I) Heritage & natural
11. J) Satellite & aerial
12. K) Real-estate-specific extras
13. L) International / EU overlays
14. Aggregator wrappers (load-bearing dependencies)
15. Coverage gaps & caveats
16. Sources

---

## 1. The 8 v1 sources (recap)

| # | Source | Auth | What | MVP |
|---|---|---|---|---|
| 1 | **Estonian Cadastre API** `https://cadastrepublic.kataster.ee/api/xroad/valid/{id}` | None | Area, land use, ownership, tax value, polygon | 🟢🟢🟢 |
| 2 | **In-AKS gazetteer** `https://aks.geoportaal.ee/inaks/inaadress/gazetteer` | None | Address → ADS_OID + WGS84 | 🟢🟢🟢 |
| 3 | **Maa-amet WMS** `https://kaart.maaamet.ee/wms/{alus,fotokaart}` | None | Basemap, orthophotos, cadastral | 🟢🟢🟢 |
| 4 | **Maa-amet WFS** `https://gsavalik.envir.ee/geoserver/etak/ows` | None | 39 vector layers incl. buildings | 🟢🟢🟢 |
| 5 | **EHR open-data CSV** `https://swaggerui.ehr.ee` | None | Built year, energy class, kasutusluba, heat source | 🟢🟢🟢 |
| 6 | **Maa-amet htraru** `https://maaamet.ee/kinnisvara/htraru/` AJAX | None | Closed transaction prices | 🟢🟢🟢 |
| 7 | **Statistikaamet SDMX** `https://andmed.eesti.ee/sdmx-json/data/{TABLE}` | None | Dwelling price index, demographics | 🟢🟢 |
| 8 | **andmed.eesti.ee** `https://andmed.eesti.ee` | None | 8,169 open datasets discovery | 🟢🟢 |
| 9 | **Metsaregister** `https://register.metsad.ee` + WMS | None | Forest stands (for plots) | 🟢 |

**Plus optional:** logged-out kv.ee / city24.ee scrape for current asking prices (ToS does not explicitly ban logged-out listing scraping; respect robots.txt; don't republish personal data).

---

## 2. A) Geocoding & routing

### A1. In-AKS (replaces In-ADS) — 🟢🟢🟢
- `https://aks.geoportaal.ee/inaks/` (live from 27 Apr 2026; In-ADS redirects until end-2026)
- Auth: none
- Format: REST/JSON
- Use: address autocomplete, normalized address, ADS metadata (municipality, county, status)
- Sample: `GET https://aks.geoportaal.ee/inaks/api/v1/otsi?q=Tartu+mae+1`
- License: free, attribution to Maa-amet
- Gotcha: new service April 2026; In-ADS may break

### A2. ADS X-Road services — 🟢🟢
- `https://geoportaal.maaamet.ee/docs/aadress/ADSi_X-tee_teenused.pdf`
- Auth: X-Road security server (free for legal persons)
- Format: SOAP/XML over X-Road v6
- Use: bulk address change-feed, geocoding, normalization
- Gotcha: need X-Road membership; overhead for MVP

### A3. OpenStreetMap / Overpass API — 🟢🟢🟢
- `https://overpass-api.de` (public instance)
- Auth: none
- Rate limits: ~30k users/day on public instance; queries should run <10s
- Format: OverpassQL → JSON/GeoJSON
- Use: walkability, nearby schools/shops/parks/cafes/transit within radius; routing via OSRM/Valhalla
- Sample:
  ```
  [out:json][timeout:25];
  (node["amenity"="cafe"](around:500,59.437,24.753);
   node["shop"](around:500,59.437,24.753);
   node["leisure"="park"](around:1000,59.437,24.753););
  out;
  ```
- License: ODbL (attribution: "© OpenStreetMap contributors")
- Gotcha: for production self-host or use Geofabrik Estonia extract

### A4. GTFS feeds (Harju/Järva county via Transitland) — 🟢🟢🟢
- `https://www.transit.land/feeds/f-ud-jarvamaa` (and other county feeds)
- Auth: none
- Format: GTFS (CSV in ZIP)
- Use: walkability to nearest stop, transit-accessibility scoring, commute estimates
- Sample: `curl -O https://eu-gtfs.remix.com/jarvamaa.zip`
- License: free (publisher: Regionaal- ja Põllumajandusministeerium)
- Gotcha: static GTFS only; no realtime GTFS-RT for Estonia

### A5. Ühistranspordiregistri avaandmed (official transit register) — 🟢🟢
- `https://www.transpordiamet.ee/media/1339/download` (spec)
- Auth: none (data via Transpordiamet)
- Format: per spec v1.4 (CSV-like)
- Use: authoritative line/stop/route metadata
- Gotcha: no public bulk URL; need to request or use Transitland

### A6. Peatus.ee (legacy UI) — 🔴
- `https://web.peatus.ee`
- Gotcha: Transpordiamet says old apps left behind; rebuilt journey planner

### A7. OSRM public demo + Valhalla — 🟢🟢
- `https://router.project-osrm.org` (demo); self-host Valhalla with Geofabrik `estonia-latest.osm.pbf`
- Auth: none for demo (rate-limited); BSD for self-host
- Format: REST/JSON
- Sample: `curl "https://router.project-osrm.org/route/v1/driving/24.753,59.437;24.78,59.42?overview=false"`
- Gotcha: public demo is rate-limited; not for production

---

## 3. B) Schools & education

### B1. EHIS avaandmed (Estonian Education Info System open data) — 🟢🟢🟢
- `https://enda.ehis.ee/avaandmed/EHIS_avaandmed.pdf` (spec)
- CSVs at `https://enda.ehis.ee`
- Auth: none
- Format: CSV/XML
- Use: school registry (name, type, language, ownership, geo), curricula, licenses, student counts, exam results
- Sample: `curl -O https://enda.ehis.ee/avaandmed/ehis_avalik_koolid.csv`
- License: free, attribution to EHIS / HM
- Gotcha: large files; updated nightly

### B2. HaridusSilm (visualization portal for EHIS) — 🟢🟢
- `https://haridussilm.ee/en`
- Use: pre-built school-rating dashboards; "school in your area" map view
- Gotcha: UI only; back-end is EHIS

### B3. IMO Open Data portal (Tartu Univ.) — 🟢
- `https://imo.ut.ee/en/open-data-from-the-estonian-education-information-system/`
- Format: CSV/PDF/web
- Use: education research datasets
- Gotcha: research-oriented; not always current

---

## 4. C) Environment & risk

### C1. EELIS / KKR WFS (Estonian Nature Information System) — 🟢🟢🟢
- `https://gsavalik.envir.ee/geoserver/eelis/ows`
- Auth: none
- Format: WFS (GML/GeoJSON), WMS (raster)
- Use: Natura 2000, protected species, nature reserves, karst, hunting districts
- Sample: `https://gsavalik.envir.ee/geoserver/eelis/ows?service=WFS&version=2.0.0&request=GetFeature&typeName=eelis:kaitsealad&outputFormat=application/json`
- License: free, attribution to Keskkonnaagentuur
- Gotcha: bulk commercial use may require signed agreement (https://keskkonnaagentuur.ee/kratt)

### C2. Keskkonnaportaal avaandmete kataloog — 🟢🟢
- `https://keskkonnaportaal.ee/et/avaandmed`
- Use: air quality, water bodies, Natura 2000, monitoring stations
- Gotcha: mostly discovery portal

### C3. Copernicus Data Space Ecosystem (Sentinel-1/2/3) — 🟢🟢
- `https://dataspace.copernicus.eu` + APIs at `https://dataspace.copernicus.eu/analyse/apis`
- Auth: free account (CDSE)
- Format: STAC, OpenEO, Sentinel Hub REST, OGC, S3
- Use: free Sentinel-2 imagery (10m multispectral) for vegetation, change detection, roof/green-space
- License: free, Copernicus licence
- Gotcha: image processing pipeline is non-trivial; use Sentinel Hub Statistical API for pixel stats

### C4. ESTHub (Estonian national Sentinel/Landsat hub) — 🟢🟢
- `https://geoportaal.maaamet.ee/eng/overview-of-esthub-satellite-images-web-map-p972.html`
- Use: pre-cached Sentinel + Landsat-8 tiles clipped to Estonia

### C5. Eesti Geoloogiateenistus WMS/WFS (geology, soil, radon) — 🟢🟢🟢
- `https://www.egt.ee/maapouealane-teave/geoloogilised-andmed/ruumiandmed-ja-kaardid`
- Auth: none
- Use: geological base map 1:50,000, borehole data, **radon risk map** (North Estonian Klint = high radon)
- License: free, attribution to EGT
- Gotcha: not all layers populated; check service list

### C6. Radon risk map (PDF) — EGT — 🟢🟢
- `https://www.egt.ee/en/fields-activity-and-objectives/geology-and-environment/natural-radon-risk`
- Format: PDF 1:500,000
- Gotcha: coarse scale; for parcel-level do point-in-polygon

### C7. Eurostat GISCO / Data — 🟢🟢
- `https://ec.europa.eu/eurostat/web/gisco` + data API
- Format: WMS, WFS, shapefile, GeoJSON, SDMX
- Use: EU-wide NUTS regions, housing price index, population grid 1km²

### C8. Kliimaministeeriumi haldusala GeoServer — 🟢
- `https://keskkonnaportaal.ee/et/avaandmed/geoserver`
- Use: climate data, environmental monitoring

---

## 5. D) Energy & utilities

### D1. Volton Public Data API — Elering/NordPool/ENTSO-E wrapper — 🟢🟢
- `https://public-data.volton.energy/`
- Auth: none
- Format: JSON
- License: CC-BY-4.0
- Use: real-time spot price, balancing energy, imbalance, grid frequency
- Sample: `curl https://public-data.volton.energy/v1/day-ahead`
- Gotcha: best-in-class free wrapper; doc page lists exact endpoints

### D2. Elering Estfeed Datahub (X-Road) — 🟢🟢
- `https://elering.ee/en/electricity-data-exchange`
- Auth: X-Road member
- Use: most detailed grid data
- Gotcha: not for prototyping; use Volton for v1

### D3. Elektrilevi rikkekaart (outage map) via NordAPI — 🟢🟢🟢
- Web: `https://rikkekaart.elektrilevi.ee`
- API: `https://nordapi.ee/docs/estonia/ee-power-outages`
- Auth: none (via NordAPI)
- Use: real-time + planned power outages by area
- Sample: `GET https://nordapi.ee/api/estonian-power/outages?area_id=Tallinn`
- Gotcha: source is internal geoserver; use NordAPI as abstraction

### D4. District heating areas (Konkurentsiamet / NER ArcGIS) — 🟢🟢🟢
- `https://services3.arcgis.com/JRDYwqPPUAnbbdBO/arcgis/rest/services/NER/FeatureServer/15`
- Auth: none
- Format: ArcGIS REST / GeoJSON
- Use: "is this property in the district heating zone?"
- Sample: `curl "https://services3.arcgis.com/JRDYwqPPUAnbbdBO/arcgis/rest/services/NER/FeatureServer/15/query?where=1%3D1&outFields=*&f=geojson"`

### D5. Tallinna Küte / Utilitas coverage maps — 🟢
- `https://utilitas.ee` (web only); no public API
- Use: operator-specific service areas
- Gotcha: no standardized API; use Konkurentsiamet NER as canonical

### D6. Tallinna Vesi (water & sewer) coverage — 🟢
- `https://tallinnavesi.ee/en/water-consumer/public-water-supply-and-sewer-system`
- Gotcha: no public network map; "boundary drawing" is per-customer

---

## 6. E) Demographics & socioeconomic

### E1. Statistikaamet 1km × 1km population grid — 🟢🟢🟢
- `https://metadata.geoportaal.ee/geonetwork/inspire/api/records/21615a0b-0bbc-4d9d-a0b8-cf57bf2f4e30`
- Format: GeoTIFF / shapefile (INSPIRE)
- Use: population density per 1km² — "is this quiet or busy?"
- Gotcha: based on 2011 census

### E2. Statistikaamet Spatial Data — 🟢🟢🟢
- `https://stat.ee/en/find-statistics/spatial-data`
- PxWeb: `https://andmed.stat.ee/api/v1/en/...`
- Use: population, age, income, education, employment by municipality

### E3. Töötukassa daily unemployment stats — 🟢🟢
- `https://www.tootukassa.ee/en/statistics-and-research/main-statistical-indicators/registered-unemployed`
- Format: CSV per day per county per municipality
- Gotcha: "registered unemployed" only — not labour-force survey

### E4. Eesti Pank Statistics — 🟢🟢
- `https://www.eestipank.ee/en/statistics`
- Format: SDMX, Excel
- Use: housing loans, mortgage rates, household credit

### E5. EMTA e-MTA (Tax & Customs Board) — land tax — 🟢🟢
- `https://www.emta.ee/en/private-client/taxes-and-payment/other-taxes/land-tax`
- 2026 rates: `https://www.riigiteataja.ee/akt/428062025009`
- Gotcha: personal calculation requires e-MTA login

---

## 7. F) Prices & market data

### F1. Statistikaamet Dwelling Price Index (DPI/OOHPI) — 🟢🟢🟢
- `https://www.stat.ee/en/metadata/20412`
- Use: official quarterly price index
- Sample: `https://andmed.stat.ee/api/v1/en/stat/.../KM0220`
- Gotcha: index not absolute prices; pair with F2

### F2. Maa-amet htraru (real-estate transactions) — 🟢🟢🟢
- `https://maaamet.ee/kinnisvara/htraru/`
- (See v1 set.)

### F3. KVHub transaction feed (kvhub.ee) — 🟢🟢
- `https://kvhub.ee/en/transaction-feed`
- Auth: account + paid subscription
- Gotcha: this is what your MVP competes with

### F4. Estiq Value (estiq.ee) — automated valuation methodology — 🟢🟢
- `https://estiq.ee/value/methodology?lang=en`
- Auth: none for methodology; paid for API
- Gotcha: worth reverse-engineering their methodology

### F5. ECB RESR + BIS via FRED — 🟢
- `https://data.ecb.europa.eu/data/datasets/RESR/RESR.Q.EE._T.N._TR.TVAL.4D0.TB.N.IX`
- `https://fred.stlouisfed.org/data/QEEN628BIS`
- Use: international comparison

### F6. Swedbank / SEB / LHV housing market reports — 🟢🟢
- `https://blog.swedbank.ee` and SEB/LHV equivalents
- Format: PDF
- Gotcha: do not republish commentary; PDF parse for stats only

---

## 8. G) Planning & development

### G1. Tallinna planeeringute register (TPR) — 🟢🟢🟢
- `https://www.tpr.tallinn.ee/`
- Auth: none (web); Tallinn ID for full
- Use: detail planeeringud by address / cadastral ID
- Gotcha: UI only; no public bulk API

### G2. Tallinn detail planeeringud — ArcGIS REST — 🟢🟢🟢
- `https://gis.tallinn.ee/arcgis/rest/services/detailplaneeringud`
- Auth: none
- Format: ArcGIS REST / FeatureServer
- Sample: `https://gis.tallinn.ee/arcgis/rest/services/detailplaneeringud/Detailplaneeringud/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson`

### G3. Tallinn avaandmed (city open-data universal API) — 🟢🟢🟢
- `https://avaandmed.tallinn.ee/`
- Auth: none
- Format: REST (`/data/`)
- Sample: `GET /data/?table=linnaosad&columns=*&per_page=100`
- Use: district boundaries, demographics, traffic counts, building permits, school catchment

### G4. Tartu Planeeringud (ArcGIS REST) — 🟢🟢
- `https://gis.tartulv.ee/arcgis/rest/services/Planeeringud`
- `https://gis.tartulv.ee/arcgis/rest/services/IT/YP2040_Maakasutus_ja_Ehitus_avaandmed/FeatureServer`
- Gotcha: folder structure; browse for detailplaneeringud layer

### G5. Pärnu planeeringud — 🟢
- Pärnu linn website; ArcGIS not as public
- Gotcha: less standardized than Tallinn/Tartu

### G6. Tallinn building permits (Ehitisregister) — 🟢🟢🟢
- See EHR in v1 set.

---

## 9. H) Airports, roads, traffic

### H1. Transpordiamet traffic counts (Liiklussagedus) — 🟢🟢
- `https://transpordiamet.ee/en/roads-waterways-airspace/traffic-management/traffic-volumes`
- `https://www.transpordiamet.ee/liiklussagedus`
- Format: CSV/XLSX/WFS
- Use: 118 stationary + ~900 short-term traffic census points — "how busy is the road in front of this house?"
- Gotcha: 4-year census cycle

### H2. Smart Road (Tark Tee) DATEX II — 🟢🟢
- `https://imo.ut.ee/en/smart-road-tark-tee-open-data/`
- Format: DATEX II XML
- Use: real-time traffic safety events, road weather
- Gotcha: complex format; consider NordAPI wrapper

### H3. NordAPI Estonian Roads wrapper — 🟢🟢🟢
- `https://nordapi.ee/docs/estonia/ee-traffic-flow` + `/estonian-roads/services`
- Use: real-time traffic flow from 113 detector stations (vehicles + heavy vehicles + speed, both directions, every 15 min) + 40+ map layers (cameras, weather, bikeways, bridges, parking)
- Sample: `GET https://nordapi.ee/api/estonian-roads/traffic?limit=100`

### H4. Tallinn Airport — no public API
- `https://www.tallinn-airport.ee` (web only)
- Paid alternatives: Aviation-Edge, Cirium FlightStats, OAG
- Gotcha: Flightradar24 / Flightera free but TOS-restricted

### H5. Ferry events (praamid.ee) — 🟢
- `https://praamid.ee` (web); via NordAPI
- Use: Saaremaa/Hiiumaa ferry schedule for island property searches

---

## 10. I) Heritage & natural

### I1. Muinsuskaitseamet cultural monuments (WFS via Maa-amet) — 🟢🟢🟢
- `https://metadata.geoportaal.ee/geonetwork/srv/api/records/d715ac73-daa4-41d8-825a-11c55742e390`
- Format: WFS (GML/GeoJSON); update weekly
- Use: 12,569 protected cultural monuments; "is this property in a heritage zone"
- Sample: `https://gsavalik.envir.ee/geoserver/eelis/ows?service=WFS&version=2.0.0&request=GetFeature&typeName=eelis:muinsuskaitse`

### I2. NordAPI Monuments wrapper — 🟢🟢
- `https://nordapi.ee/docs/estonia/ee-monuments`
- Use: REST wrapper, filter by county/type/protection level
- Sample: `GET /estonian-monuments?county=Harju&type=architecture`

### I3. Natura 2000 / nature reserves (EELIS) — 🟢🟢
- `https://geoportaal.maaamet.ee/eng/overview-of-nature-conservation-natura-2000-web-map-p996.html`

---

## 11. J) Satellite & aerial

### J1. Sentinel-2 via Copernicus Data Space — 🟢🟢
- `https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions/sentinel-2`
- Auth: free account
- Format: JPEG2000 / GeoTIFF / STAC
- Sample: STAC search at `https://catalogue.dataspace.copernicus.eu/stac/`
- Use: 10m multispectral, 5-day revisit; NDVI, change detection

### J2. Maa-amet orthophotos — 🟢🟢🟢
- `https://geoportaal.maaamet.ee/eng/spatial-data/orthophotos/download-orthophotos-p662.html`
- WMS: `https://kaart.maaamet.ee/wms/`
- Use: 0.16-0.4m national orthophotos, historical series

### J3. OpenAerialMap — 🔴
- `https://openaerialmap.org`
- Gotcha: thin in Estonia (Maa-amet dominates)

### J4. ESRI Wayback / World Imagery — 🟢
- `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer`
- Gotcha: non-commercial free tier; commercial license required

---

## 12. K) Real-estate-specific extras

### K1. e-kinnistusraamat (land register public portal) — 🟢🟢🟢
- `https://kinnistusraamat.rik.ee/abiinfo.aspx?lang=Eng`
- `https://www.rik.ee/en/e-land-register/e-land-register-portal`
- Auth: none for general data; ID-card / Mobiil-ID for full data + certified extracts
- Format: HTML; X-Road/SOAP for bulk
- Use: ownership, encumbrances, mortgages, servitudes, easements, restrictions — **the most authoritative source**
- Gotcha: bulk programmatic access requires X-Road

### K2. Äriregister / e-Business Register (korteriühistu lookup) — 🟢🟢🟢
- `https://ariregister.rik.ee` (search)
- Open data: `https://avaandmed.ariregister.rik.ee/en`
- Use: look up korteriühistu — registry code, board, address, financial reports, tax debt
- Sample: `https://ariregister.rik.ee/eng?search=tedre+27`
- Gotcha: Korteriühistuseadus (1995) governs legal form

### K3. e-äriregistri avaandmed (Business Register open-data APIs) — 🟢🟢
- `https://avaandmed.ariregister.rik.ee/en/open-data-api/`
- Auth: X-Road
- Services: `arireg.lihtandmed_v2`, `arireg.detailandmed_v2`, `arireg.dokumendid_v1`, `arireg.ettevotjaRekvisiidid_v1`, `arireg.klassifikaatorid_v1`
- Use: bulk batch lookups of korteriühistu data

### K4. Notary Fees Act (NotTS) — 🟢🟢
- `https://www.riigiteataja.ee/akt/NotTS`
- Use: mandatory state fee schedule for notary services
- Gotcha: changes periodically; use Riigi Teataja always-fresh version

### K5. Notarite Koda fee calculator — 🟢
- `https://www.notar.ee/et/teabekeskus/notari-tasu-kalkuleerimine`

### K6. Land tax rates by municipality (2026) — 🟢🟢
- `https://www.riigiteataja.ee/akt/428062025009`
- Use: per-municipality maamaksumäärad

### K7. Kataster X-Road services — 🟢🟢
- `https://www.kataster.ee/avaandmed/x-teeapi-teenused`
- Use: bulk cadastral queries

---

## 13. L) International / EU overlays

### L1. Eurostat SDMX API — 🟢🟢
- `https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access`
- Format: SDMX 2.1 / 3.0
- Use: EU-wide HPI, demographics, regional stats at NUTS 3

### L2. OECD Data Explorer + Regional Well-Being — 🟢
- `https://data-explorer.oecd.org` + `https://www.oecdregionalwellbeing.org/`
- Use: 467 regions × 11 topics; 2 Estonian NUTS 3 regions covered
- Gotcha: regional coverage is coarser

### L3. Numbeo — 🔴 for MVP
- `https://www.numbeo.com/common/api.jsp`
- Auth: API key (paid for commercial)
- Gotcha: paid for commercial use; TOS restrictive

### L4. OpenStreetMap / Overpass — see A3

---

## 14. Aggregator wrappers (load-bearing dependencies)

### N1. NordAPI (137 Estonian endpoints, no auth) — 🟢🟢🟢
- `https://nordapi.ee`
- **Coverage** (137 endpoints): weather, parliament, **power grid**, statistics, transport, **geocoding**, legislation, roads, health, **power outages**, utilities, **575 traffic cameras**, RIHA, elections, border queues, **12,569 monuments**, 1,008 cemeteries, 4,161 sports facilities, 248 ports, 70 museums, 523 qualifications, webcams, 1,654 navigational marks, 127,000+ trademarks, 19,000+ researchers, state auctions, environmental monitoring, geology, **17,420 spatial plans**, 22,452 medical devices, **209 parking zones**, andmed.eesti.ee catalog, Tallinn living guide, **TLT Tallinn transit live positions + GTFS**, envir.ee GeoServer WFS→GeoJSON, praamid.ee ferry events, Äriregister company search, EKI dictionary, PlutoF biodiversity
- License: free; check TOS for commercial
- Gotcha: third-party community wrapper; do due-diligence on uptime SLA
- **Strategic:** this single wrapper covers ~70% of the "nice-to-have" features for v1; treat as load-bearing dependency

### N2. Volton Public Data (CC-BY-4.0) — see D1
Best free electricity-market data source.

### N3. RIA Andmete teabevärav — 🟢🟢
- `https://abi.ria.ee/teabevarav`
- Use: national data catalog discovery

### N4. andmed.eesti.ee (8,169 datasets catalog) — 🟢🟢🟢
- `https://andmed.eesti.ee` + API at `https://andmed.eesti.ee/api/dataset-docs/`
- Auth: none
- Format: OpenAPI 3.0 catalog
- **Strategic:** single-pane-of-glass discovery for "what data does the Estonian state have"

---

## 15. Coverage gaps & caveats (be honest)

1. **Realtime GTFS-RT**: Estonia has static GTFS but no public real-time feed. NordAPI exposes TLT live positions; for other counties you scrape or use scheduled-only data.
2. **Korteriühistu financials**: Äriregister gives PDFs of annual reports. No structured API for board meetings, renovation history, debts beyond what's in the report.
3. **Crime data by neighborhood**: Not openly available at parcel/area level in Estonia. Statistikaamet has county-level only.
4. **Flooding (except KKR)**: Estonia has flood-risk layer inside EELIS; EU Floods Directive (2007/60) maps are also there. Kliimaministeerium may have more, but no public REST endpoint — WFS only.
5. **Building energy performance certificates (EPC)**: Theoretically in the energy performance certificate register, but no public bulk access found. Buildings built after 2009 have a class on the EHR open data — partial.
6. **Soil contamination / polluted sites**: Mostly in EELIS but not always a single WFS layer; check `eelis:saastunud` or contact Kliimaministeerium.
7. **Tallinn Airport flight data**: No public free API. Aviation-Edge / Cirium / OAG are paid. Flightradar24 scraping is TOS-restricted.
8. **Medical facility access / doctors per capita**: Statistikaamet at municipality level only; no GIS.
9. **Webcam imagery**: NordAPI exposes ~575 cameras across Estonia (roads, weather, border queues). Good for "live street view" feature.
10. **Pärnu / Narva / smaller cities planning**: Tallinn + Tartu have well-structured ArcGIS; Pärnu and others are more variable.

---

## 16. Tiered v1/v2/v3 priority

### 🟢🟢🟢 ESSENTIAL for v1 (add to your 8)
1. **NordAPI** (N1) — single wrapper covers most
2. **Volton Public Data** (D1) — electricity market
3. **EELIS / KKR WFS** (C1) — environment, Natura 2000
4. **In-AKS** (A1) — address gazetteer
5. **e-kinnistusraamat** (K1) — land register
6. **Äriregister** (K2) — korteriühistu lookups
7. **EHIS avaandmed** (B1) — schools
8. **EGT WMS/WFS** (C5) — geology + radon
9. **Statistikaamet spatial data** (E2) — demographics
10. **Tallinn avaandmed** (G3) — city open data
11. **OSM Overpass** (A3) — POIs around property
12. **EHR / Ehitisregister** (already in your 8)
13. **Elektrilevi outage map via NordAPI** (D3)
14. **Töötukassa unemployment** (E3)

### 🟢🟢 USEFUL for v2
- Transitland GTFS (A4) — commute scoring
- Transpordiamet Liiklussagedus (H1) — traffic noise
- Copernicus Sentinel (C3) — vegetation/change detection
- Eesti Pank statistics (E4) — mortgage context
- ECB / BIS housing index (F5) — international context
- Notary Fees Act (K4) — closing cost calc
- Muinsuskaitseamet WFS (I1) — heritage overlay
- KvHub / estiq (F3, F4) — commercial price benchmarks
- Smart Road DATEX II (H2) — real-time traffic
- Konkurentsiamet NER heating (D4) — district heating zone
- Eesti Geoloogiateenistus radon (C6)
- Tartu Planeeringud (G4)
- TPR Tallinn (G1, G2)
- andmed.eesti.ee catalog (N4)
- IMO open data (A5, B3, H2)

### 🟢 NICE (v3+ or differentiation)
- OECD regional well-being (L2)
- Numbeo (L3) — only if you have commercial budget
- Flight data (H4) — airport-noise
- Ferry events (H5) — island properties
- Praamid.ee (H5)

### 🔴 SKIP for MVP
- OpenAerialMap (J3) — sparse Estonia coverage
- Peatus.ee web scraping (A6) — use GTFS instead

---

## 17. Sources (numbered, one-line gist)

1. NordAPI docs — 137 free no-auth Estonian endpoints (https://nordapi.ee/docs)
2. Volton Public Data API — CC-BY-4.0 electricity market JSON (https://public-data.volton.energy/)
3. peatus.ee KKK / Transpordiamet — old planner replaced; new transit GTFS on Transitland
4. ADS X-tee services spec
5. OpenStreetMap License / Use Cases
6. Overpass API docs
7. Transitland Estonian GTFS feeds
8. EHIS open data PDF + IMO mirror
9. Keskkonnaagentuur KRATT — EELIS WFS info
10. EELIS public OGC WFS metadata
11. Keskkonnaportaal avaandmed catalog
12. Copernicus Data Space APIs + S3 docs
13. ESTHub overview
14. EGT geological WMS/WFS guide
15. EGT natural radon risk
16. Eurostat SDMX API docs
17. Volton market data overview
18. NordAPI Power Outages Estonia
19. Elektrilevi rikkekaart
20. Konkurentsiamet NER district heating layer
21. Utilitas + Gradyent partnership
22. Tallinna Vesi public water supply page
23. Statistikaamet 1km × 1km population grid INSPIRE metadata
24. Statistikaamet spatial data
25. Töötukassa registered unemployed
26. EMTA land tax page
27. Riigi Teataja 2026 maamaksumäärade määrus
28. Statistikaamet Dwelling Price Index metadata
29. Swedbank / KvHub / Estiq housing analyses
30. Tallinna planeeringute register + ArcGIS
31. Tallinn avaandmed universal API
32. Tartu Planeeringud ArcGIS
33. Transpordiamet traffic volumes
34. NordAPI Estonian Traffic Flow + Road Services
35. Tallinn Airport flight data providers
36. INSPIRE Kultuurimälestiste register WFS metadata
37. NordAPI Cultural Monuments Estonia; Maa-amet/Muinsuskaitseamet integration news
38. e-kinnistusraamat portal
39. Korteriühistuseadus + Riigi Teataja
40. e-äriregistri avaandmed X-tee APIs
41. Notary Fees Act (NotTS) at Riigi Teataja
42. OECD Data Explorer + Regional Well-Being
43. Numbeo Data API + License
44. andmed.eesti.ee dataset API
