"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as Y from "yjs";
import {
  deleteRepoFileAction,
  saveRepoFileContentAction,
  saveRepoFileEncryptedAction,
} from "@/lib/actions/repo.actions";
import {
  decryptText,
  encryptText,
  getRepoDek,
  loadPersistedRepoDek,
  storeRepoDek,
  unlockDekFromEnvelope,
} from "@/lib/crypto/e2ee-repo";
import { collabColorForUser } from "@/lib/collab/collab-colors";
import { useCollabSession } from "@/hooks/useCollabSession";
import type { RemotePresence } from "@/hooks/useCollabSession";
import { SHOWROOM_ENTRY } from "@/lib/showroom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const RepoMonacoEditor = dynamic(
  () => import("@/components/repo/RepoMonacoEditor").then((m) => m.RepoMonacoEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[24rem] items-center justify-center bg-black/60 font-mono text-xs text-muted-foreground">
        …
      </div>
    ),
  }
);

export interface RepoFileItem {
  path: string;
  content: string;
  ciphertext?: string | null;
  nonce?: string | null;
}

interface RepoWorkspaceProps {
  locale: string;
  repoId: string;
  files: RepoFileItem[];
  canEdit: boolean;
  isEncrypted: boolean;
  keyEnvelope: string | null;
  collabEnabled: boolean;
  userId?: string;
  username?: string;
}

