import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import dashboardStyles from "../styles/dashboard.css?url";
import { authenticate, MONTHLY_PLAN, IS_TEST_BILLING } from "../shopify.server";
import prisma from "../db.server";

export const links = () => [{ rel: "stylesheet", href: dashboardStyles }];

export const loader = async ({ request }) => {
    const { session, billing } = await authenticate.admin(request);

    const billingConfig = await billing.check({
        plans: [MONTHLY_PLAN],
        isTest: IS_TEST_BILLING,
    });
    const hasActiveSubscription = billingConfig.appSubscriptions.some(
        (sub) => sub.name === MONTHLY_PLAN
    );

    const plan = hasActiveSubscription ? "pro" : "free";

    // Upsert ensures new installs visiting Billing directly never fail with Prisma P2025
    const shop = await prisma.shop.upsert({
        where: { shopDomain: session.shop },
        update: { plan },
        create: {
            shopDomain: session.shop,
            shopName: session.shop.replace(".myshopify.com", ""),
            plan,
        },
        include: { projects: true },
    });

    return json({ shop, hasActiveSubscription });
};

export const action = async ({ request }) => {
    const { session, billing } = await authenticate.admin(request);
    const formData = await request.formData();
    const intent = formData.get("action");

    if (intent === "upgrade") {
        const storeHandle = session.shop.replace(/\.myshopify\.com$/i, "");
        await billing.request({
            plan: MONTHLY_PLAN,
            isTest: IS_TEST_BILLING,
            returnUrl: `https://admin.shopify.com/store/${storeHandle}/apps/${process.env.SHOPIFY_API_KEY}/app/billing`,
        });
        return null;
    }

    if (intent === "downgrade") {
        const billingCheck = await billing.check({
            plans: [MONTHLY_PLAN],
            isTest: IS_TEST_BILLING,
        });

        const activeSubscription = billingCheck.appSubscriptions.find(
            (sub) => sub.name === MONTHLY_PLAN
        );

        if (activeSubscription) {
            await billing.cancel({
                subscriptionId: activeSubscription.id,
                isTest: IS_TEST_BILLING,
                prorate: true,
            });

            await prisma.shop.upsert({
                where: { shopDomain: session.shop },
                update: { plan: "free" },
                create: {
                    shopDomain: session.shop,
                    shopName: session.shop.replace(".myshopify.com", ""),
                    plan: "free",
                },
            });

            return json({ success: true, message: "Pro subscription cancelled. Your store is now on the Starter plan." });
        }
        return json({ error: "No active Pro subscription found to cancel." }, { status: 400 });
    }

    return null;
};

export default function Billing() {
    const { shop } = useLoaderData();
    const actionData = useActionData();
    const submit = useSubmit();
    const navigation = useNavigation();
    const isSubmitting = navigation.state !== "idle";

    const isPro = shop?.plan === "pro";

    return (
        <div className="app-wrapper">
            <div className="dashboard-container">
                <div className="section-header">
                    <h2>Subscription &amp; Billing</h2>
                </div>

                {actionData?.message && (
                    <div
                        className="premium-card"
                        style={{
                            marginBottom: "1.5rem",
                            borderColor: "#10b981",
                            color: "#a7f3d0",
                            padding: "1rem 1.25rem",
                        }}
                    >
                        {actionData.message}
                    </div>
                )}

                {actionData?.error && (
                    <div
                        className="premium-card"
                        style={{
                            marginBottom: "1.5rem",
                            borderColor: "#ef4444",
                            color: "#fecaca",
                            padding: "1rem 1.25rem",
                        }}
                    >
                        {actionData.error}
                    </div>
                )}

                <div className="metric-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
                    {/* Starter Plan */}
                    <div className="premium-card" style={{ borderColor: isPro ? "var(--border-color)" : "#10b981" }}>
                        <div className="metric-title" style={{ color: isPro ? "var(--text-muted)" : "#34d399" }}>
                            <span>Starter Plan</span>
                            {!isPro && <span className="dark-badge success">ACTIVE</span>}
                        </div>
                        <div className="metric-value">
                            $0 <span style={{ fontSize: "1rem", color: "#a1a1aa" }}>/mo</span>
                        </div>
                        <div style={{ marginTop: "1rem", color: "#a1a1aa" }}>
                            <ul style={{ listStyle: "none", padding: 0, lineHeight: 2 }}>
                                <li>✅ Track 1 Storefront Domain</li>
                                <li>✅ Up to 3 Full AI Readiness Audits</li>
                                <li>✅ Live AI Crawler, JSON-LD &amp; Metadata Audit</li>
                                <li>✅ Complete Honest 0–100 Visibility Score</li>
                                <li>❌ Multi-Domain Competitor Tracking</li>
                                <li>❌ Full Storefront llms.txt Auto-Generator</li>
                            </ul>
                        </div>
                        {isPro && (
                            <button
                                className="primary-button"
                                disabled={isSubmitting}
                                style={{
                                    marginTop: "1.5rem",
                                    width: "100%",
                                    background: "transparent",
                                    border: "1px solid #ef4444",
                                    color: "#ef4444",
                                }}
                                onClick={() => submit({ action: "downgrade" }, { method: "POST" })}
                            >
                                {isSubmitting ? "Processing..." : "Downgrade to Starter"}
                            </button>
                        )}
                    </div>

                    {/* Pro Plan */}
                    <div className="premium-card" style={{ borderColor: isPro ? "#10b981" : "var(--border-color)" }}>
                        <div className="metric-title" style={{ color: isPro ? "#34d399" : "var(--text-muted)" }}>
                            <span>Pro Plan</span>
                            {isPro && <span className="dark-badge success">ACTIVE</span>}
                        </div>
                        <div className="metric-value">
                            $199.90 <span style={{ fontSize: "1rem", color: "#a1a1aa" }}>/mo</span>
                        </div>
                        <div style={{ marginTop: "1rem", color: "#a1a1aa" }}>
                            <ul style={{ listStyle: "none", padding: 0, lineHeight: 2 }}>
                                <li>✨ Track Unlimited Store &amp; Competitor Domains</li>
                                <li>✨ Unlimited Real-Time AI &amp; GEO Audits</li>
                                <li>✨ Full Product Catalog &amp; Content Readiness Audit</li>
                                <li>✨ 1-Click Auto-Generated Storefront llms.txt</li>
                                <li>✨ Prioritized AI Recommendation Insights</li>
                            </ul>
                        </div>
                        {!isPro && (
                            <button
                                className="ai-seo-idle-btn"
                                disabled={isSubmitting}
                                style={{ marginTop: "1.5rem" }}
                                onClick={() => submit({ action: "upgrade" }, { method: "POST" })}
                            >
                                {isSubmitting ? "Redirecting to Shopify Billing..." : "Upgrade to Pro"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
