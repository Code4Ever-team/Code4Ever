"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { adminDeleteFeedAction, type AdminResult } from "@/lib/actions/admin.actions";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/Form";

const initial: AdminResult = { success: false, message: "" };

function DeleteBtn() {
  const { pending } = useFormStatus();
  const t = useTranslations("admin");
  return (
    <Button type="submit" variant="destructive" disabled={pending} className="h-8 shrink-0 px-3 text-xs">
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
  const [state, action] = useFormState(adminDeleteFeedAction, initial);

  const msg =
    state.message === "deleted"
      ? t("msgFeedDeleted")
      : state.message === "forbidden"
        ? t("forbidden")
        : state.message === "failed"
          ? t("msgFailed")
          : state.message;

  return (
    <li className="rounded-none border border-border bg-card/30 p-4 transition hover:border-primary/30">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-primary">
            {t("author")}: @{author}
          </p>
          <p className="mt-1 line-clamp-4 text-sm text-foreground">{content}</p>
          <p className="mt-2 text-xs text-muted-foreground">
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
        <p className={`mt-2 text-xs ${state.success ? "text-primary" : "text-destructive"}`}>{msg}</p>
      )}
    </li>
  );
}
