"use client";

import type { CadastreRecord, EhrBuilding } from "@/lib/estdata";
import { estLambertToWgs84 } from "@/lib/estdata";

type Props = {
  c: CadastreRecord;
  center: [number, number];
  ehr: EhrBuilding | null;
  ehrLoading: boolean;
  ehrAttempted: boolean;
  ehrError: string | null;
};

function LandUsePill({ siht }: { siht: string | null }) {
  if (!siht) return null;
  const color =
    siht === "ELAMUMAA"
      ? "bg-accent2/20 text-accent2 border-accent2/40"
      : siht.includes("METS") || siht.includes("MAHE")
        ? "bg-emerald-700/20 text-emerald-400 border-emerald-700/40"
        : "bg-warn/20 text-warn border-warn/40";
  return (
    <span className={`inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${color}`}>
      {siht}
    </span>
  );
}

function EnergyPill({ klass }: { klass: string | null }) {
  if (!klass) return null;
  // A–C = green, D–E = yellow, F–G = orange, H = red
  const good = ["A", "B", "C"].includes(klass);
  const mid = ["D", "E"].includes(klass);
  const color = good
    ? "bg-accent2/20 text-accent2 border-accent2/40"
    : mid
      ? "bg-warn/20 text-warn border-warn/40"
      : "bg-bad/20 text-bad border-bad/40";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-mono ${color}`}>
      <span className="font-bold">{klass}</span>
      <span className="opacity-70">energy class</span>
    </span>
  );
}

function fmtArea(m2: number) {
  if (m2 > 10000) return `${(m2 / 10000).toFixed(2)} ha`;
  return `${m2.toLocaleString("et-EE")} m²`;
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  // EHR returns ISO-ish strings: "2012-02-06T00:00:00.000" or just "1957"
  const yyyy = s.match(/^(\d{4})/);
  if (yyyy) return yyyy[1];
  return s;
}

function ageOf(yearStr: string | null): number | null {
  if (!yearStr) return null;
  const y = parseInt(yearStr, 10);
  if (!Number.isFinite(y)) return null;
  return new Date().getFullYear() - y;
}

export default function PropertyCard({ c, center, ehr, ehrLoading, ehrAttempted, ehrError }: Props) {
  const [lng, lat] = center;
  const year = fmtDate(ehr?.esmaneKasutus ?? null);
  const age = ageOf(year);
  const panel = !!ehr?.technical.some(
    (t) => t.klNimetus.toLowerCase().includes("kande") && t.nimetus.toLowerCase().includes("paneel")
  );
  const energy = ehr?.energy[0] ?? null;

  // Mortgage readiness flags — driven by REAL data
  const checks: { ok: boolean; text: string; warn?: string }[] = [
    { ok: true, text: "Cadastral record present (you can mortgage it)" },
    { ok: true, text: `Ownership form: ${c.omvorm || "—"}` },
    {
      ok: !!ehr && ehr.esmaneKasutus != null,
      text:
        ehr == null && ehrLoading
          ? "kasutusluba (occupancy permit) — loading from EHR…"
          : ehr == null && ehrAttempted
            ? "kasutusluba not retrieved (lookup failed) — verify via Maa-amet"
            : ehr == null
              ? "kasutusluba — needs building address to fetch from EHR"
              : ehr.esmaneKasutus == null
                ? "⚠️ kasutusluba NOT FOUND — banks may refuse mortgage"
                : `✅ kasutusluba issued: ${fmtDate(ehr.esmaneKasutus)}`,
    },
    {
      ok: false,
      text:
        energy?.energiaKlass && ["A", "B"].includes(energy.energiaKlass)
          ? `✅ Energy class ${energy.energiaKlass} — green mortgage eligible at LHV / Swedbank / SEB`
          : energy?.energiaKlass
            ? `⚠️ Energy class ${energy.energiaKlass} — not green-mortgage eligible (need A or B)`
            : ehrAttempted
              ? "No energy class on record"
              : "Energy class — needs building address to fetch from EHR",
    },
    {
      ok: age == null || age < 30,
      text:
        age == null
          ? ehrAttempted
            ? "Build year not on record"
            : "Build year — needs building address to fetch from EHR"
          : age < 30
            ? `✅ Built ${year} (${age}y old) — modern, low maintenance risk`
            : `⚠️ Built ${year} (${age}y old) — request structural survey + winter utility invoices`,
      ...(panel ? { warn: "1960s–80s panel building detected — request asbestos + structural review" } : {}),
    },
  ];

  return (
    <div className="bg-panel border border-line rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-line">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-fg leading-tight">{c.tais_aadress}</h2>
            <div className="text-xs text-muted mt-0.5 font-mono">
              {c.tunnus}
              {ehr && <span className="ml-2 opacity-70">ehr {ehr.ehr_code}</span>}
            </div>
          </div>
          <a
            href={`https://geoportaal.maaamet.ee/est/teenused/aadress/${encodeURIComponent(c.tunnus)}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-accent hover:underline shrink-0"
          >
            ↗ Maa-amet
          </a>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <LandUsePill siht={c.siht1} />
          <LandUsePill siht={c.siht2} />
          <EnergyPill klass={energy?.energiaKlass ?? null} />
          {c.omvorm && (
            <span className="inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border bg-panel text-fg border-line">
              {c.omvorm}
            </span>
          )}
          {c.kinnistu && (
            <span className="inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border bg-panel text-fg border-line">
              {c.kinnistu}
            </span>
          )}
          {ehr?.rajatisHoone && (
            <span className="inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border bg-panel text-fg border-line">
              {ehr.rajatisHoone}
            </span>
          )}
        </div>
      </div>

      {/* Cadastral key facts */}
      <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
        <Fact label="Land area" value={fmtArea(c.pindala)} />
        <Fact label="Tax value" value={c.maks_hind ? `€${c.maks_hind.toLocaleString("et-EE")}` : "—"} />
        <Fact label="Cadastral reg." value={c.registreeritud} />
        <Fact label="ADS OID" value={c.ads_oid} mono />
      </div>

      {/* Building facts (from EHR) */}
      <div className="px-5 py-4 border-b border-line">
        <SectionTitle>Building (EHR live)</SectionTitle>
        {ehrLoading && <p className="text-xs text-muted">Loading building data from Ehitisregister…</p>}
        {ehrError && (
          <p className="text-xs text-bad mb-2">
            EHR error: {ehrError}. <span className="text-muted">EHR is behind Cloudflare; the page still works.</span>
          </p>
        )}
        {ehr && !ehrLoading && (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted">First use (kasutusluba)</div>
                <div className="text-fg">{fmtDate(ehr.esmaneKasutus)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted">Built</div>
                <div className="text-fg">{fmtDate(ehr.ehAlustKp)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted">Net area</div>
                <div className="text-fg">
                  {ehr.suletud_netopind != null ? fmtArea(ehr.suletud_netopind) : "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted">Volume (bruto)</div>
                <div className="text-fg">
                  {ehr.mahtBruto != null ? `${ehr.mahtBruto.toLocaleString("et-EE")} m³` : "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted">Floors</div>
                <div className="text-fg">
                  {ehr.minKorrusteArv != null && ehr.maxKorrusteArv != null
                    ? `${ehr.minKorrusteArv}–${ehr.maxKorrusteArv}`
                    : "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted">Heating</div>
                <div className="text-fg">
                  {energy?.kytteTyypTxt ?? "—"}
                  {energy?.tarnEnKK && energy?.tarnEnKKYhik && (
                    <span className="text-muted text-xs ml-1">
                      ({Number(energy.tarnEnKK).toLocaleString("et-EE")} {energy.tarnEnKKYhik})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {energy?.energiaKaalKasutus && (
              <div className="mt-3 text-xs text-muted">
                Energy use: <span className="text-fg">{energy.energiaKaalKasutus} kWh/m²/year</span>
                {energy.energiaKehtibKuniKp && (
                  <span className="ml-2">· cert valid until {fmtDate(energy.energiaKehtibKuniKp)}</span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Location */}
      <div className="px-5 py-4 border-b border-line">
        <SectionTitle>Location (WGS84)</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Fact label="Latitude" value={lat.toFixed(6)} mono />
          <Fact label="Longitude" value={lng.toFixed(6)} mono />
        </div>
        <div className="text-xs text-muted mt-2">
          Centroid (Lambert 3301): x {c.tsentroid_x.toFixed(2)}, y {c.tsentroid_y.toFixed(2)}
        </div>
      </div>

      {/* Market context — still v2 backlog */}
      <div className="px-5 py-4 border-b border-line">
        <SectionTitle>Market context</SectionTitle>
        <p className="text-xs text-muted">
          Asking vs. closed €/m², transaction history and AVM will appear here in v3
          (Maa-amet <code className="text-fg">htraru</code> + kv.ee scrape).
        </p>
      </div>

      {/* Mortgage-readiness checklist — driven by REAL data */}
      <div className="px-5 py-4">
        <SectionTitle>Mortgage-readiness checklist</SectionTitle>
        <ul className="text-sm space-y-1.5">
          {checks.map((ch, i) => (
            <li
              key={i}
              className={ch.ok ? "text-accent2" : "text-warn"}
            >
              {ch.text}
              {ch.warn && <div className="ml-4 text-xs text-bad/80">↳ {ch.warn}</div>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] uppercase tracking-wider text-muted mb-2 font-semibold">
      {children}
    </h3>
  );
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="px-5 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted mb-0.5">{label}</div>
      <div className={`text-sm text-fg ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
