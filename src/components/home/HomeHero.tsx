import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export async function HomeHero() {
  const t = await getTranslations("home");

  return (
    <Card className="mb-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground border-l-2 border-primary pl-3">{t("vision")}</p>
      </CardContent>
    </Card>
  );
}
