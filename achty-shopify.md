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

---

**Next Steps**
1.  Connect the actual artificial intelligence (`lib/services/ai-seo.ts`) from our AIVista project directly into the Shopify app's code to generate real-time reports via OpenAI/Gemini. (Currently, analyses return static/random numbers).
2.  Set up **Supabase** (PostgreSQL database) and **Vercel** (hosting).
3.  Configure all environment variables on Vercel.
4.  Run `prisma migrate deploy` against production database.
5.  Update `shopify.app.toml` with production URL and deploy via `shopify app deploy`.
6.  Submit app for Shopify App Store review.
