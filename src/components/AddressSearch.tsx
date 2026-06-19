"use client";

import { useEffect, useRef, useState } from "react";
import { searchAddresses, type AksAddress } from "@/lib/estdata";

type Props = {
  onSelect: (a: AksAddress) => void;
};

export default function AddressSearch({ onSelect }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<AksAddress[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Autofill: fetch after 2+ chars with a 150ms debounce
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const id = setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      setErr(null);
      searchAddresses(q, ctrl.signal)
        .then((r) => {
          setResults(r);
          setOpen(true);
          setActive(0);
        })
        .catch((e) => {
          if (e?.name !== "AbortError") setErr(String(e?.message ?? e));
        })
        .finally(() => setLoading(false));
    }, 150);
    return () => clearTimeout(id);
  }, [q]);

  // Reset active when results change
  useEffect(() => setActive(0), [results]);

  function pick(r: AksAddress) {
    onSelect(r);
    setQ(r.pikkaadress);
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) {
      if (e.key === "ArrowDown" && results.length) setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[active];
      if (r) pick(r);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Highlight the matched portion of the address
  function highlight(text: string) {
    if (!q.trim()) return text;
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i === -1) return text;
    return (
      <>
        {text.slice(0, i)}
        <mark className="bg-transparent text-ink font-medium underline decoration-accent/40 decoration-2 underline-offset-2">
          {text.slice(i, i + q.length)}
        </mark>
        {text.slice(i + q.length)}
      </>
    );
  }

  return (
    <div className="w-full">
      {/* The input — large, editorial, with a hairline border */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Type any Estonian address to begin"
          className="w-full bg-transparent border-0 border-b border-ink/15 focus:border-ink
                     text-[28px] sm:text-[34px] md:text-[42px] leading-[1.1]
                     font-display placeholder:text-faint/70
                     py-2 focus:ring-0 outline-none transition-colors"
        />
        {loading && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs eyebrow text-muted">
            searching…
          </span>
        )}
      </div>

      {/* The result list — inline, not floating */}
      {err && (
        <p className="mt-3 text-sm text-bad">Address search error: {err}</p>
      )}

      {open && results.length > 0 && (
        <ul
          ref={listRef}
          className="mt-4 hairline pt-4 no-scrollbar"
          role="listbox"
        >
          {results.slice(0, 12).map((r, i) => {
            const isActive = i === active;
            return (
              <li key={r.ads_oid + i} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => pick(r)}
                  onMouseEnter={() => setActive(i)}
                  className={`group w-full text-left flex items-baseline gap-3 sm:gap-6
                              py-3 border-b border-rule transition-colors
                              ${isActive ? "bg-paper" : "bg-transparent hover:bg-paper"}`}
                >
                  <span className="eyebrow w-6 shrink-0 text-faint tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[19px] sm:text-[22px] display-tight text-ink leading-tight">
                      {highlight(r.pikkaadress)}
                    </span>
                    <span className="block mt-0.5 text-xs eyebrow text-muted">
                      {r.liikVal} · {r.maakond}{r.omavalitsus ? ` · ${r.omavalitsus}` : ""}
                      {r.asustusyksus ? ` · ${r.asustusyksus}` : ""}
                    </span>
                  </span>
                  <span
                    className="hidden sm:inline shrink-0 text-xs text-muted tabnum font-mono"
                    aria-hidden="true"
                  >
                    {r.viitepunkt_b.toFixed(4)}, {r.viitepunkt_l.toFixed(4)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && q.trim().length >= 2 && results.length === 0 && !loading && (
        <p className="mt-4 text-sm text-muted">
          No matches for &ldquo;{q}&rdquo;. Try a different street or settlement.
        </p>
      )}

      {/* Subtle keyboard hint, only when there are results */}
      {open && results.length > 0 && (
        <p className="mt-3 text-[11px] eyebrow text-faint">
          <kbd className="font-sans not-italic px-1.5 py-0.5 border border-rule rounded">↑↓</kbd>
          {" "}to navigate · {" "}
          <kbd className="font-sans not-italic px-1.5 py-0.5 border border-rule rounded">↵</kbd>
          {" "}to select
        </p>
      )}
    </div>
  );
}
