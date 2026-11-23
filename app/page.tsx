"use client"

import { useState } from "react"
import CameraView from "@/components/camera-view"
import PhotoStrip from "@/components/photo-strip"
import TemplateSelector from "@/components/template-selector"
import BrowserCheck from "@/components/browser-check"
import { Button } from "@/components/ui/button"
import { templates } from "@/lib/templates"
import { ArrowLeft, ArrowRight, Camera, Download, RotateCcw, Check } from "lucide-react"

type Step = "welcome" | "layout" | "capture" | "customize" | "download"
const steps: Step[] = ["welcome", "layout", "capture", "customize", "download"]
const layouts = [
  { id: "classic", title: "Classic Strip", count: 3, description: "3 foto vertikal" },
  { id: "four", title: "Four Moments", count: 4, description: "4 foto vertikal" },
]

export default function Home() {
  const [step, setStep] = useState<Step>("welcome")
  const [layout, setLayout] = useState(layouts[0])
  const [photos, setPhotos] = useState<string[]>([])
  const [template, setTemplate] = useState(templates[0])
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null)
  const [finalImage, setFinalImage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const progress = steps.indexOf(step)

  function reset() {
    setPhotos([])
    setRetakeIndex(null)
    setFinalImage(null)
    setError(null)
    setStep("welcome")
  }

  function capture(photo: string) {
    if (retakeIndex !== null) {
      setPhotos((prev) => prev.map((item, index) => index === retakeIndex ? photo : item))
      setRetakeIndex(null)
      return
    }
    setPhotos((prev) => {
      const next = [...prev, photo]
      if (next.length >= layout.count) setStep("customize")
      return next
    })
  }

  async function generate() {
    const element = document.getElementById("photo-strip")
    if (!element) return
    setBusy(true)
    setError(null)
    try {
      const html2canvas = (await import("html2canvas")).default
      const canvas = await html2canvas(element, { useCORS: true, backgroundColor: null, scale: 3 })
      setFinalImage(canvas.toDataURL("image/png"))
      setStep("download")
    } catch {
      setError("Gagal membuat foto. Silakan coba kembali.")
    } finally {
      setBusy(false)
    }
  }

  function download() {
    if (!finalImage) return
    const link = document.createElement("a")
    link.href = finalImage
    link.download = "arctabooth-" + Date.now() + ".png"
    link.click()
  }

  return (
    <main className="min-h-screen px-4 py-6 md:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-3">
          <button onClick={reset} className="text-xl font-bold tracking-tight" aria-label="Kembali ke beranda">ArctaBooth<span className="text-primary">.</span></button>
          <span className="text-xs text-muted-foreground">Your moments, your booth.</span>
        </header>

        {step !== "welcome" && (
          <nav aria-label="Progres sesi foto" className="mb-8 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm">
            {(["layout", "capture", "customize", "download"] as Step[]).map((item, index) => (
              <div key={item} className={"rounded-full border px-3 py-2 " + (step === item ? "border-primary bg-primary text-primary-foreground" : progress > steps.indexOf(item) ? "border-primary/30 text-foreground" : "text-muted-foreground")}>
                {index + 1}. {({ layout: "Layout", capture: "Foto", customize: "Kustomisasi", download: "Hasil" } as Record<string, string>)[item]}
              </div>
            ))}
          </nav>
        )}

        {step === "welcome" && (
          <section className="mx-auto flex min-h-[65vh] max-w-2xl flex-col items-center justify-center gap-6 text-center">
            <div className="rounded-full bg-primary/10 p-5"><Camera className="h-10 w-10 text-primary" /></div>
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Online photobooth</p>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">Capture your favorite moments.</h1>
            <p className="max-w-lg text-muted-foreground">Ambil foto langsung dari browser, pilih bingkai favorit, lalu simpan kenanganmu. Tanpa akun, tanpa instal aplikasi.</p>
            <Button size="lg" onClick={() => setStep("layout")}>Mulai Photobooth <ArrowRight className="ml-2 h-4 w-4" /></Button>
            <p className="text-xs text-muted-foreground">Kamera baru akan diaktifkan saat sesi foto dimulai.</p>
          </section>
        )}

        {step === "layout" && (
          <section className="mx-auto max-w-2xl space-y-6">
            <div className="text-center"><h1 className="text-3xl font-bold">Pilih layout foto</h1><p className="mt-2 text-muted-foreground">Tentukan jumlah foto sebelum memulai sesi.</p></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {layouts.map((option) => (
                <button key={option.id} onClick={() => setLayout(option)} aria-pressed={layout.id === option.id} className={"rounded-xl border-2 p-5 text-left transition-colors " + (layout.id === option.id ? "border-primary bg-primary/5" : "hover:bg-muted")}>
                  <div className="mb-4 flex items-start justify-between"><div className="flex w-16 flex-col gap-1 rounded bg-white p-2 shadow-sm">{Array.from({ length: option.count }).map((_, i) => <div key={i} className="aspect-square rounded-sm bg-slate-200" />)}</div>{layout.id === option.id && <Check className="text-primary" />}</div>
                  <h2 className="font-semibold">{option.title}</h2><p className="text-sm text-muted-foreground">{option.description}</p>
                </button>
              ))}
            </div>
            <div className="flex justify-between gap-3"><Button variant="outline" onClick={() => setStep("welcome")}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button><Button onClick={() => { setPhotos([]); setRetakeIndex(null); setStep("capture") }}>Lanjut ke Kamera <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
          </section>
        )}

        {step === "capture" && (
          <BrowserCheck>
            <section className="space-y-5">
              <div className="text-center"><h1 className="text-3xl font-bold">Sesi foto</h1><p className="mt-2 text-muted-foreground">{retakeIndex !== null ? "Ulang foto " + (retakeIndex + 1) : photos.length === layout.count ? "Semua foto sudah siap!" : "Foto " + (photos.length + 1) + " dari " + layout.count + " · Countdown otomatis"}</p></div>
              <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)]">
                <div className="space-y-4">
                  {photos.length < layout.count || retakeIndex !== null ? <CameraView key={retakeIndex === null ? "session" : "retake-" + retakeIndex} onCapture={capture} autoCapture={retakeIndex === null} remainingPhotos={retakeIndex !== null ? 1 : layout.count - photos.length} /> : <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-xl border bg-muted/30"><Check className="h-12 w-12 text-primary" /><p>Semua foto berhasil diambil.</p><Button onClick={() => setStep("customize")}>Lanjut Kustomisasi <ArrowRight className="ml-2 h-4 w-4" /></Button></div>}
                  <div className="flex flex-wrap justify-center gap-2"><Button variant="outline" onClick={() => { setPhotos([]); setRetakeIndex(null); setStep("layout") }}><ArrowLeft className="mr-2 h-4 w-4" /> Ganti Layout</Button>{retakeIndex !== null && <Button variant="outline" onClick={() => setRetakeIndex(null)}>Batal Ulang</Button>}{photos.length > 0 && <Button variant="outline" onClick={() => { setPhotos([]); setRetakeIndex(null) }}><RotateCcw className="mr-2 h-4 w-4" /> Mulai Ulang Foto</Button>}</div>
                </div>
                <aside className="space-y-3"><h2 className="font-semibold">Hasil sementara</h2><div className="grid grid-cols-2 gap-3">{Array.from({ length: layout.count }).map((_, index) => <div key={index} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">{photos[index] ? <><img src={photos[index]} alt={"Foto " + (index + 1)} className="h-full w-full object-cover" /><button onClick={() => setRetakeIndex(index)} className="absolute bottom-2 right-2 rounded-full bg-black/75 px-3 py-1 text-xs text-white">Ulang</button></> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Foto {index + 1}</div>}</div>)}</div>{photos.length === layout.count && <Button className="w-full" onClick={() => setStep("customize")}>Lanjut Kustomisasi <ArrowRight className="ml-2 h-4 w-4" /></Button>}</aside>
              </div>
            </section>
          </BrowserCheck>
        )}

        {step === "customize" && (
          <section className="space-y-6">
            <div className="text-center"><h1 className="text-3xl font-bold">Buat strip-mu sendiri</h1><p className="mt-2 text-muted-foreground">Pilih frame favorit dan lihat hasilnya secara langsung.</p></div>
            <div className="grid items-start gap-8 md:grid-cols-2"><div className="rounded-xl border bg-muted/30 p-5"><PhotoStrip photos={photos} template={template} /></div><div className="space-y-5"><TemplateSelector templates={templates} selectedTemplate={template} onSelect={setTemplate} /><div className="flex flex-wrap gap-3"><Button variant="outline" onClick={() => setStep("capture")}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Foto</Button><Button onClick={generate} disabled={busy}>{busy ? "Memproses..." : "Lihat Hasil"} <ArrowRight className="ml-2 h-4 w-4" /></Button></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div></div>
          </section>
        )}

        {step === "download" && finalImage && (
          <section className="mx-auto max-w-2xl space-y-6 text-center"><div><h1 className="text-3xl font-bold">Your memories are ready!</h1><p className="mt-2 text-muted-foreground">Simpan hasil photobooth-mu dalam format PNG.</p></div><img src={finalImage} alt="Hasil akhir photobooth" className="mx-auto max-h-[65vh] max-w-full rounded-lg border object-contain shadow-md" /><div className="flex flex-wrap justify-center gap-3"><Button variant="outline" onClick={() => setStep("customize")}><ArrowLeft className="mr-2 h-4 w-4" /> Edit Lagi</Button><Button onClick={download}><Download className="mr-2 h-4 w-4" /> Download PNG</Button><Button variant="outline" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" /> Sesi Baru</Button></div></section>
        )}
      </div>
    </main>
  )
}
