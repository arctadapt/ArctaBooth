"use client"

import { useEffect, useState } from "react"
import { GIFEncoder, quantize, applyPalette } from "gifenc"
import { Button } from "@/components/ui/button"

export type GeneratedMedia = { compilation: Blob | null; takes: Blob[] }
const SIZE = 320

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Gambar gagal dimuat"))
    img.src = src
  })
}
export async function encodeGif(frames: string[], delay = 180): Promise<Blob> {
  const images = await Promise.all(frames.slice(0, 24).map(load))
  const canvas = document.createElement("canvas")
  canvas.width = SIZE; canvas.height = SIZE
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) throw new Error("Canvas tidak tersedia")
  const encoder = GIFEncoder()
  for (const img of images) {
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, SIZE, SIZE)
    const scale = Math.max(SIZE/img.naturalWidth, SIZE/img.naturalHeight)
    const w = img.naturalWidth*scale, h = img.naturalHeight*scale
    ctx.drawImage(img, (SIZE-w)/2, (SIZE-h)/2, w, h)
    const pixels = ctx.getImageData(0,0,SIZE,SIZE).data
    const palette = quantize(pixels, 96)
    encoder.writeFrame(applyPalette(pixels, palette), SIZE, SIZE, { palette, delay })
  }
  encoder.finish()
  return new Blob([encoder.bytes()], { type: "image/gif" })
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a"); a.href = url; a.download = name; a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export default function SessionMedia({ photos, takeFrames, cameraVideo, onMediaChange }: {
  photos: string[]
  takeFrames: string[][]
  cameraVideo: Blob | null
  onMediaChange: (media: GeneratedMedia) => void
}) {
  const [media, setMedia] = useState<GeneratedMedia>({ compilation: null, takes: [] })
  const [processing, setProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [gifUrls, setGifUrls] = useState<string[]>([])
  useEffect(() => {
    if (!cameraVideo) return
    const url = URL.createObjectURL(cameraVideo)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [cameraVideo])
  useEffect(() => {
    let cancelled = false
    const urls: string[] = []
    async function run() {
      try {
        const takes: Blob[] = []
        for (const frames of takeFrames) {
          if (frames.length) takes.push(await encodeGif(frames, 180))
        }
        const compilation = photos.length ? await encodeGif(photos, 650) : null
        if (cancelled) return
        const next = { compilation, takes }
        setMedia(next); onMediaChange(next)
        const created = [...takes, ...(compilation ? [compilation] : [])].map(blob => URL.createObjectURL(blob))
        urls.push(...created)
        setGifUrls(created)
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Gagal membuat GIF.") }
      finally { if (!cancelled) setProcessing(false) }
    }
    void run()
    return () => { cancelled = true; urls.forEach(url => URL.revokeObjectURL(url)) }
  }, [photos, takeFrames, onMediaChange])

  return <div className="space-y-4 rounded-2xl border bg-white p-5">
    <h2 className="font-semibold">Hasil Media Otomatis</h2>
    {processing && <p className="text-sm text-slate-500">Sedang membuat GIF setiap take dan GIF gabungan...</p>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {videoUrl && <div className="space-y-2"><p className="font-medium">Video penuh sesi foto</p><video controls playsInline src={videoUrl} className="mx-auto max-h-64 w-full rounded-xl bg-black" /><Button variant="outline" onClick={() => cameraVideo && downloadBlob(cameraVideo, cameraVideo.type === "video/mp4" ? "video-sesi.mp4" : "video-sesi.webm")}>Unduh Video Sesi</Button></div>}
    {media.compilation && gifUrls.length > 0 && <div className="space-y-2"><p className="font-medium">GIF Gabungan Semua Foto</p><img src={gifUrls[gifUrls.length-1]} alt="GIF kompilasi" className="mx-auto h-44 w-44 rounded-xl object-cover" /><Button variant="outline" onClick={() => media.compilation && downloadBlob(media.compilation, "gif-semua-foto.gif")}>Unduh GIF Gabungan</Button></div>}
    {media.takes.length > 0 && <div><p className="mb-3 font-medium">GIF Setiap Take ({media.takes.length})</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{media.takes.map((blob,i) => <div key={i} className="space-y-2"><img src={gifUrls[i]} alt={"GIF take "+(i+1)} className="w-full rounded-lg" /><Button size="sm" variant="outline" onClick={() => downloadBlob(blob,"gif-take-"+(i+1)+".gif")}>Unduh Take {i+1}</Button></div>)}</div></div>}
  </div>
}
