import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { email, shareUrl } = await request.json()
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Alamat email tidak valid." }, { status: 400 })
    }
    if (typeof shareUrl !== "string") return NextResponse.json({ error: "Tautan tidak valid." }, { status: 400 })
    const link = new URL(shareUrl)
    if (link.origin !== "https://drive.google.com" || !/^\/drive\/folders\/[a-zA-Z0-9_-]+$/.test(link.pathname)) {
      return NextResponse.json({ error: "Tautan sesi tidak valid." }, { status: 400 })
    }
    if (process.env.RESEND_FROM_EMAIL === "onboarding@resend.dev" && email.toLowerCase() !== "l7ksam17@gmail.com") {
      return NextResponse.json({ error: "Mode pengujian Resend hanya bisa mengirim ke email pemilik akun. Verifikasi domain pengirim untuk mengirim ke alamat lain." }, { status: 403 })
    }
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return NextResponse.json({ error: "Layanan email belum dikonfigurasi. QR Code tetap bisa digunakan." }, { status: 503 })
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [email],
        subject: "Hasil Sesi ArctaBooth Kamu",
        text: "Terima kasih sudah menggunakan ArctaBooth! Buka tautan berikut untuk melihat dan mengunduh semua foto, GIF, dan video sesi kamu:\n\n" + link.toString(),
      }),
    })
    if (!response.ok) return NextResponse.json({ error: "Email belum berhasil dikirim. Silakan coba lagi." }, { status: 502 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Gagal memproses permintaan email." }, { status: 500 })
  }
}
