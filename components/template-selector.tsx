"use client"

import type { templates } from "@/lib/templates"
import { Check, Sparkles } from "lucide-react"

interface TemplateSelectorProps {
  templates: typeof templates
  selectedTemplate: (typeof templates)[0]
  onSelect: (template: (typeof templates)[0]) => void
}

export default function TemplateSelector({ templates, selectedTemplate, onSelect }: TemplateSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div><h3 className="text-sm font-semibold text-slate-800">Koleksi template</h3><p className="text-xs text-muted-foreground">{templates.length} desain tersedia · pilih favoritmu</p></div>
        <Sparkles className="h-4 w-4 text-blue-500" aria-hidden="true" />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-4">
        {templates.map((item) => {
          const active = selectedTemplate.id === item.id
          const birthday = item.id === "birthday-ticket" || item.id === "birthday-vinyl"
          const ivory = item.id === "birthday-vinyl"
          return (
            <button key={item.id} type="button" onClick={() => onSelect(item)} aria-pressed={active}
              className={"group relative min-w-0 rounded-xl border p-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 " +
                (active ? "border-blue-500 bg-blue-50/70 shadow-sm ring-1 ring-blue-500" : "border-slate-200 bg-white hover:border-blue-200")}>
              <div className="relative flex h-[108px] items-center justify-center overflow-hidden rounded-lg bg-slate-100 sm:h-[124px]">
                <div className="relative h-[94px] w-[36px] overflow-hidden shadow-md sm:h-[108px] sm:w-[42px]"
                  style={{ background: birthday ? (ivory ? "#f5f2ed" : "#171717") : item.backgroundColor, border: item.border, borderRadius: item.borderRadius }}>
                  {birthday && <span className="absolute inset-x-0 top-1 text-center text-[5px] font-bold" style={{ color: ivory ? "#111" : "#fff" }}>Happy Birthday ♡</span>}
                  <div className={"absolute inset-x-[12%] flex flex-col gap-[4%] " + (birthday ? "top-[19%] bottom-[12%]" : "top-[12%] bottom-[12%]")}>
                    {[0, 1, 2].map(index => <div key={index} className="min-h-0 flex-1 rounded-[1px]" style={{ background: birthday ? "#5bbd46" : "#dbeafe", border: item.photoBorder }} />)}
                  </div>
                  {birthday && <span className="absolute bottom-1 inset-x-0 text-center text-[7px]">✦ ♡ ✦</span>}
                </div>
                {active && <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm"><Check className="h-3 w-3" /></span>}
              </div>
              <p className={"mt-2 truncate text-center text-[11px] font-medium sm:text-xs " + (active ? "text-blue-700" : "text-slate-700")} title={item.name}>{item.name}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
