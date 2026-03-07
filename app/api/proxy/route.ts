import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) return new NextResponse("Missing url", { status: 400 });

  // Only proxy Twitter CDN images
  if (!/^https:\/\/(pbs|abs)\.twimg\.com\//.test(url)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const res = await fetch(url);
  if (!res.ok) return new NextResponse("Failed to fetch", { status: res.status });

  const buffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") || "image/jpeg";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
