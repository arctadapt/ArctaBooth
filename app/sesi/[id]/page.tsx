import Link from "next/link"

type Media = { name: string; url: string; type: string }
export const dynamic = "force-dynamic"

export default async function SessionPage({ params, searchParams }: { params: { id: string }; searchParams: { manifest?: string } }) {
  let media: Media[] = []
  try {
    const url = searchParams.manifest
    if (url) {
      const parsed = new URL(url)
      if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".public.blob.vercel-storage.com") || !parsed.pathname.includes("/sessions/" + params.id + "/manifest.json")) throw new Error("Invalid manifest")
      const response = await fetch(url, { cache: "no-store" })
      if (!response.ok) throw new Error("Manifest not found")
      const data = await response.json()
      if (Array.isArray(data.media)) media = data.media.filter((item: Media) => typeof item.url === "string" && item.url.startsWith("https://") && /^(image|video)\//.test(item.type)).slice(0, 40)
    }
  } catch { /* Show empty state */ }
  return <main className="mx-auto min-h-screen max-w-4xl space-y-7 px-5 py-10"><header className="text-center"><h1 className="text-3xl font-bold">ArctaBooth · Hasil Sesimu</h1><p className="mt-2 text-slate-500">Kenangan yang bisa kamu simpan dari perangkat mana saja.</p></header>{media.length ? <div className="grid gap-5 sm:grid-cols-2">{media.map((item, i) => <article key={i} className="overflow-hidden rounded-2xl border bg-white p-4 shadow-sm">{item.type.startsWith("video/") ? <video src={item.url} controls className="max-h-[500px] w-full rounded-xl" /> : <img src={item.url} alt={item.name} className="max-h-[500px] w-full rounded-xl object-contain" />}<div className="mt-3 flex items-center justify-between gap-3"><span className="truncate text-sm">{item.name}</span><a href={item.url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Buka / Unduh</a></div></article>)}</div> : <p className="rounded-xl border p-6 text-center">Hasil sesi tidak ditemukan atau tautan tidak lengkap.</p>}<p className="text-center"><Link href="/" className="text-blue-600 underline">Kembali ke ArctaBooth</Link></p></main>
}
