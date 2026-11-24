import { json } from "@remix-run/node";
import { Link, useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { buildLlmsTxtTemplate, runRealGeoAudit } from "../services/geo-audit.server";
import dashboardStyles from "../styles/dashboard.css?url";

export const links = () => [{ rel: "stylesheet", href: dashboardStyles }];

const FREE_SCAN_LIMIT = 3;

export const loader = async ({ request }) => {
    const { session, admin } = await authenticate.admin(request);
    const shop = session.shop;

    const shopRecord = await prisma.shop.upsert({
        where: { shopDomain: shop },
        update: {},
        create: {
            shopDomain: shop,
            shopName: shop.replace(".myshopify.com", ""),
        },
        include: {
            projects: {
                orderBy: { createdAt: "desc" },
                include: {
                    scans: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                        include: {
                            results: {
                                orderBy: { createdAt: "asc" },
                            },
                        },
                    },
                },
            },
        },
    });

    // Fetch storefront primary domain & basic store data for accurate default tracking & llms.txt preview
    let primaryHost = shop;
    let storeData = null;
    try {
        const res = await admin.graphql(`#graphql
            query AchtyDashboardStoreInfo {
                shop {
                    name
                    description
                    primaryDomain {
                        url
                        host
                    }
                }
                products(first: 8) {
                    nodes {
                        title
                        handle
                        description
                        seo {
                            description
                        }
                    }
                }
                pages(first: 5) {
                    nodes {
                        title
                        handle
                    }
                }
            }
        `);
        const parsed = await res.json();
        storeData = parsed?.data || null;
        if (storeData?.shop?.primaryDomain?.host) {
            primaryHost = storeData.shop.primaryDomain.host;
        }
    } catch {
        // Non-fatal; fall back to session.shop
    }

    const latestScans = shopRecord.projects
        .map((p) => p.scans[0])
        .filter((s) => s && s.score != null);

    const avgScore =
        latestScans.length > 0
            ? Math.round(
                latestScans.reduce((sum, s) => sum + (s.score || 0), 0) /
                latestScans.length
            )
            : null;

    const latestScanIds = latestScans.map((s) => s.id);
    const [totalScans, passedChecks, riskAlerts] = await Promise.all([
        prisma.scan.count({
            where: { project: { shopId: shopRecord.id } },
        }),
        latestScanIds.length > 0
            ? prisma.scanResult.count({
                where: { scanId: { in: latestScanIds }, mentioned: true },
            })
            : 0,
        latestScanIds.length > 0
            ? prisma.scanResult.count({
                where: { scanId: { in: latestScanIds }, sentiment: "negative" },
            })
            : 0,
    ]);

    const llmsPreview = buildLlmsTxtTemplate({
        domain: primaryHost,
        storeData,
    });

    return json({
        shop: shopRecord,
        projects: shopRecord.projects,
        primaryHost,
        avgScore,
        totalScans,
        passedChecks,
        riskAlerts,
        llmsPreview,
        freeScanLimit: FREE_SCAN_LIMIT,
    });
};

