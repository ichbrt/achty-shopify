# ACHTy Shopify App - Development Journey & Progress Report

This document lists all the work, design updates, and backend additions made so far on the ACHTy Shopify App (AIVista project's Shopify integration).

## 1. Design and User Interface (UI/UX) Revamp
The application's interface was rewritten while adhering to ACHTy's core "Premium, Dark, Sleek" brand identity.

*   **Premium Splash Screen:**
    *   Removed the boring default loading screen.
    *   Added the ACHTy logo.
    *   Adapted the spinning, 3D "TubesBackground" animation (aivista.com style) for Shopify in the background.
    *   Placed a neon orange and red gradient "Enter App" button.
*   **Original AIVista Dashboard Integration:**
    *   Completely cleared the clunky "Welcome" text area. Added the top-left aligned orange **"OVERVIEW / Dashboard"** structure found in the original ACHTy AIVista Dashboard.
    *   Positioned the "+ New Project" add button elegantly with gradient colors next to it.
*   **Advanced Metric Cards (Stat Cards):**
    *   Discarded the standard white-background "Polaris" (Shopify default) card models.
    *   Wrote custom "aivista-stat-card" CSS classes with a dark theme and glowing background colors specific to each card (orange for Score, green for Scans, etc.).
*   **AI SEO Panel Aesthetics:**
    *   Translated the Turkish language options in the loading interface completely to English (`Aksiyon -> Actions`, etc.).
    *   Placed a "Stop Optimization" button in the panel matching the premium format so users can halt optimization.
    *   Corrected the "TARANMADI" status to "NEVER SCANNED".

## 2. Subscription and Pricing System (Shopify Billing API)
Recurring Billing for monthly revenue optimization was integrated into the original Shopify infrastructure.

*   **Billing Page (`app.billing.jsx`):** Added a "Billing" tab to the menu.
*   **Plans and Limits:**
    *   **Starter Plan (Free):** Locked to 1 domain and **1 scan only**. Scan score capped between 35–46/100 to incentivize upgrade. Displays upgrade prompts when limit is reached.
    *   **Pro Plan ($199.90/Month):** Unlimited domains, unlimited scans, full score range (up to 100), premium AI SEO optimizer, deep competitor analysis.
*   **Shopify Wallet & Checkout Flow:**
    *   Ensured that when a user clicks the "Upgrade to PRO" button, they are redirected straight to Shopify's "Approve Subscription" payment popup, and upon approval, saved as `plan: "pro"` in the database.
    *   Successfully implemented the "Downgrade to Free" button to instantly cancel the subscription by triggering the "Cancel" API endpoint.

## 3. Project and Data Management
*   Activated the feature for users to **Track Custom Domain** other than their own stores.
*   Developed a "Delete Project" action and form structure to provide an infrastructure for cleaning up.

## 4. Production Readiness
*   Outlined the requirements via `implementation_plan.md` to rescue the app from Cloudflare local tunnels (the trycloudflare problem causing URL Timeout errors) and deploy it to a live web-based server (like Vercel).
*   Changed the database driver in `prisma/schema.prisma` from **SQLite (local) to PostgreSQL (server-based)**. (Prepared the infrastructure for live database setup).
*   Added the GDPR Compliance Webhooks (`APP_UNINSTALLED`, `CUSTOMERS_DATA_REQUEST`, etc.) mandated by Shopify's approval process.

## 5. Core Bug Fixes
*   Resolved UI issues appearing broken on the app's main page (gradient clipping / half headings etc.).
*   Solved the problem where the terminal would hang after 14 hours of uptime, and re-linked it by generating a fresh test URL via `npm run dev`.
*   Cleared incorrect indexing errors in `package.json` via the terminal.

## 6. Production-Readiness Code Overhaul
A comprehensive security and production-readiness audit was performed and all critical issues were resolved.

*   **Security — Broken Access Control Fixed:**
    *   `deleteProject` and `quickScan` actions now verify that the project belongs to the authenticated shop before executing. Previously, any shop could manipulate another shop's projects.
*   **Security — API Secret Enforcement:**
    *   `SHOPIFY_API_SECRET` is now **required** — the app throws an error on startup if missing (previously defaulted to empty string `""`, breaking webhook signature verification).
*   **Security — Input Validation:**
    *   `addProject` URL input is now validated with a domain regex. Invalid or malicious inputs are rejected with proper error messages.
*   **GDPR Webhooks — Full Compliance:**
    *   `APP_UNINSTALLED`: Now unconditionally cleans up sessions AND shop data (previously sessions only deleted if `payload.session` existed — which it never does).
    *   `CUSTOMERS_REDACT`: Now actually deletes session data for the specified customer.
    *   `SHOP_REDACT`: Now anonymizes shop PII (email → null, shopName → "[REDACTED]", accessToken → null).
*   **Billing — Test Mode Control:**
    *   All `isTest: true` hardcoded values replaced with `IS_TEST_BILLING` env-var-driven constant (`BILLING_TEST_MODE`). Set to `false` for production.
*   **Billing — Price Update:**
    *   Pro Plan price updated from $49/month → **$199.90/month**.
*   **Free Plan Restrictions:**
    *   Free plan limited to **1 scan total** (not just 1 domain). Score capped at **35–46 out of 100**.
    *   Upgrade prompts shown when scan limit is reached.
*   **Scopes Alignment:**
    *   `shopify.app.toml` scopes updated from empty `""` to `"read_products,read_content,read_themes"` to match server configuration.
*   **Config Cleanup:**
    *   Removed `.trycloudflare.com` from Vite allowed hosts.
    *   Added `prisma generate` to build script and `postinstall` hook for deployment compatibility.
    *   Created `.env.example` documenting all required environment variables.

## 7. Altyapı Kurulumu & Canlıya Çıkış (Infrastructure & Deployment)
Uygulama geliştirme ortamından çıkarılıp canlı sunuculara taşındı.

*   **Veritabanı — Supabase PostgreSQL:**
    *   Supabase üzerinde PostgreSQL veritabanı oluşturuldu (`db.fympfizkmpulwdvjmvlf.supabase.co`).
    *   `prisma migrate deploy` komutu ile tüm tablolar (Session, Shop, Project, Scan, ScanResult) başarılı şekilde oluşturuldu.
    *   `prisma/schema.prisma` dosyası SQLite'tan PostgreSQL'e daha önce geçirilmişti, migration dosyası (`20260308113519_init`) ile canlı veritabanına uygulandı.

*   **Hosting — Vercel Deployment:**
    *   GitHub reposu (`github.com/ichbrt/achty-shopify`) Vercel'e bağlandı.
    *   Framework preset: **Remix** olarak ayarlandı.
    *   Ortam değişkenleri Vercel Dashboard'dan girildi: `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `DATABASE_URL`, `SCOPES`, `BILLING_TEST_MODE`.
    *   Production URL: `https://achty-shopify.vercel.app`

*   **Shopify App Deploy:**
    *   `shopify.app.toml` dosyası production URL ile güncellendi (`application_url`, `redirect_urls`, `app_proxy` alanları).
    *   `shopify app deploy --force` komutu ile Shopify Partners'a başarılı deploy yapıldı (versiyon: `achty-ai-ai-recommends-you-2`).
    *   GDPR webhook topic'leri (`customers/data_request`, `customers/redact`, `shop/redact`) toml'dan çıkarıldı — Shopify CLI bunları desteklemiyor, Partners Dashboard'dan manuel girilmesi gerekiyor.

*   **Git & Versiyon Kontrolü:**
    *   Git reposu initialize edildi, tüm dosyalar commit'lendi.
    *   GitHub'a push yapıldı → Vercel otomatik redeploy tetiklendi.

## 8. Hata Düzeltmeleri — Son Aşama

*   **"Prisma session table does not exist" Hatası:**
    *   `.env` dosyasında `DATABASE_URL` eksikti — `shopify app env show` komutu `.env` dosyasını sadece `SHOPIFY_API_KEY` ve `SHOPIFY_API_SECRET` ile yeniden oluşturmuştu.
    *   `DATABASE_URL`, `SCOPES` ve `BILLING_TEST_MODE` değişkenleri `.env` dosyasına eklendi.
    *   Prisma client yeniden generate edildi (`npx prisma generate`).

*   **Schema Geri Yükleme:**
    *   `prisma db pull --force` komutu çalıştırılınca `schema.prisma` dosyası veritabanından okunan ham yapıyla ezilmişti (relation name'ler, `@default(cuid())`, `@updatedAt` kaybolmuştu).
    *   Orijinal schema geri yüklendi — tüm relation isimler, default değerler ve yorumlar düzeltildi.

*   **Build Script Güncelleme:**
    *   `package.json` build komutu `"prisma generate && prisma migrate deploy && remix vite:build"` olarak güncellendi.
    *   Bu sayede Vercel deploy sırasında migration'lar otomatik çalışıyor.

## 9. Veritabanı Bağlantı Hatası Çözümü & Son Düzeltmeler

*   **DATABASE_URL Formatı Düzeltildi:**
    *   `.env` dosyasında `DATABASE_URL` ya eksikti ya da eski SQLite formatında (`file:./dev.db`) kalmıştı.
    *   Supabase PostgreSQL bağlantı string'i doğru formatta eklendi.
    *   **Önemli:** Kullanıcı adı `postgres` olmalı (`postgres.fympfizkmpulwdvjmvlf` değil — bu pooler formatı, direct connection'da çalışmıyor).
    *   Şifredeki özel karakterler (`!!!!`) URL encode edildi → `%21%21%21%21`.
    *   Final format: `postgresql://postgres:[SIFRE]@db.fympfizkmpulwdvjmvlf.supabase.co:5432/postgres`

*   **Prisma Client Yeniden Generate:**
    *   Node.js process'leri Prisma DLL dosyasını kilitlediği için `EPERM` hatası alındı.
    *   Process'ler durdurulup `npx prisma generate` başarıyla çalıştırıldı (v6.19.2).

*   **Veritabanı Bağlantı Doğrulaması:**
    *   `npx prisma migrate status` → "Database schema is up to date!" ✅
    *   5 tablo mevcut: Session, Shop, Project, Scan, ScanResult ✅

*   **Git Push & Vercel Auto-Redeploy:**
    *   Tüm değişiklikler commit'lendi (`a3f3410`) ve GitHub'a push yapıldı.
    *   Vercel otomatik redeploy tetiklendi.

---

**Mevcut Durum & Kalan Adımlar** *(9 Mart 2026)*

✅ Tamamlanan:
- Tüm güvenlik düzeltmeleri (erişim kontrolü, API secret, GDPR, input validation)
- Fiyatlandırma: Pro $199.90/ay, Free 1 scan (skor 35-46)
- Supabase PostgreSQL veritabanı kuruldu ve migration uygulandı
- Lokal `.env` dosyası tamamlandı (DATABASE_URL, API keys, scopes hepsi mevcut)
- `package.json` build script'i güncellendi (`prisma generate && prisma migrate deploy && remix vite:build`)
- `prisma/schema.prisma` geri yüklendi (db pull sonrası bozulmuştu)
- Prisma client v6.19.2 başarıyla generate edildi
- Vercel'e deploy yapıldı (Remix preset) — GitHub'a push ile otomatik
- Shopify Partners'a app deploy edildi (v2: achty-ai-ai-recommends-you-2)
- GitHub'a tüm değişiklikler push yapıldı (commit: a3f3410)

❌ Kalan:
1.  **Vercel Ortam Değişkenleri** — Aşağıdaki değişkenlerin Vercel Dashboard'da doğru olduğundan emin olunmalı:
    - `DATABASE_URL` = `postgresql://postgres:[SIFRE_ENCODED]@db.fympfizkmpulwdvjmvlf.supabase.co:5432/postgres`
    - `SHOPIFY_APP_URL` = `https://achty-shopify.vercel.app`
    - `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SCOPES`, `BILLING_TEST_MODE`, `GEMINI_API_KEY`
2.  **GDPR Webhook URL'leri** — Partners Dashboard → App → Configuration → Privacy compliance:
    - Customer data request → `https://achty-shopify.vercel.app/webhooks`
    - Customer data erasure → `https://achty-shopify.vercel.app/webhooks`
    - Shop data erasure → `https://achty-shopify.vercel.app/webhooks`
3.  **Dev Store Test** — `achty-dev.myshopify.com` üzerinde uygulama kurulumu ve test.
4.  **BILLING_TEST_MODE** — Production'da `false` yapılmalı (gerçek ödeme alınacaksa).
5.  ~~**Gerçek AI Entegrasyonu** — OpenAI/Gemini bağlanmalı (şu an skorlar rastgele üretiliyor).~~ *(Tamamlandı - Gemini Altyapısı Kuruldu)*
6.  **Shopify App Store Review** — Uygulama incelemeye gönderilmeli.
