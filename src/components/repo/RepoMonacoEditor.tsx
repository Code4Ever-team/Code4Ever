"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { Maximize2, Minimize2 } from "lucide-react";
import type { editor as MonacoEditor } from "monaco-editor";
import type { RemotePresence } from "@/hooks/useCollabSession";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

loader.config({ monaco });

interface RepoMonacoEditorProps {
  path: string;
  value: string;
  readOnly: boolean;
  onChange: (value: string) => void;
  onCursorMove?: (line: number, col: number) => void;
  remotePresence: Map<string, RemotePresence>;
}

export function RepoMonacoEditor({
  path,
  value,
  readOnly,
  onChange,
  onCursorMove,
  remotePresence,
}: RepoMonacoEditorProps) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const decorationsRef = useRef<string[]>([]);
  const [editorHeight, setEditorHeight] = useState(480);
  const [fullScreen, setFullScreen] = useState(false);

  const language = useMemo(() => {
    if (path.endsWith(".html")) return "html";
    if (path.endsWith(".css")) return "css";
    if (path.endsWith(".json")) return "json";
    if (path.endsWith(".ts") || path.endsWith(".tsx")) return "typescript";
    if (path.endsWith(".js") || path.endsWith(".jsx")) return "javascript";
    if (path.endsWith(".md")) return "markdown";
    return "plaintext";
  }, [path]);

  const applyDecorations = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;

    const decs: MonacoEditor.IModelDeltaDecoration[] = [];
    for (const p of Array.from(remotePresence.values())) {
      if (p.line == null) continue;
      decs.push({
        range: new monaco.Range(p.line, 1, p.line, 1),
        options: {
          isWholeLine: true,
          className: "collab-line-highlight",
          glyphMarginClassName: "collab-glyph",
          inlineClassName: "collab-inline",
          hoverMessage: { value: `@${p.username}` },
        },
      });
    }
    decorationsRef.current = ed.deltaDecorations(decorationsRef.current, decs);
  }, [remotePresence]);

  useEffect(() => {
    applyDecorations();
  }, [applyDecorations]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const next = Math.max(320, el.clientHeight);
      setEditorHeight(next);
      editorRef.current?.layout();
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fullScreen, path]);

  useEffect(() => {
    if (!fullScreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullScreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullScreen]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex w-full flex-1 flex-col bg-black",
        fullScreen
          ? "fixed inset-0 z-[200] min-h-screen border border-primary/30"
          : "min-h-[min(70vh,42rem)]"
      )}
    >
      <div className="flex items-center justify-between border-b border-border bg-black/80 px-2 py-1">
        <span className="truncate font-mono text-[10px] text-muted-foreground">{path}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => setFullScreen((v) => !v)}
          aria-label={fullScreen ? "Exit full screen" : "Full screen"}
        >
          {fullScreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <Editor
          height={`${editorHeight}px`}
          language={language}
          theme="vs-dark"
          value={value}
          options={{
            readOnly,
            minimap: { enabled: false },
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 13,
            scrollBeyondLastLine: false,
            glyphMargin: true,
            lineNumbers: "on",
            automaticLayout: true,
          }}
          onMount={(ed) => {
            editorRef.current = ed;
            ed.onDidChangeCursorPosition((e) => {
              onCursorMove?.(e.position.lineNumber, e.position.column);
            });
            applyDecorations();
            ed.layout();
          }}
          onChange={(v) => onChange(v ?? "")}
        />
      </div>
    </div>
  );
}