export const action = async ({ request }) => {
    const { session, admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("action");

    const shop = await prisma.shop.upsert({
        where: { shopDomain: session.shop },
        update: {},
        create: {
            shopDomain: session.shop,
            shopName: session.shop.replace(".myshopify.com", ""),
        },
        include: { projects: true },
    });

    if (actionType === "addProject") {
        const rawUrl = formData.get("url")?.toString().trim();
        const name = formData.get("name")?.toString().trim() || rawUrl;

        if (!rawUrl) {
            return json({ error: "Please enter a domain to monitor." }, { status: 400 });
        }

        const cleanUrl = rawUrl.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim().toLowerCase();
        const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;
        if (!domainRegex.test(cleanUrl)) {
            return json(
                { error: "Please enter a valid domain (e.g., myshop.com or myshop.myshopify.com)." },
                { status: 400 }
            );
        }

        if (shop.projects.some((p) => p.url.toLowerCase() === cleanUrl)) {
            return json({ error: `${cleanUrl} is already being tracked.` }, { status: 400 });
        }

        if (shop.projects.length >= 1 && shop.plan === "free") {
            return json(
                {
                    error: "Starter plan tracks 1 domain. Upgrade to Pro to monitor unlimited store & competitor domains.",
                    upgradeCta: true,
                },
                { status: 403 }
            );
        }

        await prisma.project.create({
            data: {
                shopId: shop.id,
                url: cleanUrl,
                name: name.substring(0, 100),
            },
        });

        return json({ success: true, message: `Added ${cleanUrl}. Run an AI Visibility Audit to inspect live signals.` });
    }

    if (actionType === "deleteProject") {
        const projectId = formData.get("projectId")?.toString();
        const project = shop.projects.find((p) => p.id === projectId);
        if (!project) {
            return json({ error: "Project not found or access denied." }, { status: 403 });
        }

        await prisma.project.delete({ where: { id: projectId } });
        return json({ success: true, message: `Removed ${project.url} from tracked stores.` });
    }

    if (actionType === "quickScan") {
        const projectId = formData.get("projectId")?.toString();
        const project = shop.projects.find((p) => p.id === projectId);
        if (!project) {
            return json({ error: "Project not found or access denied." }, { status: 403 });
        }

        if (shop.plan === "free") {
            const existingScanCount = await prisma.scan.count({
                where: { project: { shopId: shop.id } },
            });
            if (existingScanCount >= FREE_SCAN_LIMIT) {
                return json(
                    {
                        error: `Starter plan includes ${FREE_SCAN_LIMIT} full AI readiness audits. Upgrade to Pro for unlimited scans.`,
                        upgradeCta: true,
                    },
                    { status: 403 }
                );
            }
        }

        const audit = await runRealGeoAudit({
            admin,
            domain: project.url,
            shopDomain: session.shop,
        });

        await prisma.scan.create({
            data: {
                projectId: project.id,
                status: "completed",
                score: audit.score,
                summary: audit.summary,
                completedAt: new Date(),
                results: {
                    create: audit.checks.map((check) => ({
                        platform: check.platform,
                        prompt: check.prompt,
                        response: check.response,
                        mentioned: check.mentioned,
                        sentiment: check.sentiment,
                        position: check.position,
                    })),
                },
            },
        });

        return json({
            success: true,
            message: `Completed live AI Visibility Audit for ${project.url} — Score: ${audit.score}/100.`,
        });
    }

    return json({ error: "Unknown action." }, { status: 400 });
};

function AuditResultsPanel({ project, lastScan, isScanning, onScan }) {
    if (!lastScan) {
        return (
            <div className="ai-seo-panel">
                <button
                    className="ai-seo-idle-btn"
                    disabled={isScanning}
                    onClick={() => onScan(project.id)}
                >
                    {isScanning ? "⚡ Auditing Storefront Signals..." : "⚡ Run Live AI Visibility Audit"}
                </button>
            </div>
        );
    }

    const results = lastScan.results || [];
    const passed = results.filter((r) => r.mentioned).length;
    const issues = results.filter((r) => r.sentiment === "negative").length;
    const warnings = results.filter((r) => r.sentiment === "warning").length;

    return (
        <div className="ai-seo-panel">
            <div className="ai-seo-active-box">
                <div className="ai-seo-active-header">
                    <div className="ai-seo-active-title">
                        <span className="ai-seo-pulsing-dot" />
                        Live GEO Audit Report
                    </div>
                    <div style={{ color: lastScan.score >= 70 ? "#34d399" : lastScan.score >= 45 ? "#fbbf24" : "#f87171", fontSize: "1.5rem", fontWeight: "bold" }}>
                        {Math.round(lastScan.score || 0)}/100
                    </div>
                </div>

                {lastScan.summary && (
                    <p style={{ color: "#e4e4e7", fontSize: "0.92rem", lineHeight: 1.6, margin: "0.75rem 0 1rem" }}>
                        {lastScan.summary}
                    </p>
                )}

                <div className="ai-seo-metrics" style={{ marginBottom: "1rem" }}>
                    <div className="ai-seo-metric-box">
                        <div className="ai-seo-metric-val" style={{ color: "#34d399" }}>{passed}/{results.length || 5}</div>
                        <div className="ai-seo-metric-lbl">Checks Passed</div>
                    </div>
                    <div className="ai-seo-metric-box">
                        <div className="ai-seo-metric-val" style={{ color: "#fbbf24" }}>{warnings}</div>
                        <div className="ai-seo-metric-lbl">Warnings</div>
                    </div>
                    <div className="ai-seo-metric-box">
                        <div className="ai-seo-metric-val" style={{ color: "#f87171" }}>{issues}</div>
                        <div className="ai-seo-metric-lbl">Risk Alerts</div>
                    </div>
                    <div className="ai-seo-metric-box">
                        <div className="ai-seo-metric-val" style={{ color: "#e8822a" }}>{Math.round(lastScan.score || 0)}%</div>
                        <div className="ai-seo-metric-lbl">GEO Readiness</div>
                    </div>
                </div>

                {results.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                        {results.map((r) => {
                            const badgeColor =
                                r.sentiment === "positive"
                                    ? "#34d399"
                                    : r.sentiment === "warning"
                                        ? "#fbbf24"
                                        : "#f87171";
                            const statusIcon =
                                r.sentiment === "positive" ? "✓" : r.sentiment === "warning" ? "!" : "✕";

                            return (
                                <div
                                    key={r.id}
                                    style={{
                                        background: "rgba(255,255,255,0.03)",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        borderRadius: "10px",
                                        padding: "0.75rem 1rem",
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                                        <span style={{ fontWeight: 600, color: "#f4f4f5", fontSize: "0.9rem" }}>
                                            <span style={{ color: badgeColor, marginRight: "0.45rem" }}>{statusIcon}</span>
                                            {r.platform}
                                        </span>
                                        <span style={{ color: badgeColor, fontWeight: 600, fontSize: "0.85rem" }}>
                                            +{r.position ?? 0} pts
                                        </span>
                                    </div>
                                    <div style={{ color: "#a1a1aa", fontSize: "0.83rem", lineHeight: 1.5 }}>
                                        {r.response}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Dashboard() {
    const {
        shop,
        projects,
        primaryHost,
        avgScore,
        totalScans,
        passedChecks,
        riskAlerts,
        llmsPreview,
        freeScanLimit,
    } = useLoaderData();
    const actionData = useActionData();
    const submit = useSubmit();
    const navigation = useNavigation();

    const [showAddForm, setShowAddForm] = useState(false);
    const [newDomain, setNewDomain] = useState("");
    const [newName, setNewName] = useState("");
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [copiedLlms, setCopiedLlms] = useState(false);

    const isLoading = navigation.state !== "idle";
    const isPro = shop?.plan === "pro";

    const handleQuickScan = (projectId) => {
        submit({ action: "quickScan", projectId }, { method: "POST" });
    };

    const handleAddSubmit = (e) => {
        e.preventDefault();
        if (!newDomain.trim()) return;
        submit(
            { action: "addProject", url: newDomain.trim(), name: newName.trim() || newDomain.trim() },
            { method: "POST" }
        );
        setNewDomain("");
        setNewName("");
        setShowAddForm(false);
    };

    const handleCopyLlms = async () => {
        try {
            await navigator.clipboard.writeText(llmsPreview);
            setCopiedLlms(true);
            setTimeout(() => setCopiedLlms(false), 2500);
        } catch {
            setCopiedLlms(false);
        }
    };

    return (
        <div className="app-wrapper">
            <div className="dashboard-container">
                <div className="hero-section">
                    <div>
                        <div className="overview-pill">
                            <div className="overview-dot" />
                            <span className="overview-text">
                                ACHTy AI · {isPro ? "PRO PLAN" : `STARTER PLAN (${totalScans}/${freeScanLimit} AUDITS)`}
                            </span>
                        </div>
                        <h1 className="hero-title">AI Visibility Dashboard</h1>
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        {!isPro && (
                            <Link
                                to="/app/billing"
                                className="scan-button-dark"
                                style={{ textDecoration: "none", borderColor: "#e8822a", color: "#fb923c" }}
                            >
                                Upgrade to Pro
                            </Link>
                        )}
                        <button
                            className="aivista-add-btn"
                            onClick={() => setShowAddForm((prev) => !prev)}
                        >
                            <span style={{ fontSize: "1rem", fontWeight: "bold" }}>+</span>{" "}
                            {showAddForm ? "Cancel" : "Add Domain"}
                        </button>
                    </div>
                </div>

                {actionData?.error && (
                    <div
                        className="premium-card"
                        style={{
                            marginBottom: "1.5rem",
                            borderColor: "#ef4444",
                            color: "#fecaca",
                            padding: "1rem 1.25rem",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "1rem",
                        }}
                    >
                        <span>{actionData.error}</span>
                        {actionData.upgradeCta && (
                            <Link
                                to="/app/billing"
                                className="primary-button"
                                style={{ textDecoration: "none", padding: "0.45rem 0.9rem", fontSize: "0.85rem" }}
                            >
                                View Pro Plan
                            </Link>
                        )}
                    </div>
                )}

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

                {showAddForm && (
                    <form
                        onSubmit={handleAddSubmit}
                        className="premium-card"
                        style={{
                            marginBottom: "1.75rem",
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.75rem",
                            alignItems: "flex-end",
                        }}
                    >
                        <div style={{ flex: "1 1 220px" }}>
                            <label style={{ display: "block", fontSize: "0.8rem", color: "#a1a1aa", marginBottom: "0.35rem" }}>
                                Store or Competitor Domain
                            </label>
                            <input
                                type="text"
                                required
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value)}
                                placeholder={primaryHost}
                                style={{
                                    width: "100%",
                                    padding: "0.6rem 0.85rem",
                                    borderRadius: "8px",
                                    border: "1px solid rgba(255,255,255,0.15)",
                                    background: "rgba(255,255,255,0.05)",
                                    color: "#fff",
                                }}
                            />
                        </div>
                        <div style={{ flex: "1 1 180px" }}>
                            <label style={{ display: "block", fontSize: "0.8rem", color: "#a1a1aa", marginBottom: "0.35rem" }}>
                                Label (optional)
                            </label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="My Storefront"
                                style={{
                                    width: "100%",
                                    padding: "0.6rem 0.85rem",
                                    borderRadius: "8px",
                                    border: "1px solid rgba(255,255,255,0.15)",
                                    background: "rgba(255,255,255,0.05)",
                                    color: "#fff",
                                }}
                            />
                        </div>
                        <button type="submit" className="primary-button" disabled={isLoading}>
                            {isLoading ? "Adding..." : "Track Domain"}
                        </button>
                    </form>
                )}

                <div className="metric-grid" style={{ marginBottom: "2.5rem" }}>
                    <div className="aivista-stat-card" style={{ background: "linear-gradient(to bottom right, rgba(249, 115, 22, 0.15), transparent)" }}>
                        <div className="absolute-decor" />
                        <div className="stat-header">
                            <div className="stat-icon-wrapper" style={{ background: "rgba(249, 115, 22, 0.15)" }}>
                                <span style={{ fontSize: "1.2rem" }}>👁️</span>
                            </div>
                        </div>
                        <div>
                            <div className="stat-label">Visibility Score</div>
                            <div className="stat-value">
                                {avgScore !== null ? avgScore : "—"}
                                {avgScore !== null && <span className="stat-suffix">/100</span>}
                            </div>
                        </div>
                    </div>

                    <div className="aivista-stat-card" style={{ background: "linear-gradient(to bottom right, rgba(59, 130, 246, 0.1), transparent)" }}>
                        <div className="absolute-decor" />
                        <div className="stat-header">
                            <div className="stat-icon-wrapper" style={{ background: "rgba(59, 130, 246, 0.15)" }}>
                                <span style={{ fontSize: "1.2rem" }}>✅</span>
                            </div>
                        </div>
                        <div>
                            <div className="stat-label">Passed GEO Checks</div>
                            <div className="stat-value">{passedChecks}</div>
                        </div>
                    </div>

                    <div className="aivista-stat-card" style={{ background: "linear-gradient(to bottom right, rgba(16, 185, 129, 0.1), transparent)" }}>
                        <div className="absolute-decor" />
                        <div className="stat-header">
                            <div className="stat-icon-wrapper" style={{ background: "rgba(16, 185, 129, 0.15)" }}>
                                <span style={{ fontSize: "1.2rem" }}>⚡</span>
                            </div>
                        </div>
                        <div>
                            <div className="stat-label">Total Audits</div>
                            <div className="stat-value">{totalScans}</div>
                        </div>
                    </div>

                    <div className="aivista-stat-card" style={{ background: "linear-gradient(to bottom right, rgba(239, 68, 68, 0.1), transparent)" }}>
                        <div className="absolute-decor" />
                        <div className="stat-header">
                            <div className="stat-icon-wrapper" style={{ background: "rgba(239, 68, 68, 0.15)" }}>
                                <span style={{ fontSize: "1.2rem" }}>⚠</span>
                            </div>
                        </div>
                        <div>
                            <div className="stat-label">Risk Alerts</div>
                            <div className="stat-value">{riskAlerts}</div>
                        </div>
                    </div>
                </div>

                <div className="section-header">
                    <h2>Tracked Stores</h2>
                </div>

                {projects.length === 0 ? (
                    <div className="premium-card empty-state-card">
                        <div style={{ color: "#a1a1aa", fontSize: "1.05rem", marginBottom: "1.5rem" }}>
                            Audit your store&rsquo;s live AI crawl access, <code>/llms.txt</code>, JSON-LD schema, and product catalog readiness for ChatGPT, Claude &amp; Gemini.
                        </div>
                        <button
                            className="primary-button"
                            disabled={isLoading}
                            onClick={() => {
                                submit(
                                    { action: "addProject", url: primaryHost, name: shop.shopName || "My Store" },
                                    { method: "POST" }
                                );
                            }}
                        >
                            Track My Store ({primaryHost})
                        </button>
                    </div>
                ) : (
                    <div className="projects-grid">
                        {projects.map((project) => {
                            const lastScan = project.scans[0];
                            const isConfirming = confirmDeleteId === project.id;
                            return (
                                <div key={project.id} className="project-card">
                                    <div className="project-header">
                                        <div>
                                            <h3>{project.name}</h3>
                                            <a
                                                href={`https://${project.url}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="project-url"
                                            >
                                                {project.url}
                                            </a>
                                        </div>
                                        <div className="project-actions">
                                            {lastScan ? (
                                                <span className={`dark-badge ${lastScan.score >= 70 ? "success" : "warning"}`}>
                                                    Score: {Math.round(lastScan.score || 0)}/100
                                                </span>
                                            ) : (
                                                <span className="dark-badge">NOT AUDITED</span>
                                            )}

                                            <button
                                                className="scan-button-dark"
                                                onClick={() => handleQuickScan(project.id)}
                                                disabled={isLoading}
                                            >
                                                {isLoading ? "⚡ Auditing..." : "⚡ Re-Run Audit"}
                                            </button>

                                            {isConfirming ? (
                                                <>
                                                    <button
                                                        className="scan-button-dark"
                                                        style={{ background: "#ef4444", borderColor: "#ef4444", color: "#fff" }}
                                                        onClick={() => {
                                                            setConfirmDeleteId(null);
                                                            submit(
                                                                { action: "deleteProject", projectId: project.id },
                                                                { method: "POST" }
                                                            );
                                                        }}
                                                    >
                                                        Confirm Delete
                                                    </button>
                                                    <button
                                                        className="scan-button-dark"
                                                        onClick={() => setConfirmDeleteId(null)}
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    className="scan-button-dark"
                                                    style={{ background: "transparent", borderColor: "#ef4444", color: "#ef4444" }}
                                                    aria-label={`Remove ${project.name}`}
                                                    onClick={() => setConfirmDeleteId(project.id)}
                                                >
                                                    ✖
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <AuditResultsPanel
                                        project={project}
                                        lastScan={lastScan}
                                        isScanning={isLoading}
                                        onScan={handleQuickScan}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Auto-generated llms.txt Blueprint */}
                <div className="section-header" style={{ marginTop: "2.5rem" }}>
                    <h2>Storefront llms.txt Generator</h2>
                </div>
                <div className="premium-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                        <p style={{ color: "#a1a1aa", margin: 0, fontSize: "0.9rem" }}>
                            Auto-built from your live Shopify catalog &amp; pages so AI engines accurately cite your products.
                        </p>
                        {isPro ? (
                            <button className="scan-button-dark" onClick={handleCopyLlms}>
                                {copiedLlms ? "✓ Copied llms.txt" : "Copy llms.txt"}
                            </button>
                        ) : (
                            <Link to="/app/billing" className="scan-button-dark" style={{ textDecoration: "none", borderColor: "#e8822a", color: "#fb923c" }}>
                                Unlock Full Copy on Pro
                            </Link>
                        )}
                    </div>
                    <pre
                        style={{
                            background: "rgba(0,0,0,0.45)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "10px",
                            padding: "1rem",
                            color: "#d4d4d8",
                            fontSize: "0.82rem",
                            overflowX: "auto",
                            whiteSpace: "pre-wrap",
                            margin: 0,
                        }}
                    >
                        {isPro
                            ? llmsPreview
                            : `${llmsPreview.split("\n").slice(0, 8).join("\n")}\n\n... [Upgrade to Pro to export full catalog llms.txt & track competitors]`}
                    </pre>
                </div>
            </div>
        </div>
    );
}
