import { NextRequest, NextResponse } from "next/server";

// Server-side proxy to the EHR (Ehitisregister) building data API.
// The EHR API is behind Cloudflare and may return inconsistent CORS
// responses; proxying through Next.js is more reliable and lets us add
// edge caching.
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ ehrCode: string }> },
) {
  const { ehrCode } = await ctx.params;
  if (!ehrCode || !/^\d+$/.test(ehrCode)) {
    return NextResponse.json({ error: "Invalid ehr_code (digits only)" }, { status: 400 });
  }
  try {
    const r = await fetch(
      `https://livekluster.ehr.ee/api/building/v2/buildingData?ehr_code=${encodeURIComponent(ehrCode)}`,
      { headers: { Accept: "application/json", "User-Agent": "estprop/1.0 (+https://estprop.vercel.app)" } },
    );
    if (r.status === 404 || r.status === 400) {
      return NextResponse.json({ error: "EHR record not found" }, { status: 404 });
    }
    if (!r.ok) {
      return NextResponse.json({ error: `EHR API ${r.status}` }, { status: r.status });
    }
    const data = await r.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: `EHR proxy error: ${(e as Error).message}` },
      { status: 502 },
    );
  }
}
