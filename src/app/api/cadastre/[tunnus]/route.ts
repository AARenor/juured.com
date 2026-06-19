import { NextRequest, NextResponse } from "next/server";

// Server-side proxy to the Cadastre X-Road API. The cadastre API blocks
// browser cross-origin requests (returns 403 when Origin header is set),
// so we proxy through Next.js to bypass CORS.
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ tunnus: string }> },
) {
  const { tunnus } = await ctx.params;
  if (!tunnus || !tunnus.includes(":")) {
    return NextResponse.json(
      { error: "Invalid cadastral id (expected format: NNNNN:NNN:NNNN)" },
      { status: 400 },
    );
  }
  try {
    const r = await fetch(
      `https://cadastrepublic.kataster.ee/api/xroad/valid/${encodeURIComponent(tunnus)}`,
      { headers: { Accept: "application/json" } },
    );
    if (r.status === 404) {
      return NextResponse.json({ error: "Cadastral id not found" }, { status: 404 });
    }
    if (!r.ok) {
      return NextResponse.json({ error: `Cadastre API ${r.status}` }, { status: r.status });
    }
    const data = await r.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Cadastre proxy error: ${(e as Error).message}` },
      { status: 502 },
    );
  }
}
