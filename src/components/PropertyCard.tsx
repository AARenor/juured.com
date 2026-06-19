"use client";

import type { CadastreRecord, EhrBuilding } from "@/lib/estdata";

type Props = {
  c: CadastreRecord;
  ehr: EhrBuilding | null;
  ehrLoading: boolean;
  ehrAttempted: boolean;
  ehrError: string | null;
};

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "amber" | "red" }) {
  const tones = {
    neutral: "border-rule text-ink/80",
    green: "border-accent2/40 text-accent2",
    amber: "border-warn/40 text-warn",
    red: "border-bad/40 text-bad",
  };
  return (
    <span
      className={`inline-flex items-center text-[10.5px] font-semibold uppercase tracking-[0.14em]
                  px-2 py-1 border ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function LandUsePill({ siht }: { siht: string | null }) {
  if (!siht) return null;
  if (siht === "ELAMUMAA") return <Pill tone="green">{siht}</Pill>;
  if (siht.includes("METS") || siht.includes("MAHE")) return <Pill tone="green">{siht}</Pill>;
  return <Pill tone="amber">{siht}</Pill>;
}

function EnergyPill({ klass }: { klass: string | null }) {
  if (!klass) return null;
  const good = ["A", "B", "C"].includes(klass);
  const mid = ["D", "E"].includes(klass);
  return <Pill tone={good ? "green" : mid ? "amber" : "red"}>{klass}</Pill>;
}

function fmtArea(m2: number) {
  if (m2 > 10000) return `${(m2 / 10000).toFixed(2)} ha`;
  return `${m2.toLocaleString("et-EE")} m²`;
}

function fmtYear(s: string | null) {
  if (!s) return "—";
  const m = s.match(/^(\d{4})/);
  return m ? m[1] : s;
}

function ageOf(yearStr: string | null): number | null {
  if (!yearStr) return null;
  const y = parseInt(yearStr, 10);
  if (!Number.isFinite(y)) return null;
  return new Date().getFullYear() - y;
}

function fmtMoney(n: number | null) {
  if (n == null) return "—";
  return `€${n.toLocaleString("et-EE")}`;
}

export default function PropertyCard({ c, ehr, ehrLoading, ehrAttempted, ehrError }: Props) {
  const year = fmtYear(ehr?.esmaneKasutus ?? null);
  const age = ageOf(year);
  const panel = !!ehr?.technical.some(
    (t) =>
      t.klNimetus.toLowerCase().includes("kande") &&
      t.nimetus.toLowerCase().includes("paneel"),
  );
  const energy = ehr?.energy[0] ?? null;

  // Readiness rows — flat list, plain copy, no marketing tone
  type Row = { mark: "ok" | "warn" | "—" | "?"; text: string };
  const readiness: Row[] = [
    {
      mark: "ok",
      text: "Cadastral record present — the property exists in the land registry and can be mortgaged.",
    },
    {
      mark: "ok",
      text: `Ownership form: ${c.omvorm || "—"}.`,
    },
    {
      mark:
        ehr == null && ehrLoading
          ? "?"
          : ehr == null && ehrAttempted
            ? "—"
            : ehr == null
              ? "—"
              : ehr.esmaneKasutus == null
                ? "warn"
                : "ok",
      text:
        ehr == null && ehrLoading
          ? "kasutusluba (occupancy permit) — loading from building register…"
          : ehr == null && ehrAttempted
            ? "kasutusluba not retrieved — verify via Maa-amet."
            : ehr == null
              ? "kasutusluba — needs a building-level lookup to fetch from EHR."
              : ehr.esmaneKasutus == null
                ? "kasutusluba NOT FOUND on file — many banks will not issue a mortgage."
                : `kasutusluba issued ${fmtYear(ehr.esmaneKasutus)}.`,
    },
    {
      mark:
        energy?.energiaKlass && ["A", "B"].includes(energy.energiaKlass)
          ? "ok"
          : energy?.energiaKlass
            ? "warn"
            : ehrAttempted
              ? "—"
              : "—",
      text:
        energy?.energiaKlass && ["A", "B"].includes(energy.energiaKlass)
          ? `Energy class ${energy.energiaKlass} — eligible for a green mortgage at LHV, Swedbank, SEB.`
          : energy?.energiaKlass
            ? `Energy class ${energy.energiaKlass} — not green-mortgage eligible (need A or B).`
            : "Energy class not on record.",
    },
    {
      mark: age == null ? "—" : age < 30 ? "ok" : "warn",
      text:
        age == null
          ? "Build year not on record."
          : age < 30
            ? `Built ${year} (${age} years old) — modern, low maintenance risk.`
            : `Built ${year} (${age} years old) — request a structural survey and the last two winter utility invoices.`,
    },
  ];
  if (panel) {
    readiness.push({
      mark: "warn",
      text: "1960s–80s prefabricated panel detected — ask the seller for an asbestos and structural review.",
    });
  }

  const markChar = (m: Row["mark"]) =>
    m === "ok" ? "✓" : m === "warn" ? "!" : m === "?" ? "…" : "—";
  const markTone = (m: Row["mark"]) =>
    m === "ok" ? "text-accent2" : m === "warn" ? "text-warn" : m === "?" ? "text-faint" : "text-faint";

  return (
    <article className="max-w-sheet mx-auto">
      {/* ==== TOP META: ids + links ==== */}
      <header className="flex items-baseline justify-between gap-4 flex-wrap sheet-in">
        <div>
          <p className="eyebrow">Property sheet</p>
          <h1 className="display mt-2 text-ink text-balance">{c.tais_aadress}</h1>
        </div>
        <a
          href={`https://geoportaal.maaamet.ee/est/teenused/aadress/${encodeURIComponent(c.tunnus)}`}
          target="_blank"
          rel="noreferrer"
          className="eyebrow text-ink hover:text-accent transition-colors whitespace-nowrap"
        >
          View on Maa-amet ↗
        </a>
      </header>

      {/* ==== PILL ROW: land use + energy + ownership ==== */}
      <div className="mt-5 flex flex-wrap gap-2 sheet-in sheet-in-1">
        <LandUsePill siht={c.siht1} />
        <LandUsePill siht={c.siht2} />
        <EnergyPill klass={energy?.energiaKlass ?? null} />
        {c.omvorm && <Pill>{c.omvorm}</Pill>}
        {c.kinnistu && <Pill>{c.kinnistu}</Pill>}
        {ehr?.rajatisHoone && <Pill>{ehr.rajatisHoone}</Pill>}
        {energy?.energiaKlass && ["A", "B"].includes(energy.energiaKlass) && (
          <Pill tone="green">Green mortgage eligible</Pill>
        )}
      </div>

      {/* ==== THE LEDGER: parcel + building + position in one tidy table ==== */}
      <section className="mt-10 sheet-in sheet-in-2">
        <p className="eyebrow">The ledger</p>
        <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-10">
          <Row label="Cadastral id (tunnus)" value={c.tunnus} mono />
          {ehr && <Row label="EHR building id" value={ehr.ehr_code} mono />}
          <Row label="Parcel area" value={fmtArea(c.pindala)} />
          <Row label="Tax value" value={fmtMoney(c.maks_hind)} />
          <Row label="Cadastral registration" value={c.registreeritud} />
          <Row label="ADS object id" value={c.ads_oid} mono />
        </dl>
      </section>

      {/* ==== BUILDING section: EHR-driven ==== */}
      <section className="mt-12 sheet-in sheet-in-3">
        <p className="eyebrow">The building</p>
        {ehrLoading && (
          <p className="mt-3 text-sm text-muted">Loading from the building register…</p>
        )}
        {ehrError && (
          <p className="mt-3 text-sm text-bad">
            {ehrError}.{" "}
            <span className="text-muted">The building register is behind Cloudflare; the parcel data above is still valid.</span>
          </p>
        )}
        {ehr && !ehrLoading && (
          <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-10">
            <Row label="First use (kasutusluba)" value={fmtYear(ehr.esmaneKasutus)} />
            <Row label="Built" value={fmtYear(ehr.ehAlustKp)} />
            <Row label="Net area" value={ehr.suletud_netopind != null ? fmtArea(ehr.suletud_netopind) : "—"} />
            <Row label="Gross volume" value={ehr.mahtBruto != null ? `${ehr.mahtBruto.toLocaleString("et-EE")} m³` : "—"} />
            <Row
              label="Floors"
              value={ehr.minKorrusteArv != null && ehr.maxKorrusteArv != null
                ? `${ehr.minKorrusteArv}${ehr.minKorrusteArv !== ehr.maxKorrusteArv ? `–${ehr.maxKorrusteArv}` : ""}`
                : "—"}
            />
            <Row
              label="Heating"
              value={
                energy?.kytteTyypTxt
                  ? `${energy.kytteTyypTxt}${energy.tarnEnKK ? ` · ${Number(energy.tarnEnKK).toLocaleString("et-EE")} kWh` : ""}`
                  : "—"
              }
            />
          </dl>
        )}

        {energy?.energiaKaalKasutus && (
          <p className="mt-4 text-sm text-muted">
            Energy use: <span className="text-ink tabnum">{energy.energiaKaalKasutus}</span> kWh/m²/year
            {energy.energiaKehtibKuniKp && (
              <span className="ml-2">· certificate valid until {fmtYear(energy.energiaKehtibKuniKp)}</span>
            )}
          </p>
        )}
      </section>

      {/* ==== READINESS — the differentiator, top of the page concern ==== */}
      <section className="mt-12 sheet-in sheet-in-4">
        <p className="eyebrow">Mortgage-readiness</p>
        <ol className="mt-3 divide-y divide-rule">
          {readiness.map((r, i) => (
            <li
              key={i}
              className="flex items-baseline gap-4 py-3 text-[15.5px] leading-snug"
            >
              <span
                aria-hidden="true"
                className={`font-mono text-sm w-5 shrink-0 ${markTone(r.mark)}`}
              >
                {markChar(r.mark)}
              </span>
              <span className="text-ink">{r.text}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ==== FOOTER: provenance + market-context note ==== */}
      <footer className="mt-12 sheet-in sheet-in-5">
        <p className="eyebrow">What this sheet does not show</p>
        <p className="mt-3 text-sm text-muted max-w-prose">
          Median closed €/m², transaction history, and an AVM are not yet wired in. The new
          Maa-amet transaction database (live since 11 May 2026) and a logged-out scrape of
          kv.ee are queued for the next release.
        </p>
        <p className="mt-8 text-[11px] eyebrow text-faint">
          Source data · In-AKS · Cadastre X-Road · Ehitisregister (live). Not a substitute for legal or financial advice.
        </p>
      </footer>
    </article>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[14rem_1fr] sm:grid-cols-[12rem_1fr] gap-x-4 py-2.5 border-b border-rule">
      <dt className="eyebrow text-muted self-center">{label}</dt>
      <dd className={`text-ink ${mono ? "font-mono text-[13.5px]" : ""} self-center`}>{value}</dd>
    </div>
  );
}
