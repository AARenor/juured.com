"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import AddressSearch from "@/components/AddressSearch";
import PropertyCard from "@/components/PropertyCard";
import {
  estLambertToWgs84,
  getBuilding,
  getCadastre,
  searchAddresses,
  type AksAddress,
  type CadastreRecord,
  type EhrBuilding,
} from "@/lib/estdata";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function Home() {
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [cadastre, setCadastre] = useState<CadastreRecord | null>(null);
  const [ehr, setEhr] = useState<EhrBuilding | null>(null);
  const [ehrLoading, setEhrLoading] = useState(false);
  const [ehrAttempted, setEhrAttempted] = useState(false);
  const [ehrError, setEhrError] = useState<string | null>(null);
  const [picked, setPicked] = useState<AksAddress | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Chain: pick an address → if it's a building (liik=E), look up cadastre
  // by adob_id via the EHR API (which exposes adsOid), then the cadastral
  // record by tunnus from the building.
  async function handleSelect(a: AksAddress) {
    setLoading(true);
    setEhrLoading(true);
    setEhrAttempted(false);
    setErr(null);
    setEhrError(null);
    setPicked(a);
    setEhr(null);
    setCadastre(null);
    setCenter([a.viitepunkt_l, a.viitepunkt_b]);

    // For buildings (liik=E), tunnus is the EHR code. We must fetch EHR
    // first to discover the cadastre join key (katastritunnus). For
    // non-buildings, we don't have a direct cadastre join — only show
    // the address and map.
    if (a.tunnus && a.liik === "E") {
      setEhrAttempted(true);
      try {
        const b = await getBuilding(a.tunnus);
        setEhr(b);
        const ktunnus = b?.katastriyksused[0]?.katastritunnus;
        if (ktunnus) {
          try {
            const cad = await getCadastre(ktunnus);
            setCadastre(cad);
            const [lng, lat] = estLambertToWgs84(cad.tsentroid_x, cad.tsentroid_y);
            setCenter([lng, lat]);
          } catch (e) {
            // Cadastre lookup failed — non-fatal, we still have EHR data
            const msg = (e as Error)?.message ?? String(e);
            setErr(`Cadastre: ${msg}`);
          }
        }
      } catch (e) {
        const msg = (e as Error)?.message ?? String(e);
        setEhrError(msg);
      } finally {
        setEhrLoading(false);
      }
    } else {
      setEhrLoading(false);
    }

    setLoading(false);
  }

  async function handleTunnusLookup(input: string) {
    setLoading(true);
    setEhrLoading(true);
    setEhrAttempted(false);
    setErr(null);
    setEhrError(null);
    setPicked(null);
    setEhr(null);
    setCadastre(null);

    // Detect input type: cadastral id has colons, EHR code is all digits
    const isCadastral = input.includes(":");
    let ehrCode: string | null = null;
    let cadastralId: string | null = null;

    if (isCadastral) {
      cadastralId = input;
    } else {
      ehrCode = input;
    }

    try {
      // Fetch EHR first if input is ehr_code (gives us the cadastre join key)
      if (ehrCode) {
        setEhrAttempted(true);
        try {
          const b = await getBuilding(ehrCode);
          setEhr(b);
          if (b?.katastriyksused[0]?.katastritunnus) {
            cadastralId = b.katastriyksused[0].katastritunnus;
          }
          // If we don't have cadastral join, try In-AKS to get map coords
          // by searching the building's address
          if (!cadastralId && b?.taisaadress) {
            try {
              const r = await searchAddresses(b.taisaadress);
              const ehitise = r.find((x) => x.tunnus === ehrCode);
              if (ehitise) {
                setCenter([ehitise.viitepunkt_l, ehitise.viitepunkt_b]);
                setPicked(ehitise);
              }
            } catch {}
          }
        } catch (e) {
          setEhrError((e as Error)?.message ?? String(e));
        } finally {
          setEhrLoading(false);
        }
      } else {
        setEhrLoading(false);
      }

      if (cadastralId) {
        const c = await getCadastre(cadastralId);
        setCadastre(c);
        const [lng, lat] = estLambertToWgs84(c.tsentroid_x, c.tsentroid_y);
        setCenter([lng, lat]);
      }
    } catch (e) {
      setErr((e as Error)?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
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

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 grid lg:grid-cols-[1fr_480px] gap-6">
        <section className="order-2 lg:order-1 h-[60vh] lg:h-[calc(100vh-180px)] lg:sticky lg:top-[88px]">
          <MapView center={center} />
          <div className="mt-2 text-[11px] text-muted leading-relaxed">
            Basemap: © OpenStreetMap contributors. Building data: Ehitisregister (EHR, live).
            Cadastral: Maa-amet X-Road. Not for navigation.
          </div>
        </section>

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
            <PropertyCard
              c={cadastre}
              center={center}
              ehr={ehr}
              ehrLoading={ehrLoading}
              ehrAttempted={ehrAttempted}
              ehrError={ehrError}
            />
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
            </div>
          )}

          <TunnusLookup onLookup={handleTunnusLookup} />
        </aside>
      </div>

      <footer className="border-t border-line text-xs text-muted py-4 px-6 max-w-7xl mx-auto w-full">
        Built on free Estonian open data. v2: live EHR building data integration.
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
        Type any Estonian address above. We&rsquo;ll resolve it via In-AKS, fetch the
        cadastral record from Maa-amet, and the building record (energy class,
        kasutusluba, build year, heating) from the live Ehitisregister API.
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
      <div className="bg-bg/60 border border-line rounded p-3 text-xs text-muted mt-2">
        <div className="font-mono text-fg mb-1">Or try an office building (has energy cert):</div>
        <button
          onClick={() => onTryTunnus("120221727")}
          className="text-accent hover:underline font-mono"
        >
          120221727
        </button>
        <span className="ml-2">— Mustamäe tee 51, Tallinn</span>
      </div>
    </div>
  );
}

function TunnusLookup({ onLookup }: { onLookup: (t: string) => void }) {
  return (
    <details className="bg-panel border border-line rounded-lg p-4 group">
      <summary className="cursor-pointer text-sm text-fg select-none">
        Or look up by id (tunnus or ehr_code)
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
          placeholder="e.g. 78401:001:0215  or  120221727"
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