export function RepoWorkspace({
  locale,
  repoId,
  files,
  canEdit,
  isEncrypted,
  keyEnvelope,
  collabEnabled,
  userId,
  username,
}: RepoWorkspaceProps) {
  const t = useTranslations("showroom");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [unlockPending, startUnlock] = useTransition();
  const [unlocked, setUnlocked] = useState(() => !isEncrypted || Boolean(getRepoDek(repoId)));
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState(files[0]?.path ?? "");
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(files.map((f) => [f.path, f.content]))
  );
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  const [newPath, setNewPath] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [yDoc, setYDoc] = useState<Y.Doc | null>(null);
  const [remotePresence, setRemotePresence] = useState<Map<string, RemotePresence>>(new Map());
  const localYjsEdit = useRef(false);

  const collabColor = userId ? collabColorForUser(userId) : "#007acc";
  const collabActive =
    collabEnabled && canEdit && unlocked && Boolean(userId) && Boolean(selectedPath);

  const { connected: collabConnected, sendPresence } = useCollabSession({
    repoId,
    filePath: selectedPath,
    userId: userId ?? "",
    username: username ?? "",
    color: collabColor,
    enabled: collabActive,
    yDoc,
    onRemotePresence: setRemotePresence,
  });

  useEffect(() => {
    if (!isEncrypted || unlocked) return;

    void (async () => {
      const dek = await loadPersistedRepoDek(repoId);
      if (!dek) return;

      try {
        const next: Record<string, string> = {};
        for (const f of files) {
          if (f.ciphertext && f.nonce) {
            next[f.path] = await decryptText(dek, f.ciphertext, f.nonce);
          } else {
            next[f.path] = f.content;
          }
        }
        setDrafts(next);
        setUnlocked(true);
      } catch {
        /* invalid persisted key */
      }
    })();
  }, [isEncrypted, unlocked, repoId, files]);

  useEffect(() => {
    if (!selectedPath || !unlocked) {
      setYDoc(null);
      return;
    }

    const doc = new Y.Doc();
    const ytext = doc.getText("content");
    const initial = draftsRef.current[selectedPath] ?? "";
    if (initial) ytext.insert(0, initial);

    const observer = () => {
      if (localYjsEdit.current) return;
      const val = ytext.toString();
      setDrafts((prev) => (prev[selectedPath] === val ? prev : { ...prev, [selectedPath]: val }));
    };
    ytext.observe(observer);
    setYDoc(doc);

    return () => {
      ytext.unobserve(observer);
      doc.destroy();
      setYDoc(null);
    };
  }, [selectedPath, unlocked]);

  const paths = useMemo(() => {
    const set = new Set(files.map((f) => f.path));
    for (const p of Object.keys(drafts)) set.add(p);
    return Array.from(set).sort();
  }, [files, drafts]);

  const currentContent = drafts[selectedPath] ?? "";

  function selectPath(path: string) {
    setSelectedPath(path);
    setStatus(null);
    setRemotePresence(new Map());
  }

  const handleEditorChange = useCallback(
    (value: string) => {
      if (!selectedPath) return;
      setDrafts((prev) => ({ ...prev, [selectedPath]: value }));

      const doc = yDoc;
      if (!doc) return;
      const ytext = doc.getText("content");
      localYjsEdit.current = true;
      doc.transact(() => {
        const cur = ytext.toString();
        if (cur !== value) {
          ytext.delete(0, cur.length);
          ytext.insert(0, value);
        }
      });
      localYjsEdit.current = false;
    },
    [selectedPath, yDoc]
  );

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

  function handleUnlock() {
    if (!keyEnvelope) return;
    startUnlock(async () => {
      setUnlockError(null);
      try {
        const dek = await unlockDekFromEnvelope(unlockPassword, keyEnvelope);
        await storeRepoDek(repoId, dek);
        const next: Record<string, string> = {};
        for (const f of files) {
          if (f.ciphertext && f.nonce) {
            next[f.path] = await decryptText(dek, f.ciphertext, f.nonce);
          } else {
            next[f.path] = f.content;
          }
        }
        setDrafts(next);
        setUnlocked(true);
        setUnlockPassword("");
      } catch {
        setUnlockError(t("unlockFailed"));
      }
    });
  }

  function saveFile() {
    if (!selectedPath || !canEdit || !unlocked) return;
    const content = drafts[selectedPath] ?? "";
    const dek = getRepoDek(repoId);

    startTransition(async () => {
      let result;
      if (isEncrypted && dek) {
        const blob = await encryptText(dek, content);
        const fd = new FormData();
        fd.set("locale", locale);
        fd.set("repoId", repoId);
        fd.set("path", selectedPath);
        fd.set("ciphertext", blob.ciphertext);
        fd.set("nonce", blob.nonce);
        result = await saveRepoFileEncryptedAction({ success: false, message: "" }, fd);
      } else {
        const fd = new FormData();
        fd.set("locale", locale);
        fd.set("repoId", repoId);
        fd.set("path", selectedPath);
        fd.set("content", content);
        result = await saveRepoFileContentAction({ success: false, message: "" }, fd);
      }
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

  if (isEncrypted && !unlocked) {
    return (
      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold text-foreground">{t("unlockTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("unlockDesc")}</p>
        <div className="mt-4 max-w-sm space-y-3">
          <div className="space-y-1">
            <Label htmlFor="unlock-pass">{t("unlockPassword")}</Label>
            <Input
              id="unlock-pass"
              type="password"
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUnlock();
              }}
            />
          </div>
          <Button type="button" disabled={unlockPending || !unlockPassword} onClick={handleUnlock}>
            {unlockPending ? t("unlocking") : t("unlockButton")}
          </Button>
          {unlockError && <p className="text-sm text-destructive">{unlockError}</p>}
        </div>
      </Card>
    );
  }

  return (
    <Card className="mt-6 overflow-hidden border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground">{t("editorTitle")}</h2>
          {collabActive && (
            <span
              className={cn(
                "text-xs font-mono",
                collabConnected ? "text-primary" : "text-muted-foreground"
              )}
            >
              {collabConnected ? t("collabConnected") : t("collabOffline")}
            </span>
          )}
        </div>
        {canEdit && unlocked && (
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

      <div className="grid min-h-[calc(100vh-10rem)] grid-cols-1 md:grid-cols-[14rem_1fr]">
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
          {canEdit && unlocked && (
            <div className="space-y-2 border-t border-border p-2">
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

        <div className="flex min-h-[min(70vh,42rem)] flex-col md:min-h-0">
          {selectedPath ? (
            <>
              <div className="flex items-center justify-between border-b border-border px-3 py-2 md:hidden">
                <span className="font-mono text-xs text-primary">{selectedPath}</span>
                {canEdit && unlocked && (
                  <Button type="button" size="sm" variant="ghost" onClick={removeFile} disabled={pending}>
                    {t("deleteFile")}
                  </Button>
                )}
              </div>
              <RepoMonacoEditor
                path={selectedPath}
                value={currentContent}
                readOnly={!canEdit || !unlocked}
                onChange={handleEditorChange}
                onCursorMove={(line, col) => sendPresence(line, col)}
                remotePresence={remotePresence}
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
