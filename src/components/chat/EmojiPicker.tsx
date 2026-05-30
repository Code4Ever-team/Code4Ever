"use client";

import { useState } from "react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EMOJI = [
  "😀", "😂", "🥹", "😍", "🤔", "😎", "🙌", "👍", "👎", "❤️",
  "🔥", "✨", "🎉", "💯", "🚀", "👀", "😢", "😡", "🤝", "✅",
  "❌", "⭐", "💻", "🐛", "☕", "🍕", "⚡", "🌙", "☀️", "🎮",
];

interface EmojiPickerProps {
  onPick: (emoji: string) => void;
  disabled?: boolean;
}

export function EmojiPicker({ onPick, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        className="h-9 w-9 shrink-0"
        onClick={() => setOpen((v) => !v)}
        aria-label="Emoji"
      >
        <Smile className="h-4 w-4" />
      </Button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="close"
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              "absolute bottom-full left-0 z-50 mb-2 grid w-[220px] grid-cols-5 gap-1",
              "rounded-lg border border-border bg-card p-2 shadow-lg"
            )}
          >
            {EMOJI.map((e) => (
              <button
                key={e}
                type="button"
                className="rounded p-1 text-lg hover:bg-muted"
                onClick={() => {
                  onPick(e);
                  setOpen(false);
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
