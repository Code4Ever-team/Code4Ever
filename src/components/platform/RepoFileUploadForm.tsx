"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { uploadRepoFileAction } from "@/lib/actions/platform.actions";
import type { PlatformResult } from "@/lib/actions/platform.actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form } from "@/components/ui/Form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: PlatformResult = { success: false, message: "" };

function SubmitBtn() {
  const { pending } = useFormStatus();
  const t = useTranslations("platform");
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t("uploading") : t("uploadFile")}
    </Button>
  );
}

interface RepoFileUploadFormProps {
  locale: string;
  repoId: string;
  canUpload: boolean;
}

export function RepoFileUploadForm({ locale, repoId, canUpload }: RepoFileUploadFormProps) {
  const t = useTranslations("platform");
  const [state, action] = useFormState(uploadRepoFileAction, initial);

  if (!canUpload) return null;

  return (
    <Card className="mt-6 p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{t("uploadCode")}</h3>
      <Form action={action} encType="multipart/form-data" className="space-y-3">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="repoId" value={repoId} />
        <div className="space-y-2">
          <Label htmlFor="file-path">{t("filePath")}</Label>
          <Input id="file-path" name="path" placeholder="src/index.ts" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="file">{t("chooseFile")}</Label>
          <Input id="file" name="file" type="file" required />
        </div>
        <SubmitBtn />
        {state.message && (
          <p className={`text-sm ${state.success ? "text-c4e-neon" : "text-destructive"}`}>
            {state.message}
          </p>
        )}
      </Form>
    </Card>
  );
}
