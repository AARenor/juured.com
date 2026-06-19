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
