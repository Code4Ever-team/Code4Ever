"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { saveRepoFileContentAction, deleteRepoFileAction } from "@/lib/actions/repo.actions";
import { SHOWROOM_ENTRY } from "@/lib/showroom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface RepoFileItem {
  path: string;
  content: string;
}

interface RepoWorkspaceProps {
  locale: string;
  repoId: string;
  files: RepoFileItem[];
  canEdit: boolean;
}

export function RepoWorkspace({ locale, repoId, files, canEdit }: RepoWorkspaceProps) {
  const t = useTranslations("showroom");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedPath, setSelectedPath] = useState(files[0]?.path ?? "");
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(files.map((f) => [f.path, f.content]))
  );
  const [newPath, setNewPath] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const paths = useMemo(() => {
    const set = new Set(files.map((f) => f.path));
    for (const p of Object.keys(drafts)) set.add(p);
    return Array.from(set).sort();
  }, [files, drafts]);

  const currentContent = drafts[selectedPath] ?? "";

  function selectPath(path: string) {
    setSelectedPath(path);
    setStatus(null);
  }

  function updateDraft(value: string) {
    if (!selectedPath) return;
    setDrafts((prev) => ({ ...prev, [selectedPath]: value }));
  }

  function createFile() {
    const path = newPath.trim();
    if (!path || drafts[path] !== undefined) return;
    setDrafts((prev) => ({ ...prev, [path]: "" }));
    setSelectedPath(path);
    setNewPath("");
  }

  function ensurePubTemplate() {
    if (drafts[SHOWROOM_ENTRY] !== undefined) {
      setSelectedPath(SHOWROOM_ENTRY);
      return;
    }
    const template = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>My Project</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #000; color: #fff; }
    main { max-width: 48rem; margin: 0 auto; padding: 2rem; }
    h1 { color: #007acc; }
  </style>
</head>
<body>
  <main>
    <h1>Project Showroom</h1>
    <p>Edit this file at <code>${SHOWROOM_ENTRY}</code></p>
  </main>
</body>
</html>`;
    setDrafts((prev) => ({ ...prev, [SHOWROOM_ENTRY]: template }));
    setSelectedPath(SHOWROOM_ENTRY);
  }

  function saveFile() {
    if (!selectedPath || !canEdit) return;
    const fd = new FormData();
    fd.set("locale", locale);
    fd.set("repoId", repoId);
    fd.set("path", selectedPath);
    fd.set("content", drafts[selectedPath] ?? "");

    startTransition(async () => {
      const result = await saveRepoFileContentAction({ success: false, message: "" }, fd);
      setStatus({ ok: result.success, text: result.message });
      if (result.success) router.refresh();
    });
  }

  function removeFile() {
    if (!selectedPath || !canEdit) return;
    const fd = new FormData();
    fd.set("locale", locale);
    fd.set("repoId", repoId);
    fd.set("path", selectedPath);

    startTransition(async () => {
      const result = await deleteRepoFileAction({ success: false, message: "" }, fd);
      setStatus({ ok: result.success, text: result.message });
      if (result.success) {
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[selectedPath];
          return next;
        });
        setSelectedPath(paths.find((p) => p !== selectedPath) ?? "");
        router.refresh();
      }
    });
  }

  return (
    <Card className="mt-6 overflow-hidden border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{t("editorTitle")}</h2>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={ensurePubTemplate}>
              {t("addPubTemplate")}
            </Button>
            <Button type="button" size="sm" onClick={saveFile} disabled={pending || !selectedPath}>
              {pending ? t("saving") : t("saveFile")}
            </Button>
          </div>
        )}
      </div>

      <div className="grid min-h-[28rem] grid-cols-1 md:grid-cols-[14rem_1fr]">
        <aside className="border-b border-border md:border-b-0 md:border-r">
          <ul className="max-h-80 overflow-y-auto p-2 md:max-h-none">
            {paths.map((path) => (
              <li key={path}>
                <button
                  type="button"
                  onClick={() => selectPath(path)}
                  className={cn(
                    "w-full truncate rounded px-2 py-1.5 text-left font-mono text-xs",
                    selectedPath === path
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  {path}
                </button>
              </li>
            ))}
          </ul>
          {canEdit && (
            <div className="border-t border-border p-2 space-y-2">
              <Label htmlFor="new-file" className="text-xs">
                {t("newFile")}
              </Label>
              <div className="flex gap-1">
                <Input
                  id="new-file"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  placeholder="src/app.js"
                  className="h-8 font-mono text-xs"
                />
                <Button type="button" size="sm" variant="secondary" onClick={createFile}>
                  +
                </Button>
              </div>
            </div>
          )}
        </aside>

        <div className="flex flex-col">
          {selectedPath ? (
            <>
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="font-mono text-xs text-primary">{selectedPath}</span>
                {canEdit && (
                  <Button type="button" size="sm" variant="ghost" onClick={removeFile} disabled={pending}>
                    {t("deleteFile")}
                  </Button>
                )}
              </div>
              <textarea
                value={currentContent}
                onChange={(e) => updateDraft(e.target.value)}
                readOnly={!canEdit}
                spellCheck={false}
                className="min-h-[24rem] flex-1 resize-none bg-black/60 p-4 font-mono text-xs leading-relaxed text-foreground outline-none"
              />
            </>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">{t("selectFile")}</p>
          )}
        </div>
      </div>

      {status && (
        <p
          className={cn(
            "border-t border-border px-4 py-2 text-xs",
            status.ok ? "text-primary" : "text-destructive"
          )}
        >
          {status.text}
        </p>
      )}
    </Card>
  );
}
