import { redirect } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { login } from "../shopify.server";

export const meta = () => [
    { title: "ACHTy AI — AI Visibility & GEO Optimizer for Shopify" },
    {
        name: "description",
        content:
            "Audit and improve how ChatGPT, Claude, Gemini, and Perplexity discover and recommend your Shopify store.",
    },
];

export const loader = async ({ request }) => {
    const url = new URL(request.url);

    if (url.searchParams.get("shop")) {
        throw redirect(`/app?${url.searchParams.toString()}`);
    }

    return { showForm: Boolean(login) };
};

export default function Index() {
    const { showForm } = useLoaderData();

    return (
        <main
            style={{
                minHeight: "100vh",
                background: "#09090b",
                color: "#fafafa",
                fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "2rem",
            }}
        >
            <div
                style={{
                    maxWidth: "560px",
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "16px",
                    padding: "2.5rem",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                    <img src="/achty-logo.png" alt="ACHTy AI" style={{ width: "44px", height: "44px", objectFit: "contain" }} />
                    <h1 style={{ fontSize: "1.6rem", margin: 0 }}>
                        ACHTy <span style={{ color: "#e8822a" }}>AI</span>
                    </h1>
                </div>

                <p style={{ color: "#a1a1aa", lineHeight: 1.6, marginBottom: "1.75rem" }}>
                    AI Visibility &amp; GEO Readiness Scanner for Shopify stores. Audit your AI crawler access,{" "}
                    <code>/llms.txt</code> manifest, JSON-LD structured data, and product catalog discoverability across
                    ChatGPT, Claude, Gemini, and Perplexity.
                </p>

                {showForm && (
                    <Form method="post" action="/auth/login" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                        <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.9rem" }}>
                            <span style={{ color: "#e4e4e7" }}>Shopify Store Domain</span>
                            <input
                                type="text"
                                name="shop"
                                required
                                placeholder="your-shop.myshopify.com"
                                style={{
                                    padding: "0.75rem 0.9rem",
                                    borderRadius: "10px",
                                    border: "1px solid rgba(255,255,255,0.18)",
                                    background: "rgba(0,0,0,0.4)",
                                    color: "#fff",
                                    fontSize: "0.95rem",
                                }}
                            />
                        </label>
                        <button
                            type="submit"
                            style={{
                                padding: "0.8rem 1.2rem",
                                borderRadius: "10px",
                                border: "none",
                                background: "linear-gradient(135deg, #e8822a, #ea580c)",
                                color: "#fff",
                                fontWeight: 600,
                                fontSize: "0.95rem",
                                cursor: "pointer",
                            }}
                        >
                            Open in Shopify Admin
                        </button>
                    </Form>
                )}

                <footer
                    style={{
                        marginTop: "2rem",
                        paddingTop: "1rem",
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.82rem",
                        color: "#71717a",
                    }}
                >
                    <Link to="/privacy" style={{ color: "#a1a1aa", textDecoration: "none" }}>
                        Privacy Policy
                    </Link>
                    <a href="mailto:beratdemirci@spacebera.com" style={{ color: "#a1a1aa", textDecoration: "none" }}>
                        Support: beratdemirci@spacebera.com
                    </a>
                </footer>
            </div>
        </main>
    );
}
