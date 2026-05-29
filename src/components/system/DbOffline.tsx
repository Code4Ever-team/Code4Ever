import { Card } from "@/components/ui/card";

export function DbOffline() {
  return (
    <Card className="border-destructive/40 p-5">
      <p className="text-sm font-semibold text-foreground">Veritabanı bağlantısı yok</p>
      <p className="mt-2 text-xs text-c4e-muted">
        Supabase için <code className="text-c4e-neon">DATABASE_URL</code> değerini
        Transaction Pooler (port 6543) ile güncelle ve{" "}
        <code className="text-c4e-neon">npm run db:push</code> çalıştır.
      </p>
    </Card>
  );
}
