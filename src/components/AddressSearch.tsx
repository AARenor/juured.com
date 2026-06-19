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
  const abortRef = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 3) {
      setResults([]);
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
        })
        .catch((e) => {
          if (e?.name !== "AbortError") setErr(String(e?.message ?? e));
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(id);
  }, [q]);

  // Click-outside
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="flex items-center gap-2 bg-panel border border-line rounded-lg px-3 py-2.5 focus-within:border-accent transition">
        <svg className="w-4 h-4 text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Type an Estonian address (e.g. Viljandi mnt 47, Tallinn)"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted"
        />
        {loading && <span className="text-xs text-muted">searching…</span>}
      </div>

      {err && (
        <div className="absolute z-30 mt-1 w-full bg-bad/10 border border-bad/30 text-bad text-xs rounded px-3 py-2">
          {err}
        </div>
      )}

      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1 w-full max-h-80 overflow-y-auto bg-panel border border-line rounded-lg shadow-xl no-scrollbar">
          {results.slice(0, 30).map((r, i) => (
            <button
              key={r.ads_oid + i}
              onClick={() => {
                onSelect(r);
                setQ(r.pikkaadress);
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-2 hover:bg-line/40 border-b border-line/40 last:border-0 transition"
            >
              <div className="text-sm text-fg">{r.pikkaadress}</div>
              <div className="text-xs text-muted">
                {r.liikVal} · {r.maakond} · {r.omavalitsus}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
