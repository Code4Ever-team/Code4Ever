"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { deleteFeedAction } from "@/lib/actions/platform.actions";
import type { PlatformResult } from "@/lib/actions/platform.actions";
import { ExpandableFeedContent } from "@/components/feed/ExpandableFeedContent";
import { MessageMedia } from "@/components/chat/MessageMedia";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/Form";

const initial: PlatformResult = { success: false, message: "" };

function DeleteBtn() {
  const { pending } = useFormStatus();
  const t = useTranslations("platform");
  return (
    <Button type="submit" variant="destructive" disabled={pending} className="h-8 px-2 text-xs">
      {pending ? t("deletingFeed") : t("deleteFeed")}
    </Button>
  );
}

interface FeedPostCardProps {
  id: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  createdAt: Date;
  locale: string;
  authorUsername: string;
  canDelete: boolean;
  showAuthor?: boolean;
}

export function FeedPostCard({
  id,
  content,
  mediaUrl,
  mediaType,
  createdAt,
  locale,
  authorUsername,
  canDelete,
  showAuthor = false,
}: FeedPostCardProps) {
  const [state, action] = useFormState(deleteFeedAction, initial);

  return (
    <article className="rounded-lg border border-border bg-card/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {showAuthor && (
            <Link
              href={`/${locale}/${authorUsername}`}
              className="text-xs font-medium text-c4e-neon hover:underline"
            >
              @{authorUsername}
            </Link>
          )}
          <div className={showAuthor ? "mt-2 space-y-3" : "space-y-3"}>
            {content.trim() && <ExpandableFeedContent content={content} locale={locale} />}
            {mediaUrl && mediaType && (
              <MessageMedia
                kind={mediaType}
                mediaUrl={mediaUrl}
                mediaMimeType={mediaType === "image" ? "image/jpeg" : "video/mp4"}
                locale={locale}
              />
            )}
          </div>
          <time
            className="mt-2 block text-xs text-c4e-muted"
            dateTime={createdAt.toISOString()}
          >
            {new Date(createdAt).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}
          </time>
        </div>
        {canDelete && (
          <Form action={action} className="shrink-0">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="feedId" value={id} />
            <DeleteBtn />
          </Form>
        )}
      </div>
      {state.message && (
        <p
          className={`mt-2 text-xs ${state.success ? "text-c4e-neon" : "text-destructive"}`}
        >
          {state.message}
        </p>
      )}
    </article>
  );
}
