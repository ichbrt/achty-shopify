export const meta = () => [
    { title: "Privacy Policy — ACHTy AI for Shopify" },
    { name: "description", content: "Privacy Policy and GDPR compliance details for ACHTy AI Shopify App." },
];

export default function PrivacyPolicy() {
    return (
        <main
            style={{
                maxWidth: "820px",
                margin: "0 auto",
                padding: "3rem 1.5rem",
                fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                color: "#18181b",
                lineHeight: 1.7,
            }}
        >
            <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                Privacy Policy — ACHTy AI
            </h1>
            <p style={{ color: "#71717a", marginBottom: "2rem" }}>
                Last updated: November 24, 2026
            </p>

            <section style={{ marginBottom: "1.75rem" }}>
                <h2>1. Overview</h2>
                <p>
                    ACHTy AI (&ldquo;the App&rdquo;), operated by SpaceBera, provides AI Discoverability and
                    Generative Engine Optimization (GEO) auditing for Shopify merchants. We are committed to
                    protecting merchant privacy and complying with Shopify&rsquo;s API Terms and global data
                    protection regulations including GDPR and CCPA.
                </p>
            </section>

            <section style={{ marginBottom: "1.75rem" }}>
                <h2>2. Data We Access &amp; Store</h2>
                <p>When you install the App, we access only the minimum store data needed to audit AI readiness:</p>
                <ul>
                    <li>
                        <strong>Store metadata:</strong> Shopify domain, store name, and OAuth session tokens required
                        to authenticate requests inside Shopify Admin.
                    </li>
                    <li>
                        <strong>Catalog &amp; content metadata:</strong> Product titles, descriptions, SEO fields,
                        informational page titles, and active theme name (read-only via <code>read_products</code>,{" "}
                        <code>read_content</code>, and <code>read_themes</code>) solely to calculate your AI
                        Visibility Score and generate storefront <code>llms.txt</code> templates.
                    </li>
                    <li>
                        <strong>Public storefront signals:</strong> Publicly accessible <code>robots.txt</code>,{" "}
                        <code>llms.txt</code>, <code>sitemap.xml</code>, and homepage HTML metadata/JSON-LD.
                    </li>
                </ul>
                <p>
                    <strong>No Customer PII:</strong> ACHTy AI does <em>not</em> collect, store, or process
                    end-customer personal data (such as customer names, emails, addresses, or orders).
                </p>
            </section>

            <section style={{ marginBottom: "1.75rem" }}>
                <h2>3. Data Retention &amp; Deletion (GDPR Compliance)</h2>
                <p>
                    ACHTy AI subscribes to Shopify&rsquo;s mandatory compliance webhooks
                    (<code>customers/data_request</code>, <code>customers/redact</code>, and{" "}
                    <code>shop/redact</code>) as well as <code>app/uninstalled</code>. Upon uninstalling the App,
                    all stored shop records, projects, scan results, and Shopify session tokens are permanently
                    deleted from our PostgreSQL database.
                </p>
            </section>

            <section style={{ marginBottom: "1.75rem" }}>
                <h2>4. Third-Party Services</h2>
                <p>
                    Hosting and database infrastructure are provided by Vercel and Supabase. When AI executive
                    summaries are enabled, only non-personal technical audit metrics (e.g., schema types and
                    robots.txt findings) are sent to Google Gemini API to generate recommendations.
                </p>
            </section>

            <section style={{ marginBottom: "1.75rem" }}>
                <h2>5. Contact Us</h2>
                <p>
                    For privacy inquiries, data deletion requests, or merchant support, contact us at{" "}
                    <a href="mailto:beratdemirci@spacebera.com" style={{ color: "#ea580c" }}>
                        beratdemirci@spacebera.com
                    </a>
                    .
                </p>
            </section>
        </main>
    );
}
