"use client"

import { useRef, useEffect } from "react"
import type { templates } from "@/lib/templates"

interface PhotoStripProps {
  photos: string[]
  template: (typeof templates)[0]
}

export default function PhotoStrip({ photos, template }: PhotoStripProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Adjust container height based on width to maintain aspect ratio
    const updateHeight = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth
        // Untuk 3 foto persegi dengan sedikit ruang di antara
        containerRef.current.style.height = `${width * (photos.length + 0.45)}px`
      }
    }

    updateHeight()
    window.addEventListener("resize", updateHeight)
    return () => window.removeEventListener("resize", updateHeight)
  }, [photos.length])

  const isLayered = template.id === "birthday-ticket" || template.id === "birthday-vinyl"
  if (isLayered && photos.length >= 3) {
    const ivory = template.id === "birthday-vinyl"
    return (
      <div id="photo-strip" className="relative mx-auto w-full max-w-[300px] overflow-hidden" style={{ aspectRatio: "1 / 3", background: ivory ? "#f5f2ed" : "#171717", color: ivory ? "#111" : "#fff", fontFamily: "Georgia, serif" }}>
        <div className="absolute inset-0 opacity-[.12] pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(45deg,transparent,transparent 2px,#888 3px,transparent 4px)" }} />
        <div className="absolute left-[5%] top-[1%] z-30 text-[10px] font-semibold">ArctaBooth</div>
        <div className="absolute right-[3%] top-[1%] z-30 flex h-[16%] w-[43%] items-center justify-center rounded-full border-[5px] border-white bg-black text-white shadow-lg" style={{ transform: "translate(10%,-28%)" }}>
          <div className="h-[22%] w-[22%] rounded-full bg-white text-center text-black">•</div>
        </div>
        <div className="absolute left-[9%] top-[6%] z-10 flex h-[12%] w-[82%] flex-col items-center justify-center border-2 border-current text-center" style={{ background: ivory ? "#171717" : "#f5f2ed", color: ivory ? "#fff" : "#171717" }}>
          <span className="text-[clamp(13px,4vw,22px)] italic leading-tight">Happy Birthday</span>
          <span className="text-[9px] italic tracking-wide">a little love, a little jazz ♡</span>
        </div>
        {photos.slice(0,3).map((photo,index) => (
          <div key={index} className="absolute left-[11%] w-[78%] overflow-hidden border-[3px]" style={{ top: (20 + index * 24.5) + "%", height: "23%", borderColor: ivory ? "#111" : "#fff", background: "#5bbd46" }}>
            <img src={photo} alt={"Foto " + (index+1)} className="h-full w-full object-cover" crossOrigin="anonymous" style={{ filter: template.photoFilter }} />
          </div>
        ))}
        {/* All decorations intentionally render AFTER photos, so export keeps them above the photos. */}
        <div className="pointer-events-none absolute inset-0 z-20">
          <div className="absolute left-[3%] top-[18%] rotate-[-18deg] text-[38px] drop-shadow-md">🎉</div>
          <div className="absolute right-[2%] top-[38%] rotate-[12deg] text-[39px] drop-shadow-md">🌹</div>
          <div className="absolute left-[1%] top-[63%] rotate-[-15deg] text-[36px] drop-shadow-md">🎀</div>
          <div className="absolute right-[3%] top-[78%] rotate-[15deg] text-[31px] drop-shadow-md">✨</div>
          <div className="absolute left-[3%] top-[41%] rotate-[-13deg] text-[20px] font-bold italic" style={{ color: ivory ? "#222" : "#fff", textShadow: ivory ? "1px 1px #fff" : "1px 1px #000" }}>20</div>
          <div className="absolute bottom-[1%] left-0 w-full text-center text-[12px] italic">memories, forever ♡</div>
        </div>
      </div>
    )
  }

  if (photos.length < 3) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[300px] mx-auto"
      style={{ backgroundColor: template.backgroundColor }}
    >
      <div
        id="photo-strip"
        className="w-full h-full relative overflow-hidden"
        style={{
          backgroundColor: template.backgroundColor,
          borderRadius: template.borderRadius,
          border: template.border,
          backgroundImage: template.backgroundImage,
          backgroundSize: template.backgroundSize,
        }}
      >
        {/* Template Header */}
        {template.showHeader && (
          <div
            className="absolute top-0 left-0 right-0 z-10 p-4 text-center"
            style={{
              color: template.headerTextColor,
              fontFamily: template.fontFamily,
            }}
          >
            <h2 className="text-xl font-bold">{template.headerText}</h2>
          </div>
        )}

        {/* Photos */}
        <div className="flex flex-col h-full">
          {photos.map((photo, index) => (
            <div
              key={index}
              className="relative flex-1"
              style={{
                padding: template.spacing,
                backgroundColor: "transparent",
              }}
            >
              <div
                className="w-full aspect-square relative overflow-hidden"
                style={{
                  borderRadius: template.photoBorderRadius,
                  border: template.photoBorder,
                  boxShadow: template.photoShadow,
                }}
              >
                {/* Gunakan key yang unik berdasarkan URL foto untuk memaksa re-render saat foto berubah */}
                <img
                  key={photo}
                  src={photo || "/placeholder.svg"}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                  style={{
                    filter: template.photoFilter,
                  }}
                />

                {template.showPhotoNumber && (
                  <div
                    className="absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: template.photoNumberBgColor,
                      color: template.photoNumberColor,
                    }}
                  >
                    {index + 1}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Template Footer */}
        {template.showFooter && (
          <div
            className="absolute bottom-0 left-0 right-0 z-10 p-4 text-center"
            style={{
              color: template.footerTextColor,
              fontFamily: template.fontFamily,
            }}
          >
            <p className="text-sm">{template.footerText}</p>
          </div>
        )}
      </div>
    </div>
  )
}

