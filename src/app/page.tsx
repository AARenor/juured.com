"use client";

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

export default function Home() {
  const [cadastre, setCadastre] = useState<CadastreRecord | null>(null);
  const [ehr, setEhr] = useState<EhrBuilding | null>(null);
  const [ehrLoading, setEhrLoading] = useState(false);
  const [ehrAttempted, setEhrAttempted] = useState(false);
  const [ehrError, setEhrError] = useState<string | null>(null);
  const [picked, setPicked] = useState<AksAddress | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSelect(a: AksAddress) {
    setLoading(true);
    setEhrLoading(true);
    setEhrAttempted(false);
    setErr(null);
    setEhrError(null);
    setPicked(a);
    setEhr(null);
    setCadastre(null);

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
          } catch (e) {
            setErr(`Cadastre: ${(e as Error)?.message ?? e}`);
          }
        }
      } catch (e) {
        setEhrError((e as Error)?.message ?? String(e));
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

    const isCadastral = input.includes(":");
    let ehrCode: string | null = null;
    let cadastralId: string | null = null;
    if (isCadastral) cadastralId = input;
    else ehrCode = input;

    try {
      if (ehrCode) {
        setEhrAttempted(true);
        try {
          const b = await getBuilding(ehrCode);
          setEhr(b);
          if (b?.katastriyksused[0]?.katastritunnus) {
            cadastralId = b.katastriyksused[0].katastritunnus;
          }
          if (!cadastralId && b?.taisaadress) {
            try {
              const r = await searchAddresses(b.taisaadress);
              const m = r.find((x) => x.tunnus === ehrCode);
              if (m) setPicked(m);
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
      }
    } catch (e) {
      setErr((e as Error)?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* ============== TOP BAR ============== */}
      <header className="border-b border-rule">
        <div className="max-w-[72rem] mx-auto px-6 sm:px-10 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <span
              aria-hidden="true"
              className="grid place-items-center w-7 h-7 bg-ink text-paper font-display text-lg leading-none"
            >
              j
            </span>
            <span className="font-display text-[19px] text-ink tracking-tight">
              juured.com
            </span>
          </a>
          <nav className="hidden sm:flex items-center gap-7 text-[13px] text-muted">
            <a
              href="https://github.com/AARenor/juured.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-ink transition-colors"
            >
              Source
            </a>
            <a
              href="https://juured.com"
              className="hover:text-ink transition-colors"
            >
              Live
            </a>
          </nav>
        </div>
      </header>

      {/* ============== MASTHEAD ============== */}
      <section className="border-b border-rule">
        <div className="max-w-[72rem] mx-auto px-6 sm:px-10 pt-16 sm:pt-24 pb-12">
          <p className="eyebrow">Estonian property decisions, not listings</p>
          <h1 className="display mt-3 text-ink max-w-prose">
            The data kv.ee doesn&rsquo;t show you,
            <span className="text-faint"> for any Estonian address.</span>
          </h1>
          <p className="mt-5 text-muted max-w-prose text-[16.5px] leading-[1.55]">
            Built from free, public Estonian open data: the address register, the
            land cadastre, and the building register. Type an address to see
            energy class, occupancy permits, and the mortgage-readiness signals
            that buyers actually need.
          </p>
          <div className="mt-12">
            <AddressSearch onSelect={handleSelect} />
          </div>
        </div>
      </section>

      {/* ============== RESULT ============== */}
      <main className="max-w-[72rem] mx-auto px-6 sm:px-10 py-14 sm:py-20">
        {err && (
          <div className="max-w-sheet mx-auto mb-10 border border-bad/30 bg-bad/[0.04] text-bad text-sm p-4">
            {err}
          </div>
        )}

        {loading && (
          <p className="text-center eyebrow text-muted">Loading…</p>
        )}

        {!cadastre && !loading && !picked && <EmptyState onTryTunnus={handleTunnusLookup} />}

        {picked && !cadastre && (
          <div className="max-w-sheet mx-auto">
            <p className="eyebrow text-muted">Address resolved</p>
            <p className="display mt-2 text-ink">{picked.pikkaadress}</p>
            <p className="mt-2 text-sm text-muted">
              {picked.liikVal}. For a full property sheet, pick a <em>building</em> from the search
              results, or look up a cadastral id below.
            </p>
          </div>
        )}

        {cadastre && (
          <PropertyCard
            c={cadastre}
            ehr={ehr}
            ehrLoading={ehrLoading}
            ehrAttempted={ehrAttempted}
            ehrError={ehrError}
          />
        )}

        <TunnusLookup onLookup={handleTunnusLookup} />
      </main>

      {/* ============== FOOTER ============== */}
      <footer className="border-t border-rule">
        <div className="max-w-[72rem] mx-auto px-6 sm:px-10 py-8 flex flex-col sm:flex-row sm:items-baseline gap-3 justify-between text-[12.5px] text-muted">
          <p>
            <span className="font-display text-ink">juured.com</span>{" "}
            · built on free Estonian open data. Not a substitute for legal or financial advice.
          </p>
          <p className="eyebrow text-faint">v2.0 · {new Date().getFullYear()}</p>
        </div>
      </footer>
    </>
  );
}

function EmptyState({ onTryTunnus }: { onTryTunnus: (t: string) => void }) {
  return (
    <div className="max-w-sheet mx-auto">
      <p className="eyebrow text-muted">Or look up by id</p>
      <div className="mt-5 grid sm:grid-cols-2 gap-6">
        <button
          onClick={() => onTryTunnus("78401:001:0215")}
          className="text-left group"
        >
          <p className="eyebrow text-faint group-hover:text-ink transition-colors">Cadastral id</p>
          <p className="mt-1 font-mono text-[15px] text-ink group-hover:text-accent transition-colors">78401:001:0215</p>
          <p className="mt-1 text-sm text-muted">Viljandi mnt 47, Nõmme, Tallinn</p>
        </button>
        <button
          onClick={() => onTryTunnus("120221727")}
          className="text-left group"
        >
          <p className="eyebrow text-faint group-hover:text-ink transition-colors">EHR building id</p>
          <p className="mt-1 font-mono text-[15px] text-ink group-hover:text-accent transition-colors">120221727</p>
          <p className="mt-1 text-sm text-muted">Mustamäe tee 51, Tallinn (has energy class)</p>
        </button>
      </div>
    </div>
  );
}

function TunnusLookup({ onLookup }: { onLookup: (t: string) => void }) {
  return (
    <details className="max-w-sheet mx-auto mt-16 group border-t border-rule pt-6">
      <summary className="cursor-pointer eyebrow text-muted hover:text-ink transition-colors list-none flex items-center gap-2">
        <span className="inline-block w-3 h-px bg-current transition-all group-open:rotate-90 origin-center" />
        Look up directly by cadastral id or EHR building id
      </summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = (e.currentTarget.elements.namedItem("t") as HTMLInputElement).value.trim();
          if (v) onLookup(v);
        }}
        className="mt-6 flex gap-3"
      >
        <input
          name="t"
          placeholder="e.g. 78401:001:0215  or  120221727"
          className="flex-1 bg-field border border-rule px-3 py-2.5 font-mono text-[14px]
                     focus:border-ink outline-none transition-colors"
        />
        <button
          type="submit"
          className="bg-ink text-paper text-[13px] font-semibold tracking-wider uppercase
                     px-5 py-2.5 hover:bg-accent transition-colors"
        >
          Go
        </button>
      </form>
    </details>
  );
}
