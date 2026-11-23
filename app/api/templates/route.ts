import { NextResponse } from "next/server"
import { readdir } from "node:fs/promises"
import path from "node:path"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const directory = path.join(process.cwd(), "public", "templates")
    const files = (await readdir(directory)).filter(name => /\.(png|jpe?g|webp)$/i.test(name)).sort()
    return NextResponse.json({ templates: files.map(name => ({ name: name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "), url: "/templates/" + encodeURIComponent(name) })) })
  } catch {
    return NextResponse.json({ templates: [] })
  }
}
