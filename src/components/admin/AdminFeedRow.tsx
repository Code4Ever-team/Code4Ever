"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { deleteFeedAction } from "@/lib/actions/platform.actions";
import type { PlatformResult } from "@/lib/actions/platform.actions";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/Form";

const initial: PlatformResult = { success: false, message: "" };

function DeleteBtn() {
  const { pending } = useFormStatus();
  const t = useTranslations("admin");
  return (
    <Button type="submit" variant="destructive" disabled={pending} className="h-8 shrink-0 px-2 text-xs">
      {pending ? "…" : t("deleteFeed")}
    </Button>
  );
}

interface AdminFeedRowProps {
  id: string;
  content: string;
  author: string;
  createdAt: Date;
  locale: string;
}

export function AdminFeedRow({ id, content, author, createdAt, locale }: AdminFeedRowProps) {
  const t = useTranslations("admin");
  const [state, action] = useFormState(deleteFeedAction, initial);

  return (
    <li className="rounded-lg border border-border bg-card/40 p-4">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-c4e-neon">
            {t("author")}: @{author}
          </p>
          <p className="mt-1 line-clamp-3 text-sm text-foreground">{content}</p>
          <p className="mt-2 text-xs text-c4e-muted">
            {t("created")}: {new Date(createdAt).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}
          </p>
        </div>
        <Form action={action}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="feedId" value={id} />
          <DeleteBtn />
        </Form>
      </div>
      {state.message && (
        <p className={`mt-2 text-xs ${state.success ? "text-c4e-neon" : "text-destructive"}`}>
          {state.message}
        </p>
      )}
    </li>
  );
}
