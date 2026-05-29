import fs from "fs";
import path from "path";

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?)$/.test(name)) {
      let content = fs.readFileSync(full, "utf8");
      const next = content
        .replaceAll("@/components/ui/Button", "@/components/ui/button")
        .replaceAll("@/components/ui/Card", "@/components/ui/card")
        .replaceAll("@/components/ui/Input", "@/components/ui/input")
        .replaceAll("@/components/ui/Textarea", "@/components/ui/textarea")
        .replaceAll("@/components/ui/Label", "@/components/ui/label");
      if (next !== content) fs.writeFileSync(full, next);
    }
  }
}

walk(path.join(process.cwd(), "src"));
