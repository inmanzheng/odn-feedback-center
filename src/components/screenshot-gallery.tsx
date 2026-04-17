"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Screenshot } from "@/types";
import { Image as ImageIcon, X } from "lucide-react";

function getImageSrc(base64: string): string {
  if (base64.startsWith("data:")) return base64;
  if (base64.startsWith("http")) return base64;
  return `data:image/png;base64,${base64}`;
}

export function ScreenshotGallery({ screenshots }: { screenshots: Screenshot[] }) {
  const [selected, setSelected] = useState<Screenshot | null>(null);

  if (screenshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <ImageIcon className="w-8 h-8 mb-2" />
        <p className="text-sm">暂无截图</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {screenshots.map((ss) => (
          <div
            key={ss.id}
            className="border border-border rounded-lg overflow-hidden cursor-pointer hover:border-[#D4D4D4] transition-colors group"
            onClick={() => setSelected(ss)}
          >
            <div className="aspect-video bg-[#F5F5F5] flex items-center justify-center">
              <img
                src={getImageSrc(ss.base64)}
                alt={ss.filename}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="px-3 py-2 bg-white">
              <p className="text-xs text-foreground truncate">{ss.filename}</p>
              <p className="text-[10px] text-muted-foreground">{ss.source}</p>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{selected?.filename}</DialogTitle>
              <button
                onClick={() => setSelected(null)}
                className="p-1 rounded hover:bg-[#F5F5F5] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </DialogHeader>
          <div className="p-4">
            {selected && (
              <img
                src={getImageSrc(selected.base64)}
                alt={selected.filename}
                className="w-full rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
