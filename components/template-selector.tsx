"use client"

import type { templates } from "@/lib/templates"
import { Card, CardContent } from "@/components/ui/card"
import { Check } from "lucide-react"

interface TemplateSelectorProps {
  templates: typeof templates
  selectedTemplate: (typeof templates)[0]
  onSelect: (template: (typeof templates)[0]) => void
}

export default function TemplateSelector({ templates, selectedTemplate, onSelect }: TemplateSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Pilih Template</h3>

      <div className="grid grid-cols-2 gap-3">
        {templates.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all ${
              selectedTemplate.id === template.id ? "ring-2 ring-primary" : "hover:bg-accent"
            }`}
            onClick={() => onSelect(template)}
          >
            <CardContent className="p-3">
              <div className="relative">
                {/* Tambahkan background checker pattern untuk template yang terang */}
                <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGElEQVQYlWNgYGCQwoKxgqGgcJA5h3yFAAs8BRWVSwooAAAAAElFTkSuQmCC')] opacity-10" />

                {(template.id === "birthday-ticket" || template.id === "birthday-vinyl") ? (
                  <div className="relative aspect-[1/3] overflow-hidden border" style={{ background: template.id === "birthday-vinyl" ? "#f5f2ed" : "#171717", color: template.id === "birthday-vinyl" ? "#171717" : "#fff" }}>
                    <div className="absolute left-[7%] top-[5%] w-[86%] border border-current py-2 text-center text-[10px] italic">Happy Birthday ♡</div>
                    {[0,1,2].map((i)=><div key={i} className="absolute left-[11%] w-[78%] border-2 border-current bg-[#5bbd46]" style={{ top: (20 + i*24.5) + "%", height: "23%" }} />)}
                    <span className="absolute right-0 top-[40%] text-xl">🌹</span><span className="absolute left-0 top-[64%] text-xl">🎀</span>
                  </div>
                ) : (
                <div
                  className="w-full aspect-[1/3] relative"
                  style={{
                    backgroundColor: template.backgroundColor,
                    borderRadius: template.borderRadius,
                    border: template.border,
                    backgroundImage: template.backgroundImage,
                    backgroundSize: template.backgroundSize,
                  }}
                >
                  <div className="flex flex-col h-full">
                    {[0, 1, 2].map((index) => (
                      <div
                        key={index}
                        className="relative flex-1"
                        style={{
                          padding: template.spacing,
                          backgroundColor: "transparent",
                        }}
                      >
                        <div
                          className="w-full aspect-square bg-white/80"
                          style={{
                            borderRadius: template.photoBorderRadius,
                            border: template.photoBorder,
                            boxShadow: template.photoShadow,
                          }}
                        ></div>
                      </div>
                    ))}
                  </div>
                </div>

                )}
                {selectedTemplate.id === template.id && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </div>

              <p className="text-sm mt-2 text-center font-medium">{template.name}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

