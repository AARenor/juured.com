"use client";

import { type CadastreRecord } from "@/lib/estdata";
import { estLambertToWgs84 } from "@/lib/estdata";

type Props = {
  c: CadastreRecord;
  center: [number, number];
  adsOids: string[];
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

function fmtArea(m2: number) {
  if (m2 > 10000) return `${(m2 / 10000).toFixed(2)} ha`;
  return `${m2.toLocaleString("et-EE")} m²`;
}

export default function PropertyCard({ c, center, adsOids }: Props) {
  const [lng, lat] = center;
  return (
    <div className="bg-panel border border-line rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-line">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-fg leading-tight">{c.tais_aadress}</h2>
            <div className="text-xs text-muted mt-0.5 font-mono">{c.tunnus}</div>
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
        </div>
      </div>

      {/* Key facts */}
      <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
        <Fact label="Area" value={fmtArea(c.pindala)} />
        <Fact label="Tax value" value={c.maks_hind ? `€${c.maks_hind.toLocaleString("et-EE")}` : "—"} />
        <Fact label="Registered" value={c.registreeritud} />
        <Fact label="ADS OID" value={c.ads_oid} mono />
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

      {/* Market context — placeholder until v2 (Maa-amet htraru join) */}
      <div className="px-5 py-4 border-b border-line">
        <SectionTitle>Market context</SectionTitle>
        <p className="text-xs text-muted">
          Median closed €/m² for this area will appear here once Maa-amet
          <code className="text-fg mx-1">htraru</code>
          data is joined (v2).
        </p>
      </div>

      {/* Mortgage readiness — placeholder, will use EHR + age */}
      <div className="px-5 py-4">
        <SectionTitle>Mortgage-readiness checklist</SectionTitle>
        <ul className="text-xs text-muted space-y-1.5">
          <li>✅ Cadastral record present (you can mortgage it)</li>
          <li>✅ Ownership form: {c.omvorm || "—"}</li>
          <li>⚠️ kasutusluba, energy class, build year pending EHR open-data load (v2)</li>
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
