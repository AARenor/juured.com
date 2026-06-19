// Estonian open-data adapters — verified live June 2026.
// No auth required for any source used at MVP.
import proj4 from "proj4";

const IN_AKS = "https://aks.geoportaal.ee/inaks/inaadress/gazetteer";
const CADASTRE = "https://cadastrepublic.kataster.ee/api/xroad/valid";

// Register Estonian Lambert 1996 (EPSG:3301) once
// Official PROJ4 string from epsg.io/3301
proj4.defs(
  "EPSG:3301",
  "+proj=lcc +lat_0=57.5175539305556 +lon_0=24 +lat_1=59.3333333333333 +lat_2=58 +x_0=500000 +y_0=6375000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"
);

export function estLambertToWgs84(x: number, y: number): [number, number] {
  const [lng, lat] = proj4("EPSG:3301", "EPSG:4326", [x, y]);
  return [lng, lat];
}

// ── EHR (Ehitisregister / Building Register) live API ─────────────────
// Verified live June 2026: livekluster.ehr.ee hosts ~14 v2/v3 microservices
// discovered by mining the swagger UI JS bundle.
// Public endpoints, no auth, returns full building record.
// Join key: ehr_code (returned by In-AKS as the address `tunnus` field)
const EHR_BUILDING = "https://livekluster.ehr.ee/api/building/v2/buildingData";

export type EhrEnergy = {
  energiaKlass: string | null;
  energiaValjastKp: string | null;
  energiaKehtibKuniKp: string | null;
  energiaKaalKasutus: string | null; // kWh/m²/year
  tarnEn: string | null; // total kWh
  tarnEnKK: string | null; // heating kWh
  kytteTyypTxt: string | null; // "kaugküte" / "elekter" / etc.
  tarnEnKKYhik: string | null;
};

export type EhrBuilding = {
  ehr_code: string;
  taisaadress: string;
  nimetus: string | null;
  seisund: string | null;
  rajatisHoone: string | null; // "H" = hoone, "R" = rajatis
  esmaneKasutus: string | null; // YYYY (kasutusluba year)
  // From ehitisePohiandmed
  ehAlustKp: string | null;     // construction start
  tubadeArv: number | null;
  ehitisalunePind: number | null; // footprint m²
  suletud_netopind: number | null; // net area m²
  mahtBruto: number | null;       // volume m³
  minKorrusteArv: number | null;
  maxKorrusteArv: number | null;
  lift: string | null;
  // From ehitiseEnergiamargised
  energy: EhrEnergy[];
  // From ehitiseTehnilisedNaitajad
  technical: { klNimetus: string; nimetus: string; lisavaartus: string | null }[];
  // Related cadastral units (join key → cadastre API)
  katastriyksused: { katastritunnus: string; taisaadress: string }[];
};

export async function getBuilding(ehrCode: string, signal?: AbortSignal): Promise<EhrBuilding | null> {
  if (!ehrCode) return null;
  const u = new URL(EHR_BUILDING);
  u.searchParams.set("ehr_code", ehrCode);
  try {
    const r = await fetch(u.toString(), {
      signal,
      headers: { Accept: "application/json" },
    });
    if (r.status === 404 || r.status === 400) return null;
    if (!r.ok) throw new Error(`EHR building API failed: ${r.status}`);
    const j = await r.json();
    return parseEhrBuilding(j);
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return null;
    // EHR may be behind Cloudflare challenge; surface error to caller
    throw e;
  }
}

