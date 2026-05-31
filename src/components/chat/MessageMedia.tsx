"use client";

import { useState } from "react";
import Image from "next/image";
import { FileIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageMediaProps {
  kind: string;
  mediaUrl: string;
  mediaMimeType?: string | null;
  fileName?: string | null;
  caption?: string;
  locale: string;
}

export function MessageMedia({
  kind,
  mediaUrl,
  mediaMimeType,
  fileName,
  caption,
}: MessageMediaProps) {
  const [lightbox, setLightbox] = useState(false);
  const isImage = kind === "image" || mediaMimeType?.startsWith("image/");
  const isVideo = kind === "video" || mediaMimeType?.startsWith("video/");

  return (
    <div className="space-y-1">
      {isImage && (
        <button
          type="button"
          className="block max-w-full overflow-hidden rounded-md ring-1 ring-border"
          onClick={() => setLightbox(true)}
        >
          <Image
            src={mediaUrl}
            alt=""
            width={320}
            height={240}
            className="max-h-64 w-auto max-w-full object-contain"
            unoptimized
          />
        </button>
      )}
      {isVideo && (
        <video
          src={mediaUrl}
          controls
          playsInline
          preload="metadata"
          crossOrigin="anonymous"
          className="max-h-64 max-w-full rounded-md bg-black"
        >
          <track kind="captions" />
        </video>
      )}
      {kind === "file" && !isImage && !isVideo && (
        <a
          href={mediaUrl}
          download={fileName ?? undefined}
          className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm hover:bg-muted/60"
        >
          <FileIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">{fileName ?? "file"}</span>
        </a>
      )}
      {caption && <p className="whitespace-pre-wrap break-words text-sm">{caption}</p>}

      {lightbox && isImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white"
            onClick={() => setLightbox(false)}
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl}
            alt=""
            className={cn("max-h-[90vh] max-w-full object-contain")}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
