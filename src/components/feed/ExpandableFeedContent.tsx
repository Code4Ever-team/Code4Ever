"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const COLLAPSE_AT = 480;

interface ExpandableFeedContentProps {
  content: string;
  locale: string;
}

export function ExpandableFeedContent({ content, locale }: ExpandableFeedContentProps) {
  const t = useTranslations("feedPage");
  const long = content.length > COLLAPSE_AT;
  const [expanded, setExpanded] = useState(!long);

  const shown = expanded || !long ? content : `${content.slice(0, COLLAPSE_AT).trim()}…`;

  return (
    <div>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
        {shown}
      </p>
      {long && !expanded && (
        <button
          type="button"
          className="mt-1 text-xs font-semibold text-primary hover:underline"
          onClick={() => setExpanded(true)}
        >
          {t("readMore")}
        </button>
      )}
    </div>
  );
}
