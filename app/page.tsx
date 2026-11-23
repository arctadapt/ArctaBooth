"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { upload } from "@vercel/blob/client"
import SessionMedia from "@/components/session-media"
import { analyzeFrame, renderCustomFrame, type CustomFrame } from "@/lib/custom-frame"
import CameraView from "@/components/camera-view"
import PhotoStrip from "@/components/photo-strip"
import BrowserCheck from "@/components/browser-check"
import { Button } from "@/components/ui/button"
import { templates, photoFilters } from "@/lib/templates"
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
  const [builtinTemplates, setBuiltinTemplates] = useState<{ name: string; url: string }[]>([])
  const [selectedBuiltin, setSelectedBuiltin] = useState<string | null>(null)
  const [mode, setMode] = useState<"builtin" | "upload">("builtin")
  const [customFrame, setCustomFrame] = useState<CustomFrame | null>(null)
  const [gallery, setGallery] = useState<string[]>([])
  const [assignments, setAssignments] = useState<Record<number, number>>({})
  const [pending, setPending] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [draggingPhoto, setDraggingPhoto] = useState<number | null>(null)
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null)
  const [finalImage, setFinalImage] = useState<string | null>(null)
  const [sessionGif, setSessionGif] = useState<Blob | null>(null)
  const [takeGifs, setTakeGifs] = useState<Blob[]>([])
  const [takeFrames, setTakeFrames] = useState<string[][]>([])
  const [mediaReady, setMediaReady] = useState(false)
  const [sessionVideo, setSessionVideo] = useState<Blob | null>(null)
  const [cameraVideo, setCameraVideo] = useState<Blob | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [emailSending, setEmailSending] = useState(false)
  const [emailStatus, setEmailStatus] = useState<string | null>(null)
  const uploadStartedRef = useRef(false)
  const [selectedFilter, setSelectedFilter] = useState(photoFilters[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const phaseRef = useRef<Phase | null>(null)
  const finishingRef = useRef<() => void>(() => {})
  const slotCount = customFrame ? customFrame.slots.length : 3
  useEffect(() => {
    let cancelled = false
    fetch("/api/templates").then(response => response.json()).then(async (data: { templates: { name: string; url: string }[] }) => {
      if (cancelled) return
      setBuiltinTemplates(data.templates)
      if (data.templates.length) {
        setSelectedBuiltin(data.templates[0].url)
        try { setCustomFrame(await analyzeFrame(data.templates[0].url)) }
        catch (cause) { setError(cause instanceof Error ? cause.message : "Template tidak dapat dibaca.") }
      }
    }).catch(() => { if (!cancelled) setError("Gagal memuat template bawaan.") })
    return () => { cancelled = true }
  }, [])

  async function chooseBuiltin(url: string) {
    setBusy(true); setError(null); setSelectedBuiltin(url); setAssignments({})
    try { setCustomFrame(await analyzeFrame(url)) }
    catch (cause) { setCustomFrame(null); setError(cause instanceof Error ? cause.message : "Template tidak dapat dibaca.") }
    finally { setBusy(false) }
  }

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
    setFinalImage(null); setSessionGif(null); setTakeGifs([]); setTakeFrames([]); setMediaReady(false); setSessionVideo(null); setCameraVideo(null); setShareUrl(null); setShareError(null); setEmail(""); setEmailStatus(null); uploadStartedRef.current = false; setMode("builtin"); setSelectedFilter(photoFilters[0]); setError(null)
  }

  function placePhoto(slot: number, photoIndex: number) {
    if (photoIndex < 0 || photoIndex >= gallery.length) return
    setAssignments(previous => ({ ...previous, [slot]: photoIndex }))
    setSelectedSlot(slot)
    setHoveredSlot(null)
  }

  function dropPhoto(event: React.DragEvent<HTMLElement>, slot: number) {
    if (event.dataTransfer.getData("application/x-arctabooth-pending") === "true") {
      event.preventDefault(); savePending(slot); setHoveredSlot(null); return
    }
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
        {assigned[index] ? <img src={assigned[index]} alt={"Foto slot " + (index + 1)} className="h-full w-full object-cover" style={{ filter: selectedFilter.filter }} draggable={false} /> :
          <span className="rounded bg-white/85 px-2 py-1 text-xs font-semibold text-slate-700">Slot {index + 1}</span>}
        {hoveredSlot === index && <span className="absolute inset-0 flex items-center justify-center bg-blue-500/25 text-sm font-bold text-white">Lepas di sini</span>}
      </button>
    )
    if (customFrame) {
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
      if (customFrame) {
        image = await renderCustomFrame(customFrame, assigned, selectedFilter.filter)
      } else {
        const element = document.getElementById("photo-strip")
        if (!element) throw new Error("Preview template belum tersedia.")
        const html2canvas = (await import("html2canvas")).default
        const canvas = await html2canvas(element, { useCORS: true, backgroundColor: null, scale: 3, onclone: document => { const strip = document.getElementById("photo-strip"); if (strip) strip.style.filter = selectedFilter.filter } })
        image = canvas.toDataURL("image/png")
      }
      phaseRef.current = null; setPhase(null); setDeadline(null)
      setFinalImage(image); setSessionGif(null); setTakeGifs([]); setMediaReady(false); uploadStartedRef.current = false; setSessionVideo(cameraVideo); setShareUrl(null); setStep("download")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal membuat hasil foto.")
    } finally { setBusy(false) }
  }
  finishingRef.current = () => { void generate() }

  async function createShareLink() {
    if (!finalImage || sharing) return
    setSharing(true); setShareError(null)
    try {
      const files: File[] = []
      const imageBlob = await (await fetch(finalImage)).blob()
      files.push(new File([imageBlob], "hasil-photobooth.png", { type: "image/png" }))
      for (let i = 0; i < gallery.length; i++) {
        const photoBlob = await (await fetch(gallery[i])).blob()
        files.push(new File([photoBlob], "foto-" + (i + 1) + ".png", { type: "image/png" }))
      }
      if (sessionGif) files.push(new File([sessionGif], "gif-semua-foto.gif", { type: "image/gif" }))
      takeGifs.forEach((blob, index) => files.push(new File([blob], "gif-take-" + (index + 1) + ".gif", { type: "image/gif" })))
      if (sessionVideo) files.push(new File([sessionVideo], sessionVideo.type === "video/mp4" ? "video-sesi.mp4" : "video-sesi.webm", { type: sessionVideo.type || "video/webm" }))
      if (!mediaReady) throw new Error("GIF masih diproses. Tunggu sebentar.")
      const sessionId = crypto.randomUUID()
      const media: { name: string; url: string; type: string }[] = []
      for (const file of files) {
        const uploaded = await upload("sessions/" + sessionId + "/" + file.name, file, {
          access: "public",
          handleUploadUrl: "/api/sessions/upload",
          contentType: file.type,
        })
        media.push({ name: file.name, url: uploaded.url, type: file.type })
      }
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, media }),
      })
      const raw = await response.text()
      let data: { shareUrl?: string; error?: string } = {}
      try { data = JSON.parse(raw) } catch {
        throw new Error(response.status === 413 ? "Ukuran upload terlalu besar." : "Server gagal membuat QR (HTTP " + response.status + "). Coba ulangi.")
      }
      if (!response.ok || !data.shareUrl) throw new Error(data.error || "Gagal membuat tautan.")
      setShareUrl(data.shareUrl)
    } catch (cause) { setShareError(cause instanceof Error ? cause.message : "Gagal mengunggah hasil sesi.") }
    finally { setSharing(false) }
  }

  useEffect(() => {
    if (step !== "download" || !finalImage || !mediaReady || uploadStartedRef.current) return
    uploadStartedRef.current = true
    void createShareLink()
  }, [step, finalImage, mediaReady])

  async function sendSessionEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!shareUrl || emailSending) return
    setEmailSending(true); setEmailStatus(null)
    try {
      const response = await fetch("/api/sessions/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), shareUrl }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Gagal mengirim email.")
      setEmailStatus("Tautan hasil sesi berhasil dikirim ke email.")
    } catch (cause) { setEmailStatus(cause instanceof Error ? cause.message : "Gagal mengirim email.") }
    finally { setEmailSending(false) }
  }

  const handleMediaChange = useCallback((media: { compilation: Blob | null; takes: Blob[] }) => {
    setSessionGif(media.compilation); setTakeGifs(media.takes); setMediaReady(true); setShareUrl(null)
  }, [])

  function download() {
    if (!finalImage) return
    const link = document.createElement("a")
    link.href = finalImage; link.download = "arctabooth-" + Date.now() + ".png"; link.click()
  }

  function preview() {
    if (customFrame) {
      return <div className="space-y-2"><img src={customFrame.source} alt="Template upload" className="mx-auto max-h-[440px] max-w-full object-contain" /><p className="text-center text-xs text-muted-foreground">{slotCount} slot terdeteksi. Dekorasi template dipertahankan pada hasil akhir.</p></div>
    }
    return <div style={{ filter: selectedFilter.filter }}><PhotoStrip photos={assigned.map(photo => photo || "/placeholder.svg")} template={template} /></div>
  }

  return (
    <main className="booth-app min-h-screen px-3 py-3 sm:px-5 sm:py-4 lg:h-dvh lg:overflow-hidden">
      <div className="mx-auto max-w-[1440px]">
        <header className="booth-nav mb-3 flex items-center justify-between gap-3">
          <button onClick={reset} className="flex items-center gap-2.5 text-left" aria-label="Kembali ke beranda"><span className="brand-symbol"><Aperture className="h-5 w-5" /></span><span className="leading-tight"><strong className="block text-lg tracking-tight">ArctaBooth<span className="text-blue-600">.</span></strong><small className="block text-[10px] tracking-wide text-slate-500">Capture the moment</small></span></button>
          <div className="hidden items-center gap-9 text-sm font-medium text-slate-600 md:flex"><button onClick={reset} className="hover:text-blue-600">Home</button><button onClick={() => transition("template")} className="hover:text-blue-600">Photobooth</button><span className="text-slate-400">Made for memories</span></div>
          <button onClick={() => transition("template")} className="nav-start"><span className="hidden sm:inline">Start creating</span><Camera className="h-4 w-4" /></button>
        </header>
        {phase && <div className="mx-auto mb-2 flex max-w-sm items-center justify-between rounded-xl border bg-white px-5 py-3 text-sm text-slate-900"><strong>{phase === "template" ? "Pilih Template" : phase === "capture" ? "Sesi Foto" : "Finishing"}</strong><span className="font-mono text-xl font-bold text-blue-600" role="timer">{timeText}</span></div>}
        {step !== "welcome" && <nav aria-label="Tahap sesi" className="mb-3 flex flex-wrap justify-center gap-2 text-xs sm:text-sm">{(["template", "capture", "finishing", "download"] as Step[]).map((item, index) => <div key={item} className={"rounded-full border px-3 py-2 " + (step === item ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground")}>{index + 1}. {({ template: "Template", capture: "Foto", finishing: "Finishing", download: "Hasil" } as Record<string, string>)[item]}</div>)}</nav>}

        {step === "welcome" && <>
          <section className="booth-hero relative overflow-hidden"><div className="hero-orbit hero-orbit-one" /><div className="hero-orbit hero-orbit-two" /><div className="relative z-10 grid min-h-[475px] items-center gap-8 px-7 py-12 md:grid-cols-[.94fr_1.06fr] md:px-14 md:py-16"><div className="max-w-lg"><div className="hero-eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> YOUR OWN LITTLE PHOTO STUDIO <Sparkles className="h-4 w-4" /></div><h1 className="hero-heading mt-6">Every moment<br /><em>is yours.</em></h1><p className="mt-5 max-w-sm text-sm leading-7 text-slate-600 md:text-base">Choose a template, capture freely, and make the memories yours.</p><button onClick={() => transition("template")} className="hero-cta mt-7">Start Photobooth <span className="cta-arrow"><ArrowRight className="h-4 w-4" /></span></button><p className="mt-5 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-blue-600" /> No sign up. No installation. Just memories.</p></div><div className="hero-art relative mx-auto h-[315px] w-full max-w-[520px] md:h-[385px]" aria-label="Ilustrasi photo strip"><div className="hero-glow" /><div className="hero-strip hero-strip-back"><div className="mock-photo mock-photo-a"><Heart /></div><div className="mock-photo mock-photo-b"><Sparkles /></div><div className="mock-photo mock-photo-c"><Camera /></div><span>sweet memories ♡</span></div><div className="hero-strip hero-strip-front"><div className="mock-photo mock-photo-d"><Sparkles /></div><div className="mock-photo mock-photo-e"><Heart /></div><div className="mock-photo mock-photo-f"><Aperture /></div><span>arctabooth · 2026</span></div><div className="hero-sticker hero-sticker-one">✦</div><div className="hero-sticker hero-sticker-two">♡</div></div></div></section>
          <div className="booth-feature-bar relative z-20 mx-auto -mt-7 grid max-w-4xl gap-0 sm:grid-cols-3"><div className="feature-unit"><span className="feature-icon"><Camera className="h-5 w-5" /></span><span><strong>Snap your photos</strong><small>One shot at a time</small></span></div><div className="feature-unit"><span className="feature-icon"><ImageIcon className="h-5 w-5" /></span><span><strong>Choose your template</strong><small>Built-in or upload yours</small></span></div><div className="feature-unit"><span className="feature-icon"><Download className="h-5 w-5" /></span><span><strong>Save your memories</strong><small>Download your photo strip</small></span></div></div>
        </>}

        {step === "template" && <section className="booth-workspace mx-auto max-w-7xl space-y-3 lg:max-h-[calc(100dvh-155px)] lg:overflow-auto"><div className="text-center"><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pilih Template</h1><p className="mt-1 text-sm text-muted-foreground">Pilih desain favoritmu, lalu mulai sesi foto.</p></div><div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(260px,0.7fr)]"><div className="space-y-4"><div className="flex flex-wrap gap-2"><Button variant={mode === "builtin" ? "default" : "outline"} onClick={() => { setMode("builtin"); setAssignments({}); setError(null); if (selectedBuiltin) void chooseBuiltin(selectedBuiltin) }}>Template Bawaan</Button><Button variant={mode === "upload" ? "default" : "outline"} onClick={() => { setMode("upload"); setCustomFrame(null); setAssignments({}); setError(null) }}>Upload Template</Button></div>{mode === "builtin" ? <div className="space-y-3"><p className="text-sm font-semibold">Koleksi Template · {builtinTemplates.length} desain</p><div className="grid grid-cols-3 gap-3">{builtinTemplates.map(item => <button type="button" key={item.url} onClick={() => void chooseBuiltin(item.url)} aria-pressed={selectedBuiltin === item.url} className={"rounded-xl border-2 p-2 transition-all hover:-translate-y-0.5 hover:shadow-md " + (selectedBuiltin === item.url ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white")}><img src={item.url} alt={item.name} className="mx-auto h-24 w-full rounded-lg object-contain lg:h-28" /><p className="mt-2 truncate text-xs font-semibold capitalize">{item.name}</p></button>)}</div>{!builtinTemplates.length && <p className="text-sm text-muted-foreground">Belum ada gambar di public/templates.</p>}</div> : <div className="space-y-3 rounded-xl border border-dashed p-5"><h2 className="font-semibold">Upload template sendiri</h2><p className="text-sm text-muted-foreground">PNG, JPG, atau WebP. Kotak hijau menandai area foto; jumlah slot dibaca otomatis.</p><input aria-label="Pilih file template" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => void uploadTemplate(event.target.files?.[0])} className="block w-full text-sm" />{customFrame && <p className="text-sm font-semibold">{customFrame.slots.length} slot foto terdeteksi</p>}</div>}</div><div className="space-y-3 rounded-2xl border bg-slate-50/70 p-4"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Preview template</h2><span className="rounded-full bg-white px-2 py-1 text-[10px] text-slate-500">Live preview</span></div><div className="mx-auto max-w-[200px]">{preview()}</div><p className="text-center text-xs text-muted-foreground">{customFrame ? customFrame.slots.length + " slot foto" : "Pilih template"}</p></div></div>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<div className="flex justify-end"><Button disabled={busy || !customFrame} onClick={() => transition("capture")}>Mulai Sesi Foto <ArrowRight className="ml-2 h-4 w-4" /></Button></div></section>}

        {step === "capture" && <BrowserCheck><section className="booth-workspace space-y-3 lg:max-h-[calc(100dvh-155px)] lg:overflow-auto"><div className="text-center"><h1 className="text-3xl font-bold">Sesi Foto</h1><p className="mt-2 text-muted-foreground">Klik Start, lalu tarik foto hasil jepretan ke slot template. Foto dari galeri juga bisa ditarik untuk mengganti slot.</p></div><div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(270px,0.8fr)]"><div className="space-y-4">{pending && <div className="mx-auto max-w-sm space-y-2"><div draggable onDragStart={event => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-arctabooth-pending", "true") }} onDragEnd={() => setHoveredSlot(null)} className="cursor-grab rounded-lg border-2 border-dashed border-blue-400 p-2"><img src={pending} alt="Tarik foto baru ke slot" className="mx-auto max-h-[30vh] w-auto rounded-lg object-contain" draggable={false} /><p className="py-2 text-center text-sm font-semibold text-blue-600">Tarik foto ke slot template</p></div><h2 className="font-semibold">Tarik foto ke slot template, atau ketuk slot tujuan.</h2><div className="grid grid-cols-4 gap-2">{Array.from({ length: slotCount }, (_, i) => <Button key={i} size="sm" variant={selectedSlot === i ? "default" : "outline"} onClick={() => setSelectedSlot(i)}>Slot {i + 1}</Button>)}</div><div className="flex flex-wrap gap-2"><Button disabled={selectedSlot === null} onClick={() => savePending(selectedSlot)}>Insert ke Slot</Button><Button variant="outline" onClick={() => savePending(null)}>Simpan ke Galeri</Button><Button variant="outline" onClick={() => { setPending(null); setSelectedSlot(null) }}>Retake</Button></div></div>}<div className={pending ? "hidden" : ""}><CameraView onCapture={setPending} onVideoCapture={blob => { setCameraVideo(blob); setSessionVideo(blob) }} onTakeFrames={frames => setTakeFrames(previous => [...previous, frames])} autoCapture={false} remainingPhotos={1} /></div><Button variant="outline" onClick={() => transition("finishing")}>Selesai Foto Lebih Awal</Button></div><aside className="space-y-4"><div className="rounded-xl border p-4"><h2 className="mb-3 font-semibold">Slot Template · {remaining}/{slotCount}</h2><div className="grid grid-cols-3 gap-2">{Array.from({ length: slotCount }, (_, i) => <div key={i} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setHoveredSlot(i) }} onDragLeave={() => setHoveredSlot(null)} onDrop={event => dropPhoto(event, i)} onClick={() => { if (pending) savePending(i); else if (draggingPhoto !== null) placePhoto(i, draggingPhoto); else setSelectedSlot(i) }} role="button" tabIndex={0} aria-label={"Drop foto ke slot " + (i + 1)} className={"aspect-square cursor-pointer overflow-hidden rounded border-2 bg-muted " + (hoveredSlot === i ? "border-blue-500 ring-2 ring-blue-400" : "border-slate-300")}>{assigned[i] ? <img src={assigned[i]} alt={"Slot " + (i + 1)} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Slot {i + 1}</div>}</div>)}</div></div><div><h2 className="mb-2 font-semibold">Galeri · {gallery.length} foto</h2><div className="grid grid-cols-3 gap-2">{gallery.map((photo, i) => <img key={i} src={photo} alt={"Galeri " + (i + 1)} draggable onDragStart={event => { setDraggingPhoto(i); event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("text/plain", String(i)) }} onDragEnd={() => { setDraggingPhoto(null); setHoveredSlot(null) }} onClick={() => { if (selectedSlot !== null) placePhoto(selectedSlot, i); else setDraggingPhoto(i) }} className="aspect-square cursor-grab rounded object-cover" />)}</div></div></aside></div></section></BrowserCheck>}

        {step === "finishing" && <section className="booth-workspace space-y-3 lg:max-h-[calc(100dvh-155px)] lg:overflow-auto">
          <div className="text-center"><h1 className="text-3xl font-bold">Finishing · Drag & Drop</h1><p className="mt-2 text-muted-foreground">Tarik foto dari galeri ke slot template. Di HP, ketuk slot lalu ketuk foto yang diinginkan.</p></div>
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="space-y-3 rounded-xl border bg-muted/30 p-5"><h2 className="font-semibold">Template · {slotCount} slot</h2><p className="text-xs text-muted-foreground">Filter langsung terlihat pada foto di setiap slot.</p>{slotBoard()}<p className="text-xs text-muted-foreground">Foto yang sama bisa digunakan di beberapa slot. Tarik foto lain untuk mengganti.</p></div>
            <div className="space-y-4"><h2 className="font-semibold">Filter Foto</h2><div className="flex flex-wrap gap-2">{photoFilters.map(filter => <Button key={filter.id} size="sm" variant={selectedFilter.id === filter.id ? "default" : "outline"} onClick={() => setSelectedFilter(filter)}>{filter.name}</Button>)}</div><h2 className="font-semibold">Galeri hasil foto ({gallery.length})</h2>{galleryBoard()}
              {gallery.length === 0 && <p className="text-sm text-muted-foreground">Belum ada foto di galeri.</p>}
              <p className="text-xs text-muted-foreground">Slot terpilih: {selectedSlot === null ? "belum ada" : selectedSlot + 1}. Klik slot, lalu klik foto sebagai alternatif drag & drop.</p>
              <Button onClick={() => void generate()} disabled={busy || !assigned.some(Boolean)}>{busy ? "Memproses..." : "Selesaikan & Lihat Hasil"}</Button>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            </div>
          </div>
          <div className="absolute -left-[9999px] top-0 pointer-events-none" aria-hidden="true">{mode === "builtin" && <div style={{ filter: selectedFilter.filter }}><PhotoStrip photos={assigned.map(photo => photo || "/placeholder.svg")} template={template} /></div>}</div>
        </section>}

        {step === "download" && finalImage && <section className="booth-workspace mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-3 text-center lg:min-h-[calc(100dvh-175px)]">
          <div className="space-y-2"><h1 className="text-3xl font-bold">Your memories are ready!</h1><p className="text-muted-foreground">Scan QR Code atau kirim tautan ke email untuk mengakses semua foto, GIF, dan video.</p></div>
          <div className="hidden" aria-hidden="true"><SessionMedia photos={gallery} takeFrames={takeFrames} cameraVideo={cameraVideo} onMediaChange={handleMediaChange} /></div>
          {shareUrl ? <div className="grid w-full items-center gap-5 rounded-3xl border bg-white p-5 shadow-sm sm:grid-cols-[minmax(240px,0.85fr)_minmax(0,1.15fr)] lg:p-7">
            <div className="flex flex-col items-center justify-center gap-3"><QRCodeSVG value={shareUrl} size={210} level="M" marginSize={2} /><p className="text-xs font-medium text-slate-500">Scan QR untuk membuka Google Drive</p></div>
            
            
            <form onSubmit={event => void sendSessionEmail(event)} className="w-full space-y-3 text-left">
              <label htmlFor="session-email" className="block text-left text-sm font-semibold">Kirim hasil ke email</label>
              <input id="session-email" type="email" required autoComplete="email" placeholder="nama@email.com" value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded-xl border px-4 py-3 text-sm text-slate-900" />
              <Button type="submit" disabled={emailSending} className="w-full">{emailSending ? "Mengirim..." : "Kirim ke Email"}</Button>
              {emailStatus && <p role="status" className="text-sm text-slate-600">{emailStatus}</p>}<Button type="button" variant="outline" className="w-full" onClick={() => void navigator.clipboard.writeText(shareUrl)}>Salin Tautan Google Drive</Button>
            </form>
          </div> : <div className="w-full space-y-3 rounded-2xl border p-8"><div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" /><p className="text-sm text-slate-600">{sharing ? "Mengunggah semua hasil sesi..." : mediaReady ? "Menyiapkan QR Code..." : "Menyiapkan foto, GIF, dan video..."}</p>{shareError && <p role="alert" className="text-sm text-red-600">{shareError}</p>}{shareError && <Button variant="outline" onClick={() => void createShareLink()}>Coba Lagi</Button>}</div>}
          <Button variant="ghost" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" /> Sesi Baru</Button>
        </section>}
      </div>
    </main>
  )
}
