export type FrameSlot = { x: number; y: number; width: number; height: number }
export type CustomFrame = { source: string; slots: FrameSlot[]; width: number; height: number }

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Gambar tidak dapat dibaca."))
    img.src = src
  })
}

function green(r: number, g: number, b: number): boolean {
  return g > 85 && g > r * 1.32 && g > b * 1.25 && g - Math.max(r, b) > 38
}

export async function analyzeFrame(source: string): Promise<CustomFrame> {
  const img = await loadImage(source)
  if (img.naturalWidth < 180 || img.naturalHeight < 300) throw new Error("Resolusi frame terlalu kecil.")
  const scale = Math.min(1, 700 / img.naturalWidth, 1400 / img.naturalHeight)
  const w = Math.round(img.naturalWidth * scale)
  const h = Math.round(img.naturalHeight * scale)
  const canvas = document.createElement("canvas")
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) throw new Error("Canvas tidak didukung.")
  ctx.drawImage(img, 0, 0, w, h)
  const data = ctx.getImageData(0, 0, w, h).data
  const mask = new Uint8Array(w * h)
  for (let i = 0; i < mask.length; i++) {
    const k = i * 4
    if (green(data[k], data[k+1], data[k+2])) mask[i] = 1
  }
  const components: { x: number; y: number; width: number; height: number; area: number }[] = []
  const queue = new Int32Array(w * h)
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] !== 1) continue
    let head = 0, tail = 1, minX = i % w, maxX = minX, minY = Math.floor(i / w), maxY = minY
    queue[0] = i; mask[i] = 2
    while (head < tail) {
      const p = queue[head++], x = p % w, y = Math.floor(p / w)
      minX = Math.min(minX, x); maxX = Math.max(maxX, x)
      minY = Math.min(minY, y); maxY = Math.max(maxY, y)
      const neighbors = [x > 0 ? p-1 : -1, x < w-1 ? p+1 : -1, y > 0 ? p-w : -1, y < h-1 ? p+w : -1]
      for (const n of neighbors) if (n >= 0 && mask[n] === 1) { mask[n] = 2; queue[tail++] = n }
    }
    const width = maxX-minX+1, height = maxY-minY+1
    if (tail > w*h*0.008 && width > w*0.12 && height > h*0.045 && tail/(width*height) > 0.5) {
      components.push({ x:minX, y:minY, width, height, area:tail })
    }
  }
  components.sort((a,b)=>a.y-b.y || a.x-b.x)
  if (!components.length) throw new Error("Area hijau tidak ditemukan. Gunakan frame dengan kotak hijau terang yang jelas.")
  if (components.length > 8) throw new Error("Terlalu banyak area hijau terdeteksi. Gunakan satu strip frame saja.")
  return { source, width:img.naturalWidth, height:img.naturalHeight, slots:components.map(c=>({
    x:Math.max(0,Math.round((c.x-1)/scale)), y:Math.max(0,Math.round((c.y-1)/scale)),
    width:Math.min(img.naturalWidth,Math.round((c.width+2)/scale)),
    height:Math.min(img.naturalHeight,Math.round((c.height+2)/scale))
  })) }
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, slot: FrameSlot) {
  const ratio = Math.max(slot.width / img.naturalWidth, slot.height / img.naturalHeight)
  const width = img.naturalWidth * ratio, height = img.naturalHeight * ratio
  ctx.drawImage(img, slot.x+(slot.width-width)/2, slot.y+(slot.height-height)/2, width, height)
}

export async function renderCustomFrame(frame: CustomFrame, photos: string[], filter = "none"): Promise<string> {
  if (frame.slots.length !== photos.length) throw new Error("Jumlah slot dan foto tidak sesuai.")
  const image = await loadImage(frame.source)
  const canvas = document.createElement("canvas")
  canvas.width = frame.width; canvas.height = frame.height
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) throw new Error("Canvas tidak didukung.")
  ctx.drawImage(image,0,0)
  const original = ctx.getImageData(0,0,canvas.width,canvas.height)
  const photoImages = await Promise.all(photos.map(photo => photo ? loadImage(photo) : Promise.resolve(null)))
  for (let i=0;i<frame.slots.length;i++) {
    const slot = frame.slots[i]
    if (!photoImages[i]) continue
    ctx.save(); ctx.beginPath(); ctx.rect(slot.x,slot.y,slot.width,slot.height); ctx.clip()
    ctx.filter = filter
    drawCover(ctx,photoImages[i]!,slot); ctx.restore()
  }
  const output = ctx.getImageData(0,0,canvas.width,canvas.height)
  // Keep every non-green original pixel above the photos, including stickers intruding into the slots.
  for (const slot of frame.slots) {
    const endY = Math.min(canvas.height,slot.y+slot.height), endX = Math.min(canvas.width,slot.x+slot.width)
    for (let y=slot.y;y<endY;y++) for(let x=slot.x;x<endX;x++) {
      const k=(y*canvas.width+x)*4
      const r=original.data[k],g=original.data[k+1],b=original.data[k+2]
      if (!green(r,g,b)) {
        const a=original.data[k+3]/255
        for(let c=0;c<3;c++) output.data[k+c]=Math.round(original.data[k+c]*a+output.data[k+c]*(1-a))
        output.data[k+3]=255
      }
    }
  }
  ctx.putImageData(output,0,0)
  return canvas.toDataURL("image/png")
}
