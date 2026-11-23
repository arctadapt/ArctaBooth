import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Penyimpanan belum terhubung." }, { status: 503 })
    const form = await request.formData()
    const files = form.getAll("files").filter((item): item is File => item instanceof File)
    if (!files.length || files.length > 40) return NextResponse.json({ error: "Jumlah file tidak valid." }, { status: 400 })
    const sessionId = crypto.randomUUID()
    const media: { name: string; url: string; type: string }[] = []
    for (const file of files) {
      if (!["image/png","image/jpeg","image/webp","image/gif","video/webm","video/mp4"].includes(file.type) || file.size > 15 * 1024 * 1024) {
        return NextResponse.json({ error: "Jenis file tidak didukung atau melebihi 15 MB." }, { status: 400 })
      }
      const extension = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : file.type === "image/webp" ? "webp" : file.type === "image/gif" ? "gif" : file.type === "video/mp4" ? "mp4" : "webm"
      const name = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "media"
      const blob = await put("sessions/" + sessionId + "/" + crypto.randomUUID() + "-" + name + "." + extension, file, { access: "public", addRandomSuffix: false, contentType: file.type })
      media.push({ name: file.name, url: blob.url, type: file.type })
    }
    const manifest = await put("sessions/" + sessionId + "/manifest.json", JSON.stringify({ media, createdAt: new Date().toISOString() }), { access: "public", addRandomSuffix: false, contentType: "application/json" })
    return NextResponse.json({ id: sessionId, manifestUrl: manifest.url, media, shareUrl: new URL("/sesi/" + sessionId + "?manifest=" + encodeURIComponent(manifest.url), request.url).toString() })
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan sesi. Silakan coba lagi." }, { status: 500 })
  }
}
