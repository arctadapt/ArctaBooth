"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { analyzeFrame, renderCustomFrame, type CustomFrame } from "@/lib/custom-frame"
import CameraView from "@/components/camera-view"
import PhotoStrip from "@/components/photo-strip"
import TemplateSelector from "@/components/template-selector"
import BrowserCheck from "@/components/browser-check"
import { Button } from "@/components/ui/button"
import { templates } from "@/lib/templates"
import { ArrowRight, Camera, Download, RotateCcw, Sparkles, Image as ImageIcon, ShieldCheck, Heart, Aperture } from "lucide-react"

type Step = "welcome" | "template" | "capture" | "finishing" | "download"
type Phase = "template" | "capture" | "finishing"
const phaseDuration: Record<Phase, number> = { template: 120, capture: 300, finishing: 120 }

export default function Home() {
  const [step, setStep] = useState<Step>("welcome")
  const [phase, setPhase] = useState<Phase | null>(null)
  const [deadline, setDeadline] = useState<number | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [template, setTemplate] = useState(templates[0])
  const [mode, setMode] = useState<"builtin" | "upload">("builtin")
  const [customFrame, setCustomFrame] = useState<CustomFrame | null>(null)
  const [gallery, setGallery] = useState<string[]>([])
  const [assignments, setAssignments] = useState<Record<number, number>>({})
  const [pending, setPending] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [draggingPhoto, setDraggingPhoto] = useState<number | null>(null)
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null)
  const [finalImage, setFinalImage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const phaseRef = useRef<Phase | null>(null)
  const finishingRef = useRef<() => void>(() => {})
  const slotCount = mode === "upload" && customFrame ? customFrame.slots.length : 3
  const assigned = Array.from({ length: slotCount }, (_, index) => gallery[assignments[index] ?? -1] ?? "")
  const remaining = Object.keys(assignments).length
  const timeText = String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0")

  const transition = useCallback((next: Phase) => {
    phaseRef.current = next
    setPhase(next)
    setStep(next)
    setSeconds(phaseDuration[next])
    setDeadline(Date.now() + phaseDuration[next] * 1000)
    setError(null)
    if (next === "finishing") setPending(null)
  }, [])

  useEffect(() => {
    if (deadline === null) return
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setSeconds(left)
      if (left > 0) return
      if (phaseRef.current === "template") transition("capture")
      else if (phaseRef.current === "capture") transition("finishing")
      else if (phaseRef.current === "finishing") {
        phaseRef.current = null
        setPhase(null)
        setDeadline(null)
        finishingRef.current()
      }
    }, 250)
    return () => window.clearInterval(timer)
  }, [deadline, transition])

  function reset() {
    phaseRef.current = null
    setPhase(null); setDeadline(null); setStep("welcome")
    setGallery([]); setAssignments({}); setPending(null); setSelectedSlot(null)
    setFinalImage(null); setCustomFrame(null); setMode("builtin"); setError(null)
  }

  function placePhoto(slot: number, photoIndex: number) {
    if (photoIndex < 0 || photoIndex >= gallery.length) return
    setAssignments(previous => ({ ...previous, [slot]: photoIndex }))
    setSelectedSlot(slot)
    setHoveredSlot(null)
  }

  function dropPhoto(event: React.DragEvent<HTMLElement>, slot: number) {
    event.preventDefault()
    const raw = event.dataTransfer.getData("text/plain")
    const index = raw === "" ? draggingPhoto : Number(raw)
    if (index !== null && index !== undefined && Number.isInteger(index)) placePhoto(slot, index)
    setDraggingPhoto(null)
  }

  function slotBoard() {
    const slot = (index: number, custom = false) => (
      <button
        key={index}
        type="button"
        aria-label={"Tempat foto " + (index + 1) + ". Tarik foto ke sini atau pilih slot lalu ketuk foto."}
        onClick={() => setSelectedSlot(index)}
        onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setHoveredSlot(index) }}
        onDragLeave={() => setHoveredSlot(previous => previous === index ? null : previous)}
        onDrop={event => dropPhoto(event, index)}
        className={"relative flex h-full w-full items-center justify-center overflow-hidden rounded border-2 transition-all " +
          (hoveredSlot === index ? "border-blue-500 bg-blue-200/60 ring-4 ring-blue-400/40" :
            selectedSlot === index ? "border-blue-500 ring-2 ring-blue-400" : "border-dashed border-slate-400/70 bg-slate-200/40") +
          (custom ? " bg-transparent" : "")}
      >
        {assigned[index] ? <img src={assigned[index]} alt={"Foto slot " + (index + 1)} className="h-full w-full object-cover" draggable={false} /> :
          <span className="rounded bg-white/85 px-2 py-1 text-xs font-semibold text-slate-700">Slot {index + 1}</span>}
        {hoveredSlot === index && <span className="absolute inset-0 flex items-center justify-center bg-blue-500/25 text-sm font-bold text-white">Lepas di sini</span>}
      </button>
    )
    if (mode === "upload" && customFrame) {
      return <div className="relative mx-auto w-full max-w-[440px]">
        <img src={customFrame.source} alt="Template dengan area drop foto" className="block h-auto w-full" draggable={false} />
        {customFrame.slots.map((area, index) => <div key={index} className="absolute" style={{
          left: (area.x / customFrame.width * 100) + "%",
          top: (area.y / customFrame.height * 100) + "%",
          width: (area.width / customFrame.width * 100) + "%",
          height: (area.height / customFrame.height * 100) + "%"
        }}>{slot(index, true)}</div>)}
      </div>
    }
    return <div className="mx-auto grid w-full max-w-[300px] grid-cols-1 gap-3 rounded-xl border-8 p-4" style={{ background: template.backgroundColor.startsWith("#") ? template.backgroundColor : "#f4f4f4" }}>
      {Array.from({ length: slotCount }, (_, index) => <div key={index} className="aspect-square">{slot(index)}</div>)}
    </div>
  }

  function galleryBoard() {
    return <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {gallery.map((photo, index) => <button key={index} type="button" draggable
        onDragStart={event => { setDraggingPhoto(index); event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("text/plain", String(index)) }}
        onDragEnd={() => { setDraggingPhoto(null); setHoveredSlot(null) }}
        onClick={() => { if (selectedSlot !== null) placePhoto(selectedSlot, index); else setDraggingPhoto(index) }}
        className={"relative overflow-hidden rounded-lg border-2 transition-all focus:border-blue-600 " +
          (draggingPhoto === index ? "border-blue-500 ring-2 ring-blue-400" : "border-transparent hover:border-blue-400")}>
        <img src={photo} alt={"Foto galeri " + (index + 1)} className="aspect-square w-full object-cover" draggable={false} />
        <span className="absolute bottom-0 left-0 right-0 bg-black/60 py-1 text-center text-xs text-white">Foto {index + 1}</span>
      </button>)}
    </div>
  }

  function savePending(slot: number | null) {
    if (!pending) return
    const index = gallery.length
    setGallery(previous => [...previous, pending])
    if (slot !== null) setAssignments(previous => ({ ...previous, [slot]: index }))
    setPending(null)
    setSelectedSlot(null)
  }

  async function uploadTemplate(file?: File) {
    if (!file) return
    setBusy(true); setError(null)
    try {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Gunakan PNG, JPG, atau WebP.")
      if (file.size > 12 * 1024 * 1024) throw new Error("Ukuran template maksimal 12 MB.")
      const source = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error("File tidak dapat dibaca."))
        reader.readAsDataURL(file)
      })
      const result = await analyzeFrame(source)
      setCustomFrame(result)
      setAssignments({})
      setSelectedSlot(null)
    } catch (cause) {
      setCustomFrame(null)
      setError(cause instanceof Error ? cause.message : "Gagal membaca template.")
    } finally { setBusy(false) }
  }

  async function generate() {
    setBusy(true); setError(null)
    try {
      if (!assigned.some(Boolean)) throw new Error("Pilih setidaknya satu foto untuk template.")
      let image: string
      if (mode === "upload") {
        if (!customFrame) throw new Error("Upload template terlebih dahulu.")
        image = await renderCustomFrame(customFrame, assigned)
      } else {
        const element = document.getElementById("photo-strip")
        if (!element) throw new Error("Preview template belum tersedia.")
        const html2canvas = (await import("html2canvas")).default
        const canvas = await html2canvas(element, { useCORS: true, backgroundColor: null, scale: 3 })
        image = canvas.toDataURL("image/png")
      }
      phaseRef.current = null; setPhase(null); setDeadline(null)
      setFinalImage(image); setStep("download")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal membuat hasil foto.")
    } finally { setBusy(false) }
  }
  finishingRef.current = () => { void generate() }

  function download() {
    if (!finalImage) return
    const link = document.createElement("a")
    link.href = finalImage; link.download = "arctabooth-" + Date.now() + ".png"; link.click()
  }

  function preview() {
    if (mode === "upload" && customFrame) {
      return <div className="space-y-2"><img src={customFrame.source} alt="Template upload" className="mx-auto max-h-[440px] max-w-full object-contain" /><p className="text-center text-xs text-muted-foreground">{slotCount} slot terdeteksi. Dekorasi template dipertahankan pada hasil akhir.</p></div>
    }
    return <PhotoStrip photos={assigned.map(photo => photo || "/placeholder.svg")} template={template} />
  }

  return (
    <main className="booth-app min-h-screen px-4 py-5 md:py-7">
      <div className="mx-auto max-w-6xl">
        <header className="booth-nav mb-7 flex items-center justify-between gap-3">
          <button onClick={reset} className="flex items-center gap-2.5 text-left" aria-label="Kembali ke beranda"><span className="brand-symbol"><Aperture className="h-5 w-5" /></span><span className="leading-tight"><strong className="block text-lg tracking-tight">ArctaBooth<span className="text-blue-600">.</span></strong><small className="block text-[10px] tracking-wide text-slate-500">Capture the moment</small></span></button>
          <div className="hidden items-center gap-9 text-sm font-medium text-slate-600 md:flex"><button onClick={reset} className="hover:text-blue-600">Home</button><button onClick={() => transition("template")} className="hover:text-blue-600">Photobooth</button><span className="text-slate-400">Made for memories</span></div>
          <button onClick={() => transition("template")} className="nav-start"><span className="hidden sm:inline">Start creating</span><Camera className="h-4 w-4" /></button>
        </header>
        {phase && <div className="mx-auto mb-5 flex max-w-sm items-center justify-between rounded-xl border bg-white px-5 py-3 text-sm text-slate-900"><strong>{phase === "template" ? "Pilih Template" : phase === "capture" ? "Sesi Foto" : "Finishing"}</strong><span className="font-mono text-xl font-bold text-blue-600" role="timer">{timeText}</span></div>}
        {step !== "welcome" && <nav aria-label="Tahap sesi" className="mb-8 flex flex-wrap justify-center gap-2 text-xs sm:text-sm">{(["template", "capture", "finishing", "download"] as Step[]).map((item, index) => <div key={item} className={"rounded-full border px-3 py-2 " + (step === item ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground")}>{index + 1}. {({ template: "Template", capture: "Foto", finishing: "Finishing", download: "Hasil" } as Record<string, string>)[item]}</div>)}</nav>}

        {step === "welcome" && <>
          <section className="booth-hero relative overflow-hidden"><div className="hero-orbit hero-orbit-one" /><div className="hero-orbit hero-orbit-two" /><div className="relative z-10 grid min-h-[475px] items-center gap-8 px-7 py-12 md:grid-cols-[.94fr_1.06fr] md:px-14 md:py-16"><div className="max-w-lg"><div className="hero-eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> YOUR OWN LITTLE PHOTO STUDIO <Sparkles className="h-4 w-4" /></div><h1 className="hero-heading mt-6">Every moment<br /><em>is yours.</em></h1><p className="mt-5 max-w-sm text-sm leading-7 text-slate-600 md:text-base">Choose a template, capture freely, and make the memories yours.</p><button onClick={() => transition("template")} className="hero-cta mt-7">Start Photobooth <span className="cta-arrow"><ArrowRight className="h-4 w-4" /></span></button><p className="mt-5 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-blue-600" /> No sign up. No installation. Just memories.</p></div><div className="hero-art relative mx-auto h-[315px] w-full max-w-[520px] md:h-[385px]" aria-label="Ilustrasi photo strip"><div className="hero-glow" /><div className="hero-strip hero-strip-back"><div className="mock-photo mock-photo-a"><Heart /></div><div className="mock-photo mock-photo-b"><Sparkles /></div><div className="mock-photo mock-photo-c"><Camera /></div><span>sweet memories ♡</span></div><div className="hero-strip hero-strip-front"><div className="mock-photo mock-photo-d"><Sparkles /></div><div className="mock-photo mock-photo-e"><Heart /></div><div className="mock-photo mock-photo-f"><Aperture /></div><span>arctabooth · 2026</span></div><div className="hero-sticker hero-sticker-one">✦</div><div className="hero-sticker hero-sticker-two">♡</div></div></div></section>
          <div className="booth-feature-bar relative z-20 mx-auto -mt-7 grid max-w-4xl gap-0 sm:grid-cols-3"><div className="feature-unit"><span className="feature-icon"><Camera className="h-5 w-5" /></span><span><strong>Snap your photos</strong><small>One shot at a time</small></span></div><div className="feature-unit"><span className="feature-icon"><ImageIcon className="h-5 w-5" /></span><span><strong>Choose your template</strong><small>Built-in or upload yours</small></span></div><div className="feature-unit"><span className="feature-icon"><Download className="h-5 w-5" /></span><span><strong>Save your memories</strong><small>Download your photo strip</small></span></div></div>
        </>}

        {step === "template" && <section className="booth-workspace space-y-6"><div className="text-center"><h1 className="text-3xl font-bold">Pilih Template</h1><p className="mt-2 text-muted-foreground">Pilih desain, bukan jumlah foto. Kamu punya waktu 2 menit dan bisa lanjut kapan saja.</p></div><div className="grid items-start gap-6 md:grid-cols-2"><div className="space-y-4"><div className="flex flex-wrap gap-2"><Button variant={mode === "builtin" ? "default" : "outline"} onClick={() => { setMode("builtin"); setAssignments({}); setError(null) }}>Template Bawaan</Button><Button variant={mode === "upload" ? "default" : "outline"} onClick={() => { setMode("upload"); setAssignments({}); setError(null) }}>Upload Template</Button></div>{mode === "builtin" ? <TemplateSelector templates={templates} selectedTemplate={template} onSelect={setTemplate} /> : <div className="space-y-3 rounded-xl border border-dashed p-5"><h2 className="font-semibold">Upload template sendiri</h2><p className="text-sm text-muted-foreground">PNG, JPG, atau WebP. Kotak hijau menandai area foto; jumlah slot dibaca otomatis.</p><input aria-label="Pilih file template" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => void uploadTemplate(event.target.files?.[0])} className="block w-full text-sm" />{customFrame && <p className="text-sm font-semibold">{customFrame.slots.length} slot foto terdeteksi</p>}</div>}</div><div className="space-y-4 rounded-xl border bg-muted/30 p-5"><h2 className="font-semibold">Preview template</h2>{preview()}</div></div>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<div className="flex justify-end"><Button disabled={busy || (mode === "upload" && !customFrame)} onClick={() => transition("capture")}>Mulai Sesi Foto <ArrowRight className="ml-2 h-4 w-4" /></Button></div></section>}

        {step === "capture" && <BrowserCheck><section className="booth-workspace space-y-5"><div className="text-center"><h1 className="text-3xl font-bold">Sesi Foto</h1><p className="mt-2 text-muted-foreground">Klik Start satu kali, lihat hasilnya, lalu pilih slot. Foto berikutnya hanya diambil setelah kamu klik Start lagi.</p></div><div className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(240px,1fr)]"><div className="space-y-4">{pending ? <div className="mx-auto max-w-md space-y-4"><img src={pending} alt="Preview foto baru" className="w-full rounded-lg" /><h2 className="font-semibold">Masukkan foto ini ke slot mana?</h2><div className="grid grid-cols-4 gap-2">{Array.from({ length: slotCount }, (_, i) => <Button key={i} size="sm" variant={selectedSlot === i ? "default" : "outline"} onClick={() => setSelectedSlot(i)}>Slot {i + 1}</Button>)}</div><div className="flex flex-wrap gap-2"><Button disabled={selectedSlot === null} onClick={() => savePending(selectedSlot)}>Insert ke Slot</Button><Button variant="outline" onClick={() => savePending(null)}>Simpan ke Galeri</Button><Button variant="outline" onClick={() => { setPending(null); setSelectedSlot(null) }}>Retake</Button></div></div> : <CameraView onCapture={setPending} autoCapture={false} remainingPhotos={1} />}<Button variant="outline" onClick={() => transition("finishing")}>Selesai Foto Lebih Awal</Button></div><aside className="space-y-4"><div className="rounded-xl border p-4"><h2 className="mb-3 font-semibold">Slot Template · {remaining}/{slotCount}</h2><div className="grid grid-cols-3 gap-2">{Array.from({ length: slotCount }, (_, i) => <div key={i} className="aspect-square overflow-hidden rounded border bg-muted">{assigned[i] ? <img src={assigned[i]} alt={"Slot " + (i + 1)} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Slot {i + 1}</div>}</div>)}</div></div><div><h2 className="mb-2 font-semibold">Galeri · {gallery.length} foto</h2><div className="grid grid-cols-3 gap-2">{gallery.map((photo, i) => <img key={i} src={photo} alt={"Galeri " + (i + 1)} className="aspect-square rounded object-cover" />)}</div></div></aside></div></section></BrowserCheck>}

        {step === "finishing" && <section className="booth-workspace space-y-6">
          <div className="text-center"><h1 className="text-3xl font-bold">Finishing · Drag & Drop</h1><p className="mt-2 text-muted-foreground">Tarik foto dari galeri ke slot template. Di HP, ketuk slot lalu ketuk foto yang diinginkan.</p></div>
          <div className="grid items-start gap-6 md:grid-cols-2">
            <div className="space-y-3 rounded-xl border bg-muted/30 p-5"><h2 className="font-semibold">Template · {slotCount} slot</h2>{slotBoard()}<p className="text-xs text-muted-foreground">Foto yang sama bisa digunakan di beberapa slot. Tarik foto lain untuk mengganti.</p></div>
            <div className="space-y-4"><h2 className="font-semibold">Galeri hasil foto ({gallery.length})</h2>{galleryBoard()}
              {gallery.length === 0 && <p className="text-sm text-muted-foreground">Belum ada foto di galeri.</p>}
              <p className="text-xs text-muted-foreground">Slot terpilih: {selectedSlot === null ? "belum ada" : selectedSlot + 1}. Klik slot, lalu klik foto sebagai alternatif drag & drop.</p>
              <Button onClick={() => void generate()} disabled={busy || !assigned.some(Boolean)}>{busy ? "Memproses..." : "Selesaikan & Lihat Hasil"}</Button>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            </div>
          </div>
          <div className="hidden" aria-hidden="true">{mode === "builtin" && <PhotoStrip photos={assigned.map(photo => photo || "/placeholder.svg")} template={template} />}</div>
        </section>}

        {step === "download" && finalImage && <section className="booth-workspace mx-auto max-w-2xl space-y-6 text-center"><div><h1 className="text-3xl font-bold">Your memories are ready!</h1><p className="mt-2 text-muted-foreground">Unduh hasil fotomu. Penyimpanan Google Drive dan QR masih dalam pengembangan.</p></div><img src={finalImage} alt="Hasil akhir photobooth" className="mx-auto max-h-[65vh] max-w-full rounded-lg border object-contain shadow-md" /><div className="flex flex-wrap justify-center gap-3"><Button onClick={download}><Download className="mr-2 h-4 w-4" /> Download PNG</Button><Button variant="outline" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" /> Sesi Baru</Button></div></section>}
      </div>
    </main>
  )
}
