"use client"

import { useState } from "react"
import CameraView from "@/components/camera-view"
import PhotoStrip from "@/components/photo-strip"
import TemplateSelector from "@/components/template-selector"
import BrowserCheck from "@/components/browser-check"
import { Button } from "@/components/ui/button"
import { templates } from "@/lib/templates"
import { ArrowLeft, ArrowRight, Camera, Download, RotateCcw, Check, Sparkles, Image as ImageIcon, ShieldCheck, Menu, Heart, Aperture } from "lucide-react"

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
    <main className="booth-app min-h-screen px-4 py-5 md:py-7">
      <div className="mx-auto max-w-6xl">
        <header className="booth-nav mb-7 flex items-center justify-between gap-3">
          <button onClick={reset} className="flex items-center gap-2.5 text-left" aria-label="Kembali ke beranda">
            <span className="brand-symbol"><Aperture className="h-5 w-5" /></span>
            <span className="leading-tight"><strong className="block text-lg tracking-tight">ArctaBooth<span className="text-blue-600">.</span></strong><small className="block text-[10px] tracking-wide text-slate-500">Capture the moment</small></span>
          </button>
          <div className="hidden items-center gap-9 text-sm font-medium text-slate-600 md:flex">
            <button onClick={reset} className={step === "welcome" ? "text-blue-600" : "hover:text-blue-600"}>Home</button>
            <button onClick={() => setStep("layout")} className="hover:text-blue-600">Photobooth</button>
            <span className="text-slate-400">Made for memories</span>
          </div>
          <button onClick={() => setStep("layout")} className="nav-start"><span className="hidden sm:inline">Start creating</span><Camera className="h-4 w-4" /></button>
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
          <>
            <section className="booth-hero relative overflow-hidden">
              <div className="hero-orbit hero-orbit-one" /><div className="hero-orbit hero-orbit-two" />
              <div className="relative z-10 grid min-h-[475px] items-center gap-8 px-7 py-12 md:grid-cols-[.94fr_1.06fr] md:px-14 md:py-16">
                <div className="max-w-lg">
                  <div className="hero-eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> YOUR OWN LITTLE PHOTO STUDIO <Sparkles className="h-4 w-4" /></div>
                  <h1 className="hero-heading mt-6">Every moment<br /><em>is yours.</em></h1>
                  <p className="mt-5 max-w-sm text-sm leading-7 text-slate-600 md:text-base">Turn your favorite moments into beautiful photo strips. Snap, customize, and keep the memories — right from your browser.</p>
                  <button onClick={() => setStep("layout")} className="hero-cta mt-7">Start Photobooth <span className="cta-arrow"><ArrowRight className="h-4 w-4" /></span></button>
                  <p className="mt-5 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-blue-600" /> No sign up. No installation. Just memories.</p>
                </div>
                <div className="hero-art relative mx-auto h-[315px] w-full max-w-[520px] md:h-[385px]" aria-label="Ilustrasi photo strip">
                  <div className="hero-glow" />
                  <div className="hero-strip hero-strip-back"><div className="mock-photo mock-photo-a"><Heart /></div><div className="mock-photo mock-photo-b"><Sparkles /></div><div className="mock-photo mock-photo-c"><Camera /></div><span>sweet memories ♡</span></div>
                  <div className="hero-strip hero-strip-front"><div className="mock-photo mock-photo-d"><Sparkles /></div><div className="mock-photo mock-photo-e"><Heart /></div><div className="mock-photo mock-photo-f"><Aperture /></div><span>arctabooth · 2026</span></div>
                  <div className="hero-sticker hero-sticker-one">✦</div><div className="hero-sticker hero-sticker-two">♡</div>
                  <div className="hero-float"><span className="float-icon"><Camera className="h-4 w-4" /></span><span><strong className="block text-xs">Made with love</strong><small className="text-[10px] text-slate-500">Your memories, your style</small></span></div>
                </div>
              </div>
            </section>
            <div className="booth-feature-bar relative z-20 mx-auto -mt-7 grid max-w-4xl gap-0 sm:grid-cols-3">
              <div className="feature-unit"><span className="feature-icon"><Camera className="h-5 w-5" /></span><span><strong>Snap your photos</strong><small>Right from your camera</small></span></div>
              <div className="feature-unit"><span className="feature-icon"><ImageIcon className="h-5 w-5" /></span><span><strong>Make it yours</strong><small>Frames & photo filters</small></span></div>
              <div className="feature-unit"><span className="feature-icon"><Download className="h-5 w-5" /></span><span><strong>Save your memories</strong><small>Download in high quality</small></span></div>
            </div>
            <section className="mt-14 pb-12">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-blue-600">THE PHOTO EXPERIENCE</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Your memories, your way.</h2></div><button onClick={() => setStep("layout")} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">Try it now <ArrowRight className="h-4 w-4" /></button></div>
              <div className="grid gap-4 md:grid-cols-3">
                <article className="experience-card"><div className="experience-visual visual-blue"><Camera className="h-12 w-12" /></div><h3>01 / Strike a pose</h3><p>Choose a photo layout, turn on your camera, and capture the moment.</p></article>
                <article className="experience-card"><div className="experience-visual visual-peach"><Sparkles className="h-12 w-12" /></div><h3>02 / Add your touch</h3><p>Pick a frame and filter that matches the mood of your photos.</p></article>
                <article className="experience-card"><div className="experience-visual visual-lavender"><Download className="h-12 w-12" /></div><h3>03 / Keep forever</h3><p>Preview and download your finished photo strip in seconds.</p></article>
              </div>
            </section>
          </>
        )}

        {step === "layout" && (
          <section className="booth-workspace mx-auto max-w-2xl space-y-6">
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
            <section className="booth-workspace space-y-5">
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
          <section className="booth-workspace space-y-6">
            <div className="text-center"><h1 className="text-3xl font-bold">Buat strip-mu sendiri</h1><p className="mt-2 text-muted-foreground">Pilih frame favorit dan lihat hasilnya secara langsung.</p></div>
            <div className="grid items-start gap-8 md:grid-cols-2"><div className="rounded-xl border bg-muted/30 p-5"><PhotoStrip photos={photos} template={template} /></div><div className="space-y-5"><TemplateSelector templates={templates} selectedTemplate={template} onSelect={setTemplate} /><div className="flex flex-wrap gap-3"><Button variant="outline" onClick={() => setStep("capture")}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Foto</Button><Button onClick={generate} disabled={busy}>{busy ? "Memproses..." : "Lihat Hasil"} <ArrowRight className="ml-2 h-4 w-4" /></Button></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div></div>
          </section>
        )}

        {step === "download" && finalImage && (
          <section className="booth-workspace mx-auto max-w-2xl space-y-6 text-center"><div><h1 className="text-3xl font-bold">Your memories are ready!</h1><p className="mt-2 text-muted-foreground">Simpan hasil photobooth-mu dalam format PNG.</p></div><img src={finalImage} alt="Hasil akhir photobooth" className="mx-auto max-h-[65vh] max-w-full rounded-lg border object-contain shadow-md" /><div className="flex flex-wrap justify-center gap-3"><Button variant="outline" onClick={() => setStep("customize")}><ArrowLeft className="mr-2 h-4 w-4" /> Edit Lagi</Button><Button onClick={download}><Download className="mr-2 h-4 w-4" /> Download PNG</Button><Button variant="outline" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" /> Sesi Baru</Button></div></section>
        )}
      </div>
    </main>
  )
}
