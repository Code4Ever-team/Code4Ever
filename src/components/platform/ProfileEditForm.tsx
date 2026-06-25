"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { updateProfileAction } from "@/lib/actions/platform.actions";
import type { PlatformResult } from "@/lib/actions/platform.actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form } from "@/components/ui/Form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initial: PlatformResult = { success: false, message: "" };

function SubmitBtn() {
  const { pending } = useFormStatus();
  const t = useTranslations("platform");
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t("savingProfile") : t("saveProfile")}
    </Button>
  );
}

interface ProfileEditFormProps {
  locale: string;
  bio: string | null;
}

export function ProfileEditForm({ locale, bio }: ProfileEditFormProps) {
  const t = useTranslations("platform");
  const [state, action] = useFormState(updateProfileAction, initial);

  return (
    <Card className="p-4">
      <Form action={action} className="space-y-3">
        <input type="hidden" name="locale" value={locale} />
        <div className="space-y-2">
          <Label htmlFor="bio">{t("bio")}</Label>
          <Textarea id="bio" name="bio" defaultValue={bio ?? ""} maxLength={500} rows={3} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="avatar">{t("avatar")}</Label>
          <Input id="avatar" name="avatar" type="file" accept="image/*" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="banner">{t("banner")}</Label>
          <Input id="banner" name="banner" type="file" accept="image/*" />
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
