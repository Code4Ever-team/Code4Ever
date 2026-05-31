"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { updateShowroomAction } from "@/lib/actions/repo.actions";
import { SHOWROOM_ENTRY } from "@/lib/showroom";
import type { PlatformResult } from "@/lib/actions/platform.actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form } from "@/components/ui/Form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: PlatformResult = { success: false, message: "" };

function SubmitBtn() {
  const { pending } = useFormStatus();
  const t = useTranslations("showroom");
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t("saving") : t("saveShowroom")}
    </Button>
  );
}

interface ShowroomSettingsFormProps {
  locale: string;
  repoId: string;
  repoName: string;
  showroomSlug: string | null;
  showroomPublished: boolean;
  hasPubIndex: boolean;
}

export function ShowroomSettingsForm({
  locale,
  repoId,
  repoName,
  showroomSlug,
  showroomPublished,
  hasPubIndex,
}: ShowroomSettingsFormProps) {
  const t = useTranslations("showroom");
  const [state, action] = useFormState(updateShowroomAction, initial);
  const previewSlug = showroomSlug ?? "your-slug";

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-foreground">{t("settingsTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("settingsDesc", { repo: repoName })}</p>

      <Form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="repoId" value={repoId} />

        <div className="space-y-2">
          <Label htmlFor="showroom-slug">{t("slugLabel")}</Label>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm text-muted-foreground">/{locale}/p/</span>
            <Input
              id="showroom-slug"
              name="showroomSlug"
              defaultValue={showroomSlug ?? ""}
              placeholder="my-cool-app"
              pattern="[a-z0-9-]+"
              className="font-mono"
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("slugHint")}</p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="publish"
            defaultChecked={showroomPublished}
            className="rounded border-border"
          />
          {t("publishLabel")}
        </label>

        {!hasPubIndex && (
          <p className="text-xs text-amber-400">{t("missingPubIndex", { path: SHOWROOM_ENTRY })}</p>
        )}

        <SubmitBtn />

        {state.message && (
          <p className={`text-sm ${state.success ? "text-primary" : "text-destructive"}`}>
            {state.message}
          </p>
        )}
      </Form>

      {showroomSlug && showroomPublished && (
        <p className="mt-4 text-sm">
          {t("liveAt")}{" "}
          <Link href={`/${locale}/p/${previewSlug}`} className="font-mono text-primary hover:underline">
            /{locale}/p/{showroomSlug}
          </Link>
        </p>
      )}
    </Card>
  );
}
