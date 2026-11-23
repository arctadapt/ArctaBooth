import { NextRequest, NextResponse } from "next/server"
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Penyimpanan belum dikonfigurasi." }, { status: 503 })
    const body = (await request.json()) as HandleUploadBody
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("sessions/") || pathname.includes("..")) throw new Error("Lokasi file tidak valid.")
        return { allowedContentTypes: ["image/png", "image/jpeg", "image/webp", "image/gif", "video/webm", "video/mp4"], maximumSizeInBytes: 100 * 1024 * 1024, addRandomSuffix: true }
      },
      onUploadCompleted: async () => {},
    })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal menyiapkan upload." }, { status: 400 })
  }
}
