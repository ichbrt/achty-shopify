import { json } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import dashboardStyles from "../styles/dashboard.css?url";
import { authenticate, MONTHLY_PLAN, IS_TEST_BILLING } from "../shopify.server";
import prisma from "../db.server";

export const links = () => [{ rel: "stylesheet", href: dashboardStyles }];

export const loader = async ({ request }) => {
    const { session, billing } = await authenticate.admin(request);

    // Check if the merchant has an active subscription
    const billingConfig = await billing.check({
        plans: [MONTHLY_PLAN],
        isTest: IS_TEST_BILLING,
    });
    const hasActiveSubscription = billingConfig.appSubscriptions.some(sub => sub.name === MONTHLY_PLAN);

    // Sync the subscription status to our local database
    await prisma.shop.update({
        where: { shopDomain: session.shop },
        data: { plan: hasActiveSubscription ? "pro" : "free" } // keep DB in sync
    });

    const shop = await prisma.shop.findUnique({
        where: { shopDomain: session.shop },
        include: { projects: true }
    });

    return json({ shop, hasActiveSubscription });
};

export const action = async ({ request }) => {
    const { session, billing } = await authenticate.admin(request);
    const formData = await request.formData();
    const action = formData.get("action");

    if (action === "upgrade") {
        // This will redirect the user to Shopify's billing approval page automatically
        await billing.request({
            plan: MONTHLY_PLAN,
            isTest: IS_TEST_BILLING,
            returnUrl: `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}/app/billing`,
        });
        return null;
    }

    if (action === "downgrade") {
        const billingCheck = await billing.check({
            plans: [MONTHLY_PLAN],
            isTest: IS_TEST_BILLING,
        });

        const activeSubscription = billingCheck.appSubscriptions.find(sub => sub.name === MONTHLY_PLAN);

        if (activeSubscription) {
            await billing.cancel({
                subscriptionId: activeSubscription.id,
                isTest: IS_TEST_BILLING,
                prorate: true,
            });

            await prisma.shop.update({
                where: { shopDomain: session.shop },
                data: { plan: "free" }
            });

            return json({ success: true, message: "Subscription cancelled successfully." });
        }
        return json({ error: "No active subscription found to cancel." }, { status: 400 });
    }

    return null;
};

export default function Billing() {
    const { shop } = useLoaderData();
    const submit = useSubmit();

    const isPro = shop?.plan === "pro";

    return (
        <div className="app-wrapper">
            <div className="dashboard-container">
                <div className="section-header">
                    <h2>Subscription & Billing</h2>
                </div>

                <div className="metric-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    {/* Free Plan Box */}
                    <div className="premium-card" style={{ borderColor: isPro ? 'var(--border-color)' : '#10b981' }}>
                        <div className="metric-title" style={{ color: isPro ? 'var(--text-muted)' : '#34d399' }}>
                            <span>Starter Plan</span>
                            {(!isPro) && <span className="dark-badge success">ACTIVE</span>}
                        </div>
                        <div className="metric-value">$0 <span style={{ fontSize: '1rem', color: '#a1a1aa' }}>/mo</span></div>
                        <div style={{ marginTop: '1rem', color: '#a1a1aa' }}>
                            <ul style={{ listStyle: 'none', padding: 0, lineHeight: 2 }}>
                                <li>✅ Track 1 Domain</li>
                                <li>✅ 1 Free AI Scan</li>
                                <li>❌ Limited Score Range</li>
                                <li>❌ No Competitor Analysis</li>
                            </ul>
                        </div>
                        {isPro && (
                            <button
                                className="primary-button"
                                style={{ marginTop: '1.5rem', width: '100%', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444' }}
                                onClick={() => submit({ action: 'downgrade' }, { method: "POST" })}
                            >
                                Downgrade to Free
                            </button>
                        )}
                    </div>

                    {/* Pro Plan Box */}
                    <div className="premium-card" style={{ borderColor: isPro ? '#10b981' : 'var(--border-color)' }}>
                        <div className="metric-title" style={{ color: isPro ? '#34d399' : 'var(--text-muted)' }}>
                            <span>Pro Plan</span>
                            {isPro && <span className="dark-badge success">ACTIVE</span>}
                        </div>
                        <div className="metric-value">$199.90 <span style={{ fontSize: '1rem', color: '#a1a1aa' }}>/mo</span></div>
                        <div style={{ marginTop: '1rem', color: '#a1a1aa' }}>
                            <ul style={{ listStyle: 'none', padding: 0, lineHeight: 2 }}>
                                <li>✨ Track Unlimited Domains</li>
                                <li>✨ Unlimited AI Scans</li>
                                <li>✨ Full Score Range (up to 100)</li>
                                <li>✨ Premium AI SEO Optimizer</li>
                                <li>✨ Deep Competitor Analysis</li>
                            </ul>
                        </div>
                        {!isPro && (
                            <button
                                className="ai-seo-idle-btn"
                                style={{ marginTop: '1.5rem' }}
                                onClick={() => submit({ action: 'upgrade' }, { method: "POST" })}
                            >
                                Upgrade to Pro
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
