"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import AddressSearch from "@/components/AddressSearch";
import PropertyCard from "@/components/PropertyCard";
import { estLambertToWgs84, getCadastre, type AksAddress, type CadastreRecord } from "@/lib/estdata";

// MapLibre needs window — load dynamically client-side only
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function Home() {
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [cadastre, setCadastre] = useState<CadastreRecord | null>(null);
  const [picked, setPicked] = useState<AksAddress | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSelect(a: AksAddress) {
    setLoading(true);
    setErr(null);
    setPicked(a);
    try {
      // For a building (liik=E), look up cadastre by adob_id/ads_oid.
      // For streets/settlements, just fly to the centroid.
      let cad: CadastreRecord | null = null;
      if (a.liik === "E" || a.adob_id) {
        try {
          // The cadastre API takes a cadastral id (tunnus), not ads_oid.
          // Workaround: search Maa-amet for the tunnus, OR just call by
          // tunnus if we have one. For now, fetch by adob_id via X-Road
          // (skipped at MVP). Fall back to: search by address via the
          // ETAK WFS for cadastral id.
          // Simpler v1: store address, render map, and load cadastre in v2
          // via the WFS endpoint https://gsavalik.envir.ee/geoserver/etak/ows
        } catch {
          cad = null;
        }
      }
      setCenter([a.viitepunkt_l, a.viitepunkt_b]);
      setCadastre(cad);
    } catch (e: unknown) {
      setErr(String((e as Error)?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  // Allow direct lookup by cadastral id via URL ?tunnus=...
  async function handleTunnusLookup(tunnus: string) {
    setLoading(true);
    setErr(null);
    try {
      const c = await getCadastre(tunnus);
      setCadastre(c);
      const [lng, lat] = estLambertToWgs84(c.tsentroid_x, c.tsentroid_y);
      setCenter([lng, lat]);
    } catch (e: unknown) {
      setErr(String((e as Error)?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-line bg-panel/40 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <a href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-accent to-accent2 grid place-items-center text-bg font-bold text-sm">e</div>
            <div className="font-semibold tracking-tight">estprop</div>
            <span className="hidden sm:inline text-xs text-muted">· Estonian property decisions, not listings</span>
          </a>
          <div className="flex-1 max-w-xl ml-auto">
            <AddressSearch onSelect={handleSelect} />
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 grid lg:grid-cols-[1fr_440px] gap-6">
        {/* Map column */}
        <section className="order-2 lg:order-1 h-[60vh] lg:h-[calc(100vh-180px)] lg:sticky lg:top-[88px]">
          <MapView center={center} />
          <div className="mt-2 text-[11px] text-muted leading-relaxed">
            Basemap: © OpenStreetMap contributors. Maa-amet orthophoto (v2) will replace it
            once we pre-render Lambert → Mercator tiles. Data layers: In-AKS, Cadastre X-Road.
            Not for navigation.
          </div>
        </section>

        {/* Side column */}
        <aside className="order-1 lg:order-2 space-y-4">
          {err && (
            <div className="bg-bad/10 border border-bad/30 text-bad text-sm rounded-lg p-3">
              {err}
            </div>
          )}

          {loading && (
            <div className="bg-panel border border-line text-muted text-sm rounded-lg p-4 text-center">
              Loading…
            </div>
          )}

          {!cadastre && !loading && (
            <EmptyState onTryTunnus={handleTunnusLookup} />
          )}

          {cadastre && center && (
            <PropertyCard c={cadastre} center={center} adsOids={[cadastre.ads_oid]} />
          )}

          {picked && !cadastre && (
            <div className="bg-panel border border-line rounded-lg p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted mb-1">Address resolved</div>
              <div className="text-sm text-fg">{picked.pikkaadress}</div>
              <div className="text-xs text-muted mt-1">
                {picked.liikVal} · adr_id {picked.adr_id}
              </div>
              <div className="text-xs text-muted mt-2 font-mono">
                {picked.viitepunkt_b.toFixed(5)}, {picked.viitepunkt_l.toFixed(5)}
              </div>
              <p className="text-xs text-muted mt-3 leading-relaxed">
                We found the address. For the full cadastre record, try the
                <span className="text-fg"> tunnus lookup</span> below with a
                cadastral id like <code className="text-fg">78401:001:0215</code>.
              </p>
            </div>
          )}

          <TunnusLookup onLookup={handleTunnusLookup} />
        </aside>
      </div>

      <footer className="border-t border-line text-xs text-muted py-4 px-6 max-w-7xl mx-auto w-full">
        Built on free Estonian open data. Sources: In-AKS, Maa-amet (WMS), Cadastre X-Road.
        See <a href="https://github.com/" className="text-accent hover:underline">code</a> ·
        Not a substitute for legal or financial advice.
      </footer>
    </main>
  );
}

function EmptyState({ onTryTunnus }: { onTryTunnus: (t: string) => void }) {
  return (
    <div className="bg-panel border border-line rounded-lg p-6">
      <h2 className="text-base font-semibold mb-2">Find a property</h2>
      <p className="text-sm text-muted mb-4 leading-relaxed">
        Type any Estonian address above. We&rsquo;ll resolve it via In-AKS and show you the
        cadastral data, orthophoto map, and (soon) market context, mortgage-readiness
        checklist, and more.
      </p>
      <div className="bg-bg/60 border border-line rounded p-3 text-xs text-muted">
        <div className="font-mono text-fg mb-1">Try the famous example:</div>
        <button
          onClick={() => onTryTunnus("78401:001:0215")}
          className="text-accent hover:underline font-mono"
        >
          78401:001:0215
        </button>
        <span className="ml-2">— Viljandi mnt 47, Nõmme, Tallinn</span>
      </div>
    </div>
  );
}

function TunnusLookup({ onLookup }: { onLookup: (t: string) => void }) {
  return (
    <details className="bg-panel border border-line rounded-lg p-4 group">
      <summary className="cursor-pointer text-sm text-fg select-none">
        Or look up by cadastral id (tunnus)
      </summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = (e.currentTarget.elements.namedItem("t") as HTMLInputElement).value.trim();
          if (v) onLookup(v);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          name="t"
          placeholder="e.g. 78401:001:0215"
          className="flex-1 bg-bg border border-line rounded px-2 py-1.5 text-sm font-mono outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="bg-accent text-bg text-sm font-semibold px-3 py-1.5 rounded hover:bg-accent/90 transition"
        >
          Go
        </button>
      </form>
    </details>
  );
}
