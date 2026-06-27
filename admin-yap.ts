import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Kendi e-posta adresini buraya yaz
  const myEmail = "nylithra@gmail.com"; 

  const user = await prisma.user.findUnique({
    where: { email: myEmail },
  });

  if (!user) {
    console.error(`❌ Kullanıcı bulunamadı! Önce siteden bu maille (${myEmail}) hesap oluştur.`);
    return;
  }

  console.log(`\n🔍 Kullanıcı Bulundu!`);
  console.log(`🆔 Senin CUID (ID) Değerin: ${user.id}`);
  console.log(`👤 Kullanıcı Adın: ${user.username}`);

  // 2. Senin şemadaki 'isFounder' alanını TRUE yapıyoruz
  try {
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isFounder: true
      },
    });
    
    console.log(`\n⚡ BAŞARILI: isFounder alanı TRUE yapıldı!`);
    console.log(`👉 Şimdi bu ID'yi kopyala ve .env dosyandaki ilgili alana yapıştır:`);
    console.log(`   PLATFORM_PANEL_ADMIN_ID="${user.id}"`);
    
  } catch (e) {
    console.error(`❌ Güncelleme sırasında bir hata oluştu:`, e);
  }
}

main()
  .catch((e) => {
    console.error("❌ Genel Script Hatası:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });