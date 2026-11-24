import { GoogleGenerativeAI } from "@google/generative-ai";

const AI_BOTS = [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "PerplexityBot",
    "Google-Extended",
];

async function fetchWithTimeout(url, timeoutMs = 4500) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            redirect: "follow",
            headers: {
                "User-Agent": "ACHTy-AI-GEO-Auditor/2.0 (+https://achty-shopify.vercel.app)",
                Accept: "text/html,text/plain,application/xml;q=0.9,*/*;q=0.8",
            },
        });
        const text = await res.text();
        return {
            ok: res.ok,
            status: res.status,
            contentType: res.headers.get("content-type") || "",
            text: text.slice(0, 250000),
        };
    } catch (err) {
        return { ok: false, status: 0, contentType: "", text: "", error: err.message };
    } finally {
        clearTimeout(timer);
    }
}

function parseBlockedAiBots(robotsText) {
    if (!robotsText) return [];
    const lines = robotsText.split(/\r?\n/);
    const blocked = new Set();
    let currentAgents = [];

    for (const rawLine of lines) {
        const line = rawLine.split("#")[0].trim();
        if (!line) {
            currentAgents = [];
            continue;
        }
        const match = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
        if (!match) continue;
        const key = match[1].toLowerCase();
        const value = match[2].trim();

        if (key === "user-agent") {
            currentAgents.push(value.toLowerCase());
        } else if (key === "disallow" && (value === "/" || value === "/*")) {
            for (const bot of AI_BOTS) {
                const botLower = bot.toLowerCase();
                if (currentAgents.includes(botLower)) {
                    blocked.add(bot);
                }
            }
        }
    }
    return Array.from(blocked);
}

function extractJsonLdTypes(html) {
    const types = new Set();
    const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
        try {
            const parsed = JSON.parse(match[1].trim());
            const walk = (node) => {
                if (!node || typeof node !== "object") return;
                if (Array.isArray(node)) {
                    node.forEach(walk);
                    return;
                }
                if (node["@type"]) {
                    const t = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
                    t.forEach((item) => {
                        if (typeof item === "string") types.add(item);
                    });
                }
                if (node["@graph"]) walk(node["@graph"]);
            };
            walk(parsed);
        } catch {
            // Ignore malformed JSON-LD blocks
        }
    }
    return Array.from(types);
}

async function fetchStorefrontGraphql(admin) {
    if (!admin?.graphql) return null;
    try {
        const res = await admin.graphql(`#graphql
            query AchtyStoreGeoContext {
                shop {
                    name
                    description
                    primaryDomain {
                        url
                        host
                    }
                }
                products(first: 10) {
                    nodes {
                        title
                        handle
                        description
                        productType
                        vendor
                        seo {
                            title
                            description
                        }
                    }
                }
                pages(first: 10) {
                    nodes {
                        title
                        handle
                        bodySummary
                    }
                }
                themes(first: 5, roles: MAIN) {
                    nodes {
                        name
                        role
                    }
                }
            }
        `);
        const json = await res.json();
        return json?.data || null;
    } catch (err) {
        console.warn("[ACHTy GEO] Partial or skipped GraphQL store fetch:", err?.message || err);
        return null;
    }
}

export function buildLlmsTxtTemplate({ domain, storeData }) {
    const shopName = storeData?.shop?.name || domain;
    const shopDesc =
        storeData?.shop?.description ||
        `${shopName} is an online Shopify storefront offering curated products at https://${domain}.`;
    const products = storeData?.products?.nodes || [];
    const pages = storeData?.pages?.nodes || [];

    const lines = [
        `# ${shopName}`,
        "",
        `> ${shopDesc.replace(/\s+/g, " ").trim()}`,
        "",
        "## Store Overview",
        `- Website: https://${domain}`,
        `- Catalog: https://${domain}/collections/all`,
        `- Sitemap: https://${domain}/sitemap.xml`,
    ];

    if (products.length > 0) {
        lines.push("", "## Featured Products");
        for (const p of products.slice(0, 8)) {
            const summary = (p.seo?.description || p.description || "").replace(/\s+/g, " ").trim().slice(0, 140);
            lines.push(`- [${p.title}](https://${domain}/products/${p.handle})${summary ? `: ${summary}` : ""}`);
        }
    }

    if (pages.length > 0) {
        lines.push("", "## Store Information & Policies");
        for (const pg of pages.slice(0, 5)) {
            lines.push(`- [${pg.title}](https://${domain}/pages/${pg.handle})`);
        }
    }

    return lines.join("\n");
}

