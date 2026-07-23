<div align="center">

<picture>
  <img src="https://github.com/Nylithra/Lanux-Auth/blob/main/c4ebanner.png" alt="Code4Ever Banner" width="100%">
</picture>

<br>

### Developer-focused Open Source Social Platform

<br>

<a href="#-türkçe-detaylar">
  <img src="https://img.shields.io/badge/🇹🇷-Türkçe-0066FF?style=for-the-badge">
</a>

<a href="#-english-details">
  <img src="https://img.shields.io/badge/🇬🇧-English-EA4335?style=for-the-badge">
</a>

<a href="https://github.com/YOUR_USERNAME/Code4Ever">
  <img src="https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github">
</a>

<br><br>

![GitHub Repo Size](https://img.shields.io/github/repo-size/Code4ever-team/Code4Ever?style=flat-square)
![GitHub Stars](https://img.shields.io/github/stars/Code4ever-team/Code4Ever?style=flat-square)
![GitHub Forks](https://img.shields.io/github/forks/Code4ever-team/Code4Ever?style=flat-square)
![GitHub Issues](https://img.shields.io/github/issues/Code4ever-team/Code4Ever?style=flat-square)
![License](https://img.shields.io/github/license/Code4ever-team/Code4Ever?style=flat-square)

</div>

---

# 🇹🇷 Türkçe Detaylar

## 📝 Proje Hakkında

**Code4Ever**, Mastodon ve GitHub'ın güçlü yönlerini bir araya getiren, geliştiricilere yönelik açık kaynaklı hibrit sosyal platformdur.

Platform; geliştiricilerin projelerini paylaşabileceği, ekipler oluşturabileceği, topluluklarla etkileşime geçebileceği ve açık kaynak ekosistemine katkıda bulunabileceği modern bir sosyal geliştirme ortamı sunmayı hedeflemektedir.

---

## 🛠️ Projeye Yapılması Gerekenler (V0.3.0_a16)

### Authentication

- [ ] `LoginForm.tsx` import eksiklerinin tamamlanması.
- [ ] Session yönetiminin düzenlenmesi.
- [ ] Authentication akışının optimize edilmesi.

### API

- [ ] `src/app/api/api/` klasör yapısının düzeltilmesi.
- [ ] API endpointlerinin optimize edilmesi.
- [ ] Route düzenlemelerinin tamamlanması.

### Jubbio

- [ ] **Jubbio entegrasyonunun geliştirilmesi.**
- [ ] OAuth işlemlerinin tamamlanması.
- [ ] Callback işlemlerinin optimize edilmesi.
- [ ] Eksik servislerin geliştirilmesi.

### Frontend

- [ ] `<img>` etiketlerinin `<Image />` ile değiştirilmesi.
- [ ] Responsive tasarımın iyileştirilmesi.
- [ ] UI/UX optimizasyonları.

### Backend

- [ ] Logger importlarının düzenlenmesi.
- [ ] TypeScript hata düzeltmeleri.
- [ ] Performans optimizasyonları.
- [ ] Güvenlik kontrollerinin artırılması.

---

## ⚠️ Bilinen Derleme Hataları

### LoginForm

Eksik UI importları bulunmaktadır.

### API

Yanlış klasör yapısı:

```text
src/app/api/api/
```

### Session

Aşağıdaki fonksiyonlar export edilmelidir.

- `createSession`
- `verifySession`

### Logger

Yanlış kullanım

```ts
import logger from "@/lib/logger";
```

---

## 🤝 Katkıda Bulunma

Projeye katkıda bulunmak isteyen geliştiriciler aşağıdaki yollarla destek olabilir.

- Pull Request göndermek
- Issue oluşturmak
- Güvenlik açıklarını bildirmek
- Yeni özellik geliştirmek
- Dokümantasyonu geliştirmek
- Performans iyileştirmeleri yapmak
- Kod kalitesini artırmak

---

# 🇬🇧 English Details

## 📝 About The Project

**Code4Ever** is an open-source hybrid social platform built specifically for developers by combining the strongest features of Mastodon and GitHub.

The goal is to provide a modern platform where developers can share projects, collaborate with teams, communicate with communities, and contribute to open-source software.

---

## 🚀 Release Notes

### 📌 V0.3.0_a15

- Open source release.
- Codebase optimization.
- Updated dependencies.
- Community development enabled.
- Several TypeScript and build issues remain.

---

## 🛠️ Project Roadmap (V0.3.0_a16)

### Authentication

- [ ] Complete missing imports in `LoginForm.tsx`
- [ ] Improve session management.
- [ ] Optimize authentication flow.

### API

- [ ] Clean duplicated API folder structure.
- [ ] Optimize API endpoints.
- [ ] Refactor API routes.

### Jubbio

- [ ] **Continue development of the Jubbio integration.**
- [ ] Complete OAuth implementation.
- [ ] Improve callback services.
- [ ] Finish missing backend services.

### Frontend

- [ ] Replace `<img>` with Next.js `<Image />`.
- [ ] Improve responsive design.
- [ ] UI/UX improvements.

### Backend

- [ ] Standardize logger imports.
- [ ] Resolve TypeScript issues.
- [ ] Improve performance.
- [ ] Strengthen security validation.

---

## ⚠️ Known Build Issues

### LoginForm

Missing UI imports.

### API

Duplicated folder structure.

```text
src/app/api/api/
```

### Session

The following functions are not exported.

- `createSession`
- `verifySession`

### Logger

Replace

```ts
import logger from "@/lib/logger";
```

with

```ts
import { logger } from "@/lib/logger";
```

---

## 🤝 Contributing

Community contributions are highly appreciated.

You can help by:

- Opening Issues
- Submitting Pull Requests
- Reporting bugs
- Reporting security vulnerabilities
- Improving documentation
- Developing new features
- Optimizing performance

---

<div align="center">

### ❤️ Thanks to everyone contributing to Code4Ever

Developed by

## ⚡ Lanux & Gloyis

</div>
