import { mkdir, writeFile, access } from "fs/promises";
import path from "path";

const outDir = path.join(process.cwd(), "public", "voices");
const outFile = path.join(outDir, "bildirim.mp3");

try {
  await access(outFile);
  console.log("Notify sound exists:", outFile);
  process.exit(0);
} catch {
  /* oluştur */
}

await mkdir(outDir, { recursive: true });

/** Kısa geçerli MP3 çerçevesi (yaklaşık 0.1 sn sessizlik). Kendi dosyanızla değiştirin. */
const minimalMp3 = Buffer.from(
  "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRwmHAAAAAAD/+1DEAAAHAAGf9AAAIAAANIAAAAQAAANIAAAAQf/+6IgAA//u6IgAA//u6IgAA//u6IgAA//u6IgAA//u6IgAA",
  "base64"
);

await writeFile(outFile, minimalMp3);
console.log("Wrote placeholder:", outFile);
