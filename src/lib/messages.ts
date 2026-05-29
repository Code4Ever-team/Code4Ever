import en from "../../messages/en.json";
import tr from "../../messages/tr.json";

type Dict = Record<string, unknown>;

const catalogs: Record<string, Dict> = { en, tr };

function resolve(dict: Dict, key: string): string | undefined {
  const parts = key.split(".");
  let cur: unknown = dict;
  for (const part of parts) {
    if (!cur || typeof cur !== "object" || !(part in cur)) return undefined;
    cur = (cur as Dict)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

/** Sunucu action'ları ve edge dışı kod için locale bazlı metin. */
export function msg(locale: string, key: string, vars?: Record<string, string>): string {
  const loc = locale === "en" ? "en" : "tr";
  const text = resolve(catalogs[loc], key) ?? resolve(catalogs.en, key) ?? key;
  if (!vars) return text;
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), text);
}
