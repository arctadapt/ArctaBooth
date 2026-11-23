import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Penyimpanan belum terhubung." }, { status: 503 })
    const body = await request.json()
    const sessionId = body.sessionId
    const media = body.media
    if (typeof sessionId !== "string" || !/^[a-f0-9-]{36}$/.test(sessionId) || !Array.isArray(media) || !media.length || media.length > 80) {
      return NextResponse.json({ error: "Data sesi tidak valid." }, { status: 400 })
    }
    const validated: { name: string; url: string; type: string }[] = []
    for (const item of media) {
      if (typeof item.name !== "string" || typeof item.url !== "string" || typeof item.type !== "string") return NextResponse.json({ error: "File tidak valid." }, { status: 400 })
      const url = new URL(item.url)
      if (url.protocol !== "https:" || !url.hostname.endsWith(".public.blob.vercel-storage.com") || !url.pathname.includes("/sessions/" + sessionId + "/") || !/^(image\/(png|jpeg|webp|gif)|video\/(webm|mp4))$/.test(item.type)) {
        return NextResponse.json({ error: "Alamat file tidak valid." }, { status: 400 })
      }
      validated.push({ name: item.name.slice(0, 120), url: url.toString(), type: item.type })
    }
    const manifest = await put("sessions/" + sessionId + "/manifest.json", JSON.stringify({ media: validated, createdAt: new Date().toISOString() }), { access: "public", addRandomSuffix: false, contentType: "application/json" })
    return NextResponse.json({ id: sessionId, manifestUrl: manifest.url, media: validated, shareUrl: new URL("/sesi/" + sessionId + "?manifest=" + encodeURIComponent(manifest.url), request.url).toString() })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal menyimpan sesi." }, { status: 500 })
  }
}
