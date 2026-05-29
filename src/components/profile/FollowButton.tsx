"use client";

import { useFormState } from "react-dom";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { followUserAction, unfollowUserAction } from "@/lib/actions/chat.actions";
import type { ActionResult } from "@/lib/actions/chat.actions";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/Form";
import { cn } from "@/lib/utils";

const initial: ActionResult = { success: false, message: "" };

interface FollowButtonProps {
  locale: string;
  targetUserId: string;
  targetUsername: string;
  isFollowing: boolean;
  canMessage?: boolean;
  isLoggedIn: boolean;
  onGuestClick: () => void;
}

export function FollowButton({
  locale,
  targetUserId,
  targetUsername,
  isFollowing: following,
  canMessage = false,
  isLoggedIn,
  onGuestClick,
}: FollowButtonProps) {
  const t = useTranslations("profile");
  const tc = useTranslations("chat");
  const [followState, followAction] = useFormState(followUserAction, initial);
  const [unfollowState, unfollowAction] = useFormState(unfollowUserAction, initial);

  if (!isLoggedIn) {
    return (
      <button
        type="button"
        onClick={onGuestClick}
        className={cn(
          "rounded-md px-5 py-2 text-sm font-semibold",
          "cursor-not-allowed bg-border/50 text-c4e-muted opacity-60"
        )}
      >
        {t("follow")}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Form action={following ? unfollowAction : followAction}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="targetUserId" value={targetUserId} />
        <Button type="submit" variant={following ? "secondary" : "default"} className="w-full">
          {following ? t("unfollow") : t("follow")}
        </Button>
      </Form>
      {(following || canMessage) && (
        <Button asChild variant="ghost" className="h-9 text-sm">
          <Link href={`/${locale}/chat/${targetUsername}`}>{tc("message")}</Link>
        </Button>
      )}
      {(followState.message || unfollowState.message) && (
        <p
          className={`text-xs ${
            followState.success || unfollowState.success ? "text-c4e-neon" : "text-destructive"
          }`}
        >
          {followState.message || unfollowState.message}
        </p>
      )}
    </div>
  );
}
