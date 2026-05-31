"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { editor as MonacoEditor } from "monaco-editor";
import type { RemotePresence } from "@/hooks/useCollabSession";

const Monaco = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[24rem] items-center justify-center bg-black/60 font-mono text-xs text-muted-foreground">
      …
    </div>
  ),
});

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
  const decorationsRef = useRef<string[]>([]);

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
    const monaco = (window as unknown as { monaco?: typeof import("monaco-editor") }).monaco;
    if (!monaco) return;

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

  return (
    <Monaco
      height="24rem"
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
      }}
      onMount={(ed) => {
        editorRef.current = ed;
        ed.onDidChangeCursorPosition((e) => {
          onCursorMove?.(e.position.lineNumber, e.position.column);
        });
        applyDecorations();
      }}
      onChange={(v) => onChange(v ?? "")}
    />
  );
}