export async function runRealGeoAudit({ admin, domain, shopDomain }) {
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const origin = `https://${cleanDomain}`;

    // Run storefront HTTP checks and Shopify Admin GraphQL inspection in parallel
    const [homeRes, robotsRes, llmsRes, sitemapRes, storeData] = await Promise.all([
        fetchWithTimeout(origin, 5000),
        fetchWithTimeout(`${origin}/robots.txt`, 4000),
        fetchWithTimeout(`${origin}/llms.txt`, 4000),
        fetchWithTimeout(`${origin}/sitemap.xml`, 4000),
        fetchStorefrontGraphql(admin),
    ]);

    const html = homeRes.ok ? homeRes.text : "";
    const checks = [];

    // 1. AI Crawlers (robots.txt) — 20 pts
    const blockedBots = robotsRes.ok ? parseBlockedAiBots(robotsRes.text) : [];
    const robotsScore = !robotsRes.ok
        ? 12
        : blockedBots.length === 0
            ? 20
            : Math.max(0, 20 - blockedBots.length * 4);
    checks.push({
        platform: "AI Crawlers (robots.txt)",
        prompt: "Check GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot & Google-Extended crawl access",
        mentioned: blockedBots.length === 0 && robotsRes.ok,
        sentiment: robotsScore >= 16 ? "positive" : robotsScore >= 10 ? "warning" : "negative",
        position: robotsScore,
        maxPoints: 20,
        response: !robotsRes.ok
            ? `Could not fetch ${origin}/robots.txt (HTTP ${robotsRes.status || "unreachable"}). Ensure storefront is publicly accessible (disable password protection before launching).`
            : blockedBots.length === 0
                ? "All major AI shopping and answer-engine crawlers (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended) are permitted to index your store."
                : `Blocked AI crawlers detected in robots.txt: ${blockedBots.join(", ")}. Allowing these bots helps ChatGPT, Claude, and Perplexity discover your products.`,
    });

    // 2. AI Manifest (/llms.txt) — 20 pts
    const llmsLooksValid =
        llmsRes.ok &&
        !llmsRes.contentType.toLowerCase().includes("text/html") &&
        !/<!doctype html|<html/i.test(llmsRes.text.slice(0, 300)) &&
        llmsRes.text.trim().length >= 80;
    const llmsScore = llmsLooksValid ? 20 : 0;
    checks.push({
        platform: "AI Manifest (llms.txt)",
        prompt: "Verify machine-readable /llms.txt brand and product directory for LLMs",
        mentioned: llmsLooksValid,
        sentiment: llmsLooksValid ? "positive" : "negative",
        position: llmsScore,
        maxPoints: 20,
        response: llmsLooksValid
            ? `Valid /llms.txt detected (${llmsRes.text.trim().length} characters). AI assistants can quickly parse your store summary and key URLs.`
            : "No valid /llms.txt file found at the storefront root. Add an /llms.txt guide (template generated below) so AI agents understand your brand and top products.",
    });

    // 3. Structured Data (JSON-LD Schema) — 25 pts
    const jsonLdTypes = html ? extractJsonLdTypes(html) : [];
    const hasOrgOrWeb = jsonLdTypes.some((t) => /Organization|Store|OnlineStore|LocalBusiness|WebSite/i.test(t));
    const hasProductOrOffer = jsonLdTypes.some((t) => /Product|Offer|ItemList|CollectionPage/i.test(t));
    const hasFaqOrBreadcrumb = jsonLdTypes.some((t) => /FAQPage|BreadcrumbList/i.test(t));
    let schemaScore = 0;
    if (jsonLdTypes.length > 0) schemaScore += 8;
    if (hasOrgOrWeb) schemaScore += 7;
    if (hasProductOrOffer) schemaScore += 6;
    if (hasFaqOrBreadcrumb) schemaScore += 4;
    checks.push({
        platform: "Structured Data (JSON-LD)",
        prompt: "Inspect Organization, WebSite, Product, FAQPage and BreadcrumbList JSON-LD schemas",
        mentioned: schemaScore >= 15,
        sentiment: schemaScore >= 18 ? "positive" : schemaScore >= 8 ? "warning" : "negative",
        position: schemaScore,
        maxPoints: 25,
        response: jsonLdTypes.length > 0
            ? `Detected JSON-LD schemas: ${jsonLdTypes.slice(0, 8).join(", ")}.${!hasProductOrOffer ? " Add Product/Offer schema with pricing and availability." : ""}${!hasFaqOrBreadcrumb ? " Add FAQPage schema to boost direct AI answers." : ""}`
            : homeRes.ok
                ? "No JSON-LD structured data found on homepage. Adding Organization, WebSite, and Product schema dramatically improves citation accuracy in AI search."
                : `Storefront homepage returned HTTP ${homeRes.status || "unreachable"}. Publish storefront (remove password gate) to enable full HTML & schema auditing.`,
    });

    // 4. Metadata & Citability — 15 pts
    const hasTitle = /<title[^>]*>[^<]{5,}<\/title>/i.test(html);
    const hasMetaDesc = /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{20,}["']/i.test(html) ||
        /<meta[^>]+content=["'][^"']{20,}["'][^>]+name=["']description["']/i.test(html);
    const hasOg = /<meta[^>]+property=["']og:(?:title|description)["']/i.test(html);
    const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html);
    const hasSitemap = sitemapRes.ok && /<urlset|<sitemapindex/i.test(sitemapRes.text);
    const metaScore = (hasTitle ? 3 : 0) + (hasMetaDesc ? 4 : 0) + (hasOg ? 3 : 0) + (hasCanonical ? 2 : 0) + (hasSitemap ? 3 : 0);
    const missingMeta = [
        !hasTitle && "Title tag",
        !hasMetaDesc && "Meta description",
        !hasOg && "OpenGraph tags",
        !hasCanonical && "Canonical URL",
        !hasSitemap && "sitemap.xml",
    ].filter(Boolean);
    checks.push({
        platform: "Metadata & Citability",
        prompt: "Audit title, meta description, OpenGraph, canonical URL and XML sitemap",
        mentioned: metaScore >= 12,
        sentiment: metaScore >= 12 ? "positive" : metaScore >= 7 ? "warning" : "negative",
        position: metaScore,
        maxPoints: 15,
        response: missingMeta.length === 0
            ? "Strong citability fundamentals: title, meta description, OpenGraph, canonical URL, and XML sitemap are all properly configured."
            : `Missing or weak metadata signals: ${missingMeta.join(", ")}. Complete these so AI answer engines accurately attribute and summarize your store.`,
    });

    // 5. Shopify Catalog, Pages & Theme AI Readiness — 20 pts
    const products = storeData?.products?.nodes || [];
    const pages = storeData?.pages?.nodes || [];
    const mainTheme = storeData?.themes?.nodes?.[0]?.name || null;
    const isConnectedStore =
        cleanDomain === shopDomain ||
        (storeData?.shop?.primaryDomain?.host && cleanDomain === storeData.shop.primaryDomain.host);

    let catalogScore = 10;
    let catalogMessage = "";
    if (storeData && isConnectedStore) {
        if (products.length === 0) {
            catalogScore = 6;
            catalogMessage = `Connected store${mainTheme ? ` (theme: ${mainTheme})` : ""} has 0 published products yet. Add products with detailed descriptions and SEO fields so AI shopping assistants can recommend them.`;
        } else {
            const richDescCount = products.filter((p) => (p.description || "").trim().length >= 60).length;
            const seoCount = products.filter((p) => p.seo?.title || p.seo?.description).length;
            const typeCount = products.filter((p) => p.productType || p.vendor).length;
            const ratio = (richDescCount + seoCount + typeCount) / (products.length * 3);
            const pageBonus = pages.length >= 2 ? 4 : pages.length >= 1 ? 2 : 0;
            catalogScore = Math.min(20, Math.round(ratio * 16) + pageBonus);
            catalogMessage = `Audited ${products.length} products${mainTheme ? ` on theme "${mainTheme}"` : ""} and ${pages.length} content pages: ${richDescCount}/${products.length} have detailed descriptions, ${seoCount}/${products.length} have custom SEO metadata, and ${typeCount}/${products.length} specify product type/brand.`;
        }
    } else {
        // External/competitor domain — score based on homepage content richness & semantic H1
        const hasH1 = /<h1[^>]*>[\s\S]{3,}<\/h1>/i.test(html);
        const textLen = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/gi, " ").replace(/\s+/g, " ").trim().length;
        catalogScore = (hasH1 ? 6 : 0) + (textLen > 1200 ? 10 : textLen > 400 ? 6 : 2) + (hasSitemap ? 4 : 0);
        catalogMessage = `External domain audit: ${hasH1 ? "clear H1 heading detected" : "missing H1 heading"}, ~${textLen} chars of indexable storefront copy${hasSitemap ? ", XML sitemap accessible" : ""}.`;
    }

    checks.push({
        platform: "Catalog & Content Readiness",
        prompt: "Evaluate product descriptions, SEO metadata, informational pages and active theme structure",
        mentioned: catalogScore >= 14,
        sentiment: catalogScore >= 15 ? "positive" : catalogScore >= 9 ? "warning" : "negative",
        position: catalogScore,
        maxPoints: 20,
        response: catalogMessage,
    });

    const totalScore = Math.max(0, Math.min(100, checks.reduce((sum, c) => sum + c.position, 0)));
    const riskCount = checks.filter((c) => c.sentiment === "negative").length;
    const passedCount = checks.filter((c) => c.mentioned).length;

    // Build deterministic, honest executive summary first
    const weakAreas = checks.filter((c) => !c.mentioned).map((c) => c.platform);
    let summary =
        weakAreas.length === 0
            ? `Excellent AI discoverability (${totalScore}/100): ${cleanDomain} passed all 5 GEO readiness checks across AI crawlers, llms.txt, JSON-LD schema, metadata, and catalog quality.`
            : `${cleanDomain} scored ${totalScore}/100 (${passedCount}/5 checks passed). Top priorities to boost ChatGPT, Claude & Gemini recommendations: ${weakAreas.slice(0, 3).join(", ")}.`;

    // Enhance executive summary with Gemini 2.5 Flash if GEMINI_API_KEY is configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const findingsText = checks
                .map((c) => `- ${c.platform}: ${c.position}/${c.maxPoints} (${c.response})`)
                .join("\n");
            const prompt = `You are a Shopify GEO (Generative Engine Optimization) specialist.
Based ONLY on these live audit results for ${cleanDomain} (Score: ${totalScore}/100):
${findingsText}
Write a concise 2-sentence actionable summary for the store owner explaining their biggest opportunity to be recommended by ChatGPT, Claude, and Gemini. Plain text only, no markdown.`;

            const aiPromise = model.generateContent(prompt);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Gemini timeout")), 5500)
            );
            const aiResult = await Promise.race([aiPromise, timeoutPromise]);
            const text = aiResult?.response?.text?.()?.trim();
            if (text && text.length > 25 && text.length < 600) {
                summary = text.replace(/^["']|["']$/g, "");
            }
        } catch (err) {
            console.warn("[ACHTy GEO] Gemini enhancement skipped, using deterministic audit summary:", err?.message || err);
        }
    }

    const llmsTxtTemplate = buildLlmsTxtTemplate({ domain: cleanDomain, storeData });

    return {
        score: totalScore,
        summary,
        riskCount,
        passedCount,
        checks,
        llmsTxtTemplate,
    };
}