function parseEhrBuilding(j: { ehitis?: Record<string, unknown> }): EhrBuilding | null {
  const e = j?.ehitis;
  if (!e || typeof e !== "object") return null;
  const andmed = (e.ehitiseAndmed ?? {}) as Record<string, unknown>;
  const pohi = (e.ehitisePohiandmed ?? {}) as Record<string, unknown>;
  const enRaw = (e.ehitiseEnergiamargised ?? {}) as { energiamargis?: unknown };
  const tehnRaw = (e.ehitiseTehnilisedNaitajad ?? {}) as { tehnilineNaitaja?: unknown };

  const en = Array.isArray(enRaw.energiamargis) ? enRaw.energiamargis : enRaw.energiamargis ? [enRaw.energiamargis] : [];

  const energy: EhrEnergy[] = (en as Record<string, unknown>[]).map((m) => {
    // pull primary heating info from energiakasutused.energiaKandja
    const kands = (m.energiakasutused as { energiaKandja?: unknown })?.energiaKandja;
    const kArr = Array.isArray(kands) ? kands : kands ? [kands] : [];
    // prefer heating (kytteLiik=KÜTE) if present, else first
    const heating = (kArr as Record<string, unknown>[]).find((k) => k.kytteLiik === "KYTE") || (kArr as Record<string, unknown>[])[0];
    return {
      energiaKlass: (m.energiaKlass as string) ?? null,
      energiaValjastKp: (m.energiaValjastKp as string) ?? null,
      energiaKehtibKuniKp: (m.energiaKehtibKuniKp as string) ?? null,
      energiaKaalKasutus: (m.energiaKaalKasutus as string) ?? null,
      tarnEn: (heating?.tarnEn as string) ?? null,
      tarnEnKK: (heating?.tarnEnKK as string) ?? null,
      kytteTyypTxt: (heating?.kytteTyypTxt as string) ?? null,
      tarnEnKKYhik: (heating?.tarnEnKKYhik as string) ?? null,
    };
  });

  const tech = Array.isArray(tehnRaw.tehnilineNaitaja)
    ? (tehnRaw.tehnilineNaitaja as Record<string, unknown>[])
    : tehnRaw.tehnilineNaitaja
      ? [tehnRaw.tehnilineNaitaja as Record<string, unknown>]
      : [];
  const technical = (tech as Record<string, unknown>[]).map((t) => ({
    klNimetus: (t.klNimetus as string) ?? "",
    nimetus: (t.nimetus as string) ?? "",
    lisavaartus: (t.lisavaartus as string) ?? null,
  }));

  // Related cadastral units — join key to cadastre API
  const katRaw = (e.ehitiseKatastriyksused ?? {}) as { ehitiseKatastriyksus?: unknown };
  const kat = Array.isArray(katRaw.ehitiseKatastriyksus)
    ? (katRaw.ehitiseKatastriyksus as Record<string, unknown>[])
    : katRaw.ehitiseKatastriyksus
      ? [katRaw.ehitiseKatastriyksus as Record<string, unknown>]
      : [];
  const katastriyksused = (kat as Record<string, unknown>[])
    .map((k) => ({
      katastritunnus: (k.katastritunnus as string) ?? "",
      taisaadress: (k.taisaadress as string) ?? "",
    }))
    .filter((k) => k.katastritunnus);

  return {
    ehr_code: (andmed.ehrKood as string) ?? "",
    taisaadress: (andmed.taisaadress as string) ?? "",
    nimetus: (andmed.nimetus as string) ?? null,
    seisund: (andmed.seisundTxt as string) ?? null,
    rajatisHoone: (andmed.rajatishoonetxt as string) ?? null,
    esmaneKasutus: andmed.esmaneKasutus != null ? String(andmed.esmaneKasutus) : null,
    ehAlustKp: (pohi.ehAlustKp as string) ?? null,
    tubadeArv: numOrNull(pohi.tubadeArv),
    ehitisalunePind: numOrNull(pohi.ehitisalunePind),
    suletud_netopind: numOrNull(pohi.suletud_netopind),
    mahtBruto: numOrNull(pohi.mahtBruto),
    minKorrusteArv: numOrNull(pohi.minKorrusteArv),
    maxKorrusteArv: numOrNull(pohi.maxKorrusteArv),
    lift: (pohi.lift as string) ?? null,
    energy,
    technical,
    katastriyksused,
  };
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ── In-AKS address search (live) ──────────────────────────────────────
// Verified: ?address=<text> returns { addresses: [...] }
// Param name is English "address" (not "aadress"). Each item has:
//   pikkaadress, ads_oid, adr_id, maakond, omavalitsus, asustusyksus,
//   liikluspind, aadress_nr, viitepunkt_l (lng), viitepunkt_b (lat)
export type AksAddress = {
  pikkaadress: string;
  ads_oid: string;
  adr_id: string;
  adob_id?: string | number | null;
  maakond: string;
  omavalitsus: string;
  asustusyksus: string;
  liikluspind: string;
  aadress_nr: string;
  viitepunkt_l: number; // WGS84 lng
  viitepunkt_b: number; // WGS84 lat
  liik: string;         // E=building, 1=county, 2=street, 3=settlement...
  liikVal: string;
  tunnus?: string;      // for buildings, this is the EHR code
  primary?: string;
};

export async function searchAddresses(q: string, signal?: AbortSignal): Promise<AksAddress[]> {
  if (!q.trim()) return [];
  const u = new URL(IN_AKS);
  u.searchParams.set("address", q);
  const r = await fetch(u.toString(), { signal, headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`In-AKS search failed: ${r.status}`);
  const j = await r.json();
  // In-AKS returns numeric fields as strings — coerce to numbers
  return (j.addresses ?? []).map((a: Record<string, unknown>) => ({
    ...a,
    viitepunkt_l: Number(a.viitepunkt_l),
    viitepunkt_b: Number(a.viitepunkt_b),
  })) as AksAddress[];
}

// ── Cadastre API (live) ────────────────────────────────────────────────
export type CadastreRecord = {
  geom: string;
  tunnus: string;
  siht1: string | null;
  siht2: string | null;
  siht3: string | null;
  so_prts1: number | null;
  so_prts2: number | null;
  so_prts3: number | null;
  registreeritud: string;
  pindala: number;
  ads_oid: string;
  aadress: string;
  hkood: string;
  kinnistu: string;
  omvorm: string;
  maks_hind: number | null;
  suletud: string | null;
  adob_id: number | null;
  tsentroid_x: number;
  tsentroid_y: number;
  tais_aadress: string;
  ["märked"]?: string | null;
};

export async function getCadastre(id: string, signal?: AbortSignal): Promise<CadastreRecord> {
  // Cadastral id format: {county}{district}:{group}:{parcel}, e.g. "78401:001:0215"
  // Reject EHR codes (all digits, no colons) — they 500 in the cadastre API
  if (!id.includes(":")) {
    throw new Error(`Not a cadastral id (no colons): ${id}. Use EHR code via getBuilding() first.`);
  }
  const r = await fetch(`${CADASTRE}/${encodeURIComponent(id)}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (r.status === 404) throw new Error("Cadastral id not found");
  if (!r.ok) throw new Error(`Cadastre API failed: ${r.status}`);
  return (await r.json()) as CadastreRecord;
}

// ── Maa-amet WMS layers (MapLibre raster source) ─────────────────────
export const MAAAMET_WMS = {
  ortho: { url: "https://kaart.maaamet.ee/wms/fotokaart", layers: "of10000" },
  base:  { url: "https://kaart.maaamet.ee/wms/alus",        layers: "MA-ALUS" },
} as const;

// ── Helpers ────────────────────────────────────────────────────────────
// Build a WMS tile URL for MapLibre raster source
export function wmsTileUrl(
  base: string,
  layer: string,
  bbox: string,
  width = 256,
  height = 256,
): string {
  const u = new URL(base);
  u.searchParams.set("service", "WMS");
  u.searchParams.set("version", "1.3.0");
  u.searchParams.set("request", "GetMap");
  u.searchParams.set("layers", layer);
  u.searchParams.set("styles", "");
  u.searchParams.set("format", "image/png");
  u.searchParams.set("transparent", "true");
  u.searchParams.set("width", String(width));
  u.searchParams.set("height", String(height));
  u.searchParams.set("crs", "EPSG:3857"); // request in Web Mercator
  u.searchParams.set("bbox", bbox);
  return u.toString();
}
