"use client"

import { useEffect, useState } from "react"
import { GIFEncoder, quantize, applyPalette } from "gifenc"
import { Button } from "@/components/ui/button"

type Props = { photos: string[]; cameraVideo?: Blob | null; onMediaChange: (media: { gif: Blob | null; video: Blob | null }) => void }
const SIZE = 480

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Foto tidak dapat dimuat."))
    image.src = src
  })
}
function draw(ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
  const scale = Math.max(SIZE / image.naturalWidth, SIZE / image.naturalHeight)
  const w = image.naturalWidth * scale, h = image.naturalHeight * scale
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.drawImage(image, (SIZE - w) / 2, (SIZE - h) / 2, w, h)
}
function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function SessionMedia({ photos, cameraVideo, onMediaChange }: Props) {
  const [gif, setGif] = useState<Blob | null>(null)
  const [video, setVideo] = useState<Blob | null>(cameraVideo ?? null)
  const [cameraVideoUrl, setCameraVideoUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!cameraVideo) return
    setVideo(cameraVideo)
    const url = URL.createObjectURL(cameraVideo)
    setCameraVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [cameraVideo])
  const [working, setWorking] = useState<"gif" | "video" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const canMake = photos.length > 0

  async function makeGif() {
    if (!canMake || working) return
    setWorking("gif"); setError(null)
    try {
      const images = await Promise.all(photos.slice(0, 20).map(load))
      const canvas = document.createElement("canvas"); canvas.width = SIZE; canvas.height = SIZE
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (!ctx) throw new Error("Canvas tidak tersedia.")
      const encoder = GIFEncoder()
      for (const image of images) {
        draw(ctx, image)
        const pixels = ctx.getImageData(0, 0, SIZE, SIZE).data
        const palette = quantize(pixels, 128)
        const indexed = applyPalette(pixels, palette)
        encoder.writeFrame(indexed, SIZE, SIZE, { palette, delay: 650 })
      }
      encoder.finish()
      const blob = new Blob([encoder.bytes()], { type: "image/gif" })
      setGif(blob); onMediaChange({ gif: blob, video }); save(blob, "arctabooth-animasi.gif")
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal membuat GIF.") }
    finally { setWorking(null) }
  }

  async function makeVideo() {
    if (!canMake || working) return
    setWorking("video"); setError(null)
    try {
      if (typeof MediaRecorder === "undefined" || !HTMLCanvasElement.prototype.captureStream) throw new Error("Browser belum mendukung perekaman video canvas.")
      const images = await Promise.all(photos.slice(0, 20).map(load))
      const canvas = document.createElement("canvas"); canvas.width = SIZE; canvas.height = SIZE
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas tidak tersedia.")
      const mime = ["video/webm;codecs=vp8", "video/webm"].find(type => MediaRecorder.isTypeSupported(type))
      if (!mime) throw new Error("Browser tidak mendukung ekspor WebM. Coba Chrome atau Edge.")
      draw(ctx, images[0])
      const stream = canvas.captureStream(15)
      const chunks: Blob[] = []
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 650000 })
      const finished = new Promise<Blob>((resolve, reject) => {
        recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
        recorder.onerror = () => reject(new Error("Gagal merekam video."))
        recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }))
      })
      recorder.start()
      try {
        for (const image of images) {
          draw(ctx, image)
          await new Promise<void>(resolve => window.setTimeout(resolve, 650))
        }
      } finally {
        recorder.stop()
        stream.getTracks().forEach(track => track.stop())
      }
      const blob = await finished
      if (!blob.size) throw new Error("Video kosong. Coba ulangi.")
      setVideo(blob); onMediaChange({ gif, video: blob }); save(blob, "arctabooth-slideshow.webm")
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal membuat video.") }
    finally { setWorking(null) }
  }

  return <div className="space-y-3 rounded-2xl border bg-white p-5">
    <h2 className="font-semibold">GIF & Video dari Sesi Foto</h2>
    <p className="text-sm text-slate-500">Buat GIF dari foto atau video slideshow. Jika kamu merekam kamera saat sesi, rekaman asli akan disertakan dalam QR Code.</p>
    {cameraVideoUrl && <div className="space-y-2"><p className="text-sm font-semibold">Rekaman asli dari kamera</p><video controls playsInline src={cameraVideoUrl} className="mx-auto max-h-64 w-full rounded-xl bg-black" /><Button variant="outline" onClick={() => cameraVideo && save(cameraVideo, cameraVideo.type === "video/mp4" ? "arctabooth-rekaman.mp4" : "arctabooth-rekaman.webm")}>Unduh Rekaman Kamera</Button></div>}
    <div className="flex flex-wrap justify-center gap-3">
      <Button variant="outline" disabled={!canMake || !!working} onClick={() => void makeGif()}>{working === "gif" ? "Membuat GIF..." : gif ? "Buat Ulang GIF" : "Buat & Unduh GIF"}</Button>
      <Button variant="outline" disabled={!canMake || !!working} onClick={() => void makeVideo()}>{working === "video" ? "Membuat video..." : video ? "Buat Ulang Video" : "Buat Video Slideshow"}</Button>
    </div>
    <p className="text-xs text-slate-500">Status: GIF {gif ? "siap" : "belum dibuat"} · Video {video ? "siap" : "belum dibuat"}. Buat media sebelum menekan Buat QR Code.</p>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </div>
}
