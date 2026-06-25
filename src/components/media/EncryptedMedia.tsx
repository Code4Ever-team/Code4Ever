"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { decryptMediaToObjectUrl } from "@/lib/crypto/e2ee-blob";
import { MessageMedia } from "@/components/chat/MessageMedia";

interface EncryptedMediaProps {
  kind: string;
  mediaUrl: string;
  mediaNonce: string;
  mediaKey: string;
  mediaMimeType?: string | null;
  fileName?: string | null;
  caption?: string;
  locale: string;
}

export function EncryptedMedia({
  kind,
  mediaUrl,
  mediaNonce,
  mediaKey,
  mediaMimeType,
  fileName,
  caption,
  locale,
}: EncryptedMediaProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;

    void decryptMediaToObjectUrl(
      mediaUrl,
      mediaNonce,
      mediaKey,
      mediaMimeType ?? "application/octet-stream"
    )
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        revoked = url;
        setObjectUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [mediaUrl, mediaNonce, mediaKey, mediaMimeType]);

  if (failed) {
    return <p className="text-xs text-muted-foreground">Media unavailable</p>;
  }

  if (!objectUrl) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        …
      </div>
    );
  }

  return (
    <MessageMedia
      kind={kind}
      mediaUrl={objectUrl}
      mediaMimeType={mediaMimeType}
      fileName={fileName}
      caption={caption}
      locale={locale}
    />
  );
}
