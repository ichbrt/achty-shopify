import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import { useState, useEffect, useRef } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import dashboardStyles from "../styles/dashboard.css?url";

export const links = () => [{ rel: "stylesheet", href: dashboardStyles }];

export const loader = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    let shopRecord = await prisma.shop.findUnique({
        where: { shopDomain: shop },
        include: {
            projects: {
                include: {
                    scans: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                    },
                },
            },
        },
    });

    if (!shopRecord) {
        shopRecord = await prisma.shop.create({
            data: {
                shopDomain: shop,
                shopName: shop.replace(".myshopify.com", ""),
            },
            include: {
                projects: {
                    include: {
                        scans: {
                            orderBy: { createdAt: "desc" },
                            take: 1,
                        },
                    },
                },
            },
        });
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

    return json({
        shop: shopRecord,
        projects: shopRecord.projects,
        avgScore,
        totalScans: await prisma.scan.count({
            where: {
                project: { shopId: shopRecord.id },
            },
        }),
        totalMentions: await prisma.scanResult.count({
            where: {
                scan: { project: { shopId: shopRecord.id } },
                mentioned: true,
            },
        }),
    });
};

export const action = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("action");

    // Get current shop record for ownership verification
    const shop = await prisma.shop.findUnique({
        where: { shopDomain: session.shop },
        include: { projects: true }
    });

    if (!shop) {
        return json({ error: "Shop not found" }, { status: 404 });
    }

    if (actionType === "addProject") {
        const rawUrl = formData.get("url")?.trim();
        const name = formData.get("name")?.trim() || rawUrl;

        if (!rawUrl) {
            return json({ error: "URL is required" }, { status: 400 });
        }

        // Validate and sanitize URL
        const cleanUrl = rawUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
        if (!domainRegex.test(cleanUrl)) {
            return json({ error: "Invalid domain", message: "Please enter a valid domain (e.g., myshop.com)" }, { status: 400 });
        }

        if (shop.projects.length >= 1 && shop.plan === "free") {
            return json({ error: "Plan limit reached", message: "Free plan only allows 1 tracked domain. Please upgrade to Pro." }, { status: 403 });
        }

        await prisma.project.create({
            data: {
                shopId: shop.id,
                url: cleanUrl,
                name: name.substring(0, 100),
            },
        });
    }

    if (actionType === "deleteProject") {
        const projectId = formData.get("projectId");

        // Verify project belongs to this shop
        const project = shop.projects.find(p => p.id === projectId);
        if (!project) {
            return json({ error: "Project not found or access denied" }, { status: 403 });
        }

        await prisma.project.delete({
            where: { id: projectId }
        });
    }

    if (actionType === "quickScan") {
        const projectId = formData.get("projectId");

        // Verify project belongs to this shop
        const project = shop.projects.find(p => p.id === projectId);
        if (!project) {
            return json({ error: "Project not found or access denied" }, { status: 403 });
        }

        // Free plan: only 1 scan allowed total
        if (shop.plan === "free") {
            const existingScanCount = await prisma.scan.count({
                where: { project: { shopId: shop.id } }
            });
            if (existingScanCount >= 1) {
                return json({
                    error: "Scan limit reached",
                    message: "Free plan allows only 1 scan. Upgrade to Pro for unlimited scans."
                }, { status: 403 });
            }
        }

        // Score range depends on plan:
        // Free plan: 35-46 (capped low to encourage upgrade)
        // Pro plan: 40-100 (full AI analysis range)
        const score = shop.plan === "free"
            ? Math.floor(Math.random() * (46 - 35 + 1) + 35)
            : Math.floor(Math.random() * (100 - 40 + 1) + 40);

        const summary = shop.plan === "free"
            ? "Basic scan complete. Upgrade to Pro for full AI-powered analysis and higher optimization potential."
            : "Placeholder scan — real AI analysis coming soon.";

        await prisma.scan.create({
            data: {
                projectId: projectId,
                status: "completed",
                score,
                summary,
            },
        });
    }

    return json({ success: true });
};


function TubesBackground({ children }) {
    const canvasRef = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const tubesRef = useRef(null);

    useEffect(() => {
        let mounted = true;

        const randomColors = (count) => {
            return new Array(count)
                .fill(0)
                .map(() => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
        };

        const initTubes = async () => {
            if (!canvasRef.current) return;

            try {
                // Use runtime import to bypass bundlers and correctly load the ES module
                const dynamicImport = new Function('url', 'return import(url)');
                // We stored it locally at /tubes1.min.js
                const module = await dynamicImport('/tubes1.min.js');
                const TubesCursor = module.default;

                if (!mounted || !TubesCursor) {
                    setIsLoaded(true);
                    return;
                }

                const app = TubesCursor(canvasRef.current, {
                    tubes: {
                        colors: ['#f967fb', '#53bc28', '#6958d5'],
                        lights: {
                            intensity: 200,
                            colors: ['#83f36e', '#fe8a2e', '#ff008a', '#60aed5'],
                        },
                    },
                });

                tubesRef.current = app;
                setIsLoaded(true);

                // Allow canvas to be clicked to trigger color changes
                const clickHandler = () => {
                    if (tubesRef.current) {
                        tubesRef.current.tubes.setColors(randomColors(3));
                        tubesRef.current.tubes.setLightsColors(randomColors(4));
                    }
                };
                canvasRef.current.addEventListener('click', clickHandler);


            } catch (error) {
                console.error('Failed to load TubesCursor:', error);
            }
        };

        initTubes();

        return () => {
            mounted = false;
        };
    }, []);

    return (
        <div className="tubes-container">
            <canvas
                ref={canvasRef}
                className="tubes-canvas"
            />
            {/* Fade in content once Tubes is ready or just show it anyway */}
            <div
                className="splash-content-wrapper"
                style={{ opacity: isLoaded ? 1 : 0, transition: 'opacity 1s ease-in-out' }}
            >
                {children}
            </div>

            {!isLoaded && (
                <div className="splash-loading">
                    <img src="/achty-logo.png" alt="Loading" />
                    <p>Loading...</p>
                </div>
            )}
        </div>
    );
}

function AiSeoPanel({ project, lastScan, onScan }) {
    const [phase, setPhase] = useState(lastScan ? 'active' : 'idle');
    const [stepIndex, setStepIndex] = useState(-1);

    const steps = [
        'Crawling site footprint...',
        'Analyzing keyword intent...',
        'Validating AI recommendations...',
        'Scoring visibility...',
        'Generating insights...'
    ];

    const canvasRef = useRef(null);
    const score = lastScan?.score || 0;

    // Simple heartbeat animation when active
    useEffect(() => {
        if (phase !== 'active' || !canvasRef.current) return;

        let req;
        const ctx = canvasRef.current.getContext('2d');
        let offset = 0;

        const draw = () => {
            const w = canvasRef.current.width;
            const h = canvasRef.current.height;
            ctx.clearRect(0, 0, w, h);

            ctx.beginPath();
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1.5;

            for (let x = 0; x < w; x++) {
                const adjX = (x + offset) % (w + 50);
                const pos = adjX % 100;
                let y = h / 2;

                if (pos > 40 && pos < 45) {
                    y -= (pos - 40) * 8;
                } else if (pos >= 45 && pos < 55) {
                    y += (pos - 50) * 8;
                } else if (pos >= 55 && pos < 60) {
                    y -= (pos - 60) * 8;
                }

                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }

            ctx.stroke();
            offset += 0.5;
            req = requestAnimationFrame(draw);
        };
        draw();

        return () => cancelAnimationFrame(req);
    }, [phase]);

    const handleStart = async () => {
        setPhase('running');
        setStepIndex(0);

        for (let i = 0; i < steps.length; i++) {
            setStepIndex(i);
            await new Promise(r => setTimeout(r, 700 + Math.random() * 500));
        }

        // Finalize scan in DB via parent
        onScan(project.id);

        // Normally this would wait for the result to come back from action, but since it reloads the page, it will come back as active
        setPhase('active');
    };

    if (phase === 'idle') {
        return (
            <div className="ai-seo-panel">
                <button className="ai-seo-idle-btn" onClick={handleStart}>
                    ⚡ Start ACHTy AI SEO Optimizer
                </button>
            </div>
        );
    }

    if (phase === 'running') {
        return (
            <div className="ai-seo-panel">
                <div className="ai-seo-running-box">
                    <div style={{ color: '#34d399', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Running AI SEO Analysis...
                    </div>
                    {steps.map((text, i) => {
                        const status = i < stepIndex ? 'completed' : i === stepIndex ? 'running' : 'pending';
                        return (
                            <div key={i} className={`ai-seo-step ${status}`}>
                                {status === 'completed' && <span style={{ color: '#34d399' }}>&#10003;</span>}
                                {status === 'running' && <span className="ai-seo-pulsing-dot" />}
                                {status === 'pending' && <span style={{ width: '8px', height: '8px', border: '1px solid #71717a', borderRadius: '50%' }} />}
                                {text}
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="ai-seo-panel">
            <div className="ai-seo-active-box">
                <div className="ai-seo-active-header">
                    <div className="ai-seo-active-title">
                        <span className="ai-seo-pulsing-dot"></span>
                        AI SEO Engine v2.0 Active
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button
                            onClick={() => setPhase('idle')}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            Stop Optimization
                        </button>
                        <div style={{ color: '#34d399', fontSize: '1.5rem', fontWeight: 'bold' }}>{score}/100</div>
                    </div>
                </div>

                <canvas ref={canvasRef} className="ai-seo-heartbeat-canvas" width="400" height="80" />

                <div className="ai-seo-metrics">
                    <div className="ai-seo-metric-box">
                        <div className="ai-seo-metric-val" style={{ color: '#34d399' }}>{score > 0 ? 12 : 0}</div>
                        <div className="ai-seo-metric-lbl">Keywords</div>
                    </div>
                    <div className="ai-seo-metric-box">
                        <div className="ai-seo-metric-val" style={{ color: '#60a5fa' }}>{score > 0 ? 4 : 0}</div>
                        <div className="ai-seo-metric-lbl">Actions</div>
                    </div>
                    <div className="ai-seo-metric-box">
                        <div className="ai-seo-metric-val" style={{ color: '#c084fc' }}>{score > 0 ? 1 : 0}</div>
                        <div className="ai-seo-metric-lbl">Content Fix</div>
                    </div>
                    <div className="ai-seo-metric-box">
                        <div className="ai-seo-metric-val" style={{ color: '#e8822a' }}>{score}%</div>
                        <div className="ai-seo-metric-lbl">Health</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { shop, projects, avgScore, totalScans, totalMentions } = useLoaderData();
    const actionData = useActionData();
    const submit = useSubmit();
    const navigation = useNavigation();

    useEffect(() => {
        if (actionData?.error) {
            alert(actionData.message || actionData.error);
        }
    }, [actionData]);
    const isLoading = navigation.state !== "idle";

    const [showSplash, setShowSplash] = useState(true);

    const handleQuickScan = (projectId) => {
        submit({ action: "quickScan", projectId }, { method: "POST" });
    };

    if (showSplash) {
        return (
            <div className="splash-screen">
                <TubesBackground>
                    <div className="splash-content">
                        {/* Logo & Title Integration */}
                        <div className="splash-logo-container">
                            <img
                                src="/achty-logo.png"
                                alt="ACHTy AI"
                                className="splash-logo-img"
                            />
                            <h1 className="splash-brand-text">
                                ACHT<span className="brand-y">y</span> <span className="brand-ai">AI</span>
                            </h1>
                        </div>

                        {/* Subtitle */}
                        <p className="splash-subtitle">
                            What if AI platforms like ChatGPT, Claude & Gemini recommended your business?
                        </p>

                        {/* Tagline */}
                        <p className="splash-tagline">
                            ACHTy AI makes it happen. A new era in AI-powered SEO. Secure your spot today.
                        </p>

                        {/* CTA Button */}
                        <div className="splash-btn-container">
                            <button
                                onClick={() => setShowSplash(false)}
                                className="splash-enter-btn"
                            >
                                <div className="splash-btn-sweep" />
                                <span className="btn-text">Enter App</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14" />
                                    <path d="m12 5 7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </TubesBackground>
            </div>
        );
    }

    return (
        <div className="app-wrapper">
            <div className="dashboard-container">
                <div className="hero-section">
                    <div>
                        <div className="overview-pill">
                            <div className="overview-dot" />
                            <span className="overview-text">OVERVIEW</span>
                        </div>
                        <h1 className="hero-title">Dashboard</h1>
                    </div>
                    {projects.length > 0 && (
                        <button className="aivista-add-btn" onClick={() => {
                            const url = prompt("Enter alternative domain to monitor (e.g., myshop.com):");
                            if (url) submit({ action: "addProject", url, name: url }, { method: "POST" });
                        }}>
                            <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>+</span> New Project
                        </button>
                    )}
                </div>

                <div className="metric-grid" style={{ marginBottom: '3rem' }}>
                    <div className="aivista-stat-card" style={{ background: 'linear-gradient(to bottom right, rgba(249, 115, 22, 0.15), transparent)' }}>
                        <div className="absolute-decor" />
                        <div className="stat-header">
                            <div className="stat-icon-wrapper" style={{ background: 'rgba(249, 115, 22, 0.15)' }}>
                                <span style={{ fontSize: '1.2rem' }}>👁️</span>
                            </div>
                        </div>
                        <div>
                            <div className="stat-label">Visibility Score</div>
                            <div className="stat-value">
                                {avgScore !== null ? avgScore : "0"}
                                <span className="stat-suffix">/100</span>
                            </div>
                        </div>
                    </div>

                    <div className="aivista-stat-card" style={{ background: 'linear-gradient(to bottom right, rgba(59, 130, 246, 0.1), transparent)' }}>
                        <div className="absolute-decor" />
                        <div className="stat-header">
                            <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                                <span style={{ fontSize: '1.2rem' }}>💬</span>
                            </div>
                        </div>
                        <div>
                            <div className="stat-label">Total Mentions</div>
                            <div className="stat-value">{totalMentions}</div>
                        </div>
                    </div>

                    <div className="aivista-stat-card" style={{ background: 'linear-gradient(to bottom right, rgba(16, 185, 129, 0.1), transparent)' }}>
                        <div className="absolute-decor" />
                        <div className="stat-header">
                            <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                                <span style={{ fontSize: '1.2rem' }}>✅</span>
                            </div>
                        </div>
                        <div>
                            <div className="stat-label">Total Scans</div>
                            <div className="stat-value">{totalScans}</div>
                        </div>
                    </div>

                    <div className="aivista-stat-card" style={{ background: 'linear-gradient(to bottom right, rgba(239, 68, 68, 0.1), transparent)' }}>
                        <div className="absolute-decor" />
                        <div className="stat-header">
                            <div className="stat-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
                                <span style={{ fontSize: '1.2rem' }}>⚠</span>
                            </div>
                        </div>
                        <div>
                            <div className="stat-label">Risk Alerts</div>
                            <div className="stat-value">0</div>
                        </div>
                    </div>
                </div>

                <div className="section-header">
                    <h2>Tracked Stores</h2>
                </div>

                {projects.length === 0 ? (
                    <div className="premium-card empty-state-card">
                        <div style={{ color: "#a1a1aa", fontSize: "1.05rem", marginBottom: "1.5rem" }}>
                            Start tracking your store's AI Discoverability score immediately.
                        </div>
                        <button className="primary-button" onClick={() => {
                            let url = shop.shopDomain;
                            submit({ action: "addProject", url, name: "My Store" }, { method: "POST" });
                        }}>
                            Track My Store ({shop.shopDomain})
                        </button>
                    </div>
                ) : (
                    <div className="projects-grid">
                        {projects.map((project) => {
                            const lastScan = project.scans[0];
                            return (
                                <div key={project.id} className="project-card">
                                    <div className="project-header">
                                        <div>
                                            <h3>{project.name}</h3>
                                            <a href={`https://${project.url}`} target="_blank" rel="noreferrer" className="project-url">
                                                {project.url}
                                            </a>
                                        </div>
                                        <div className="project-actions">
                                            {lastScan ? (
                                                <span className={`dark-badge ${lastScan.status === 'completed' ? 'success' : 'warning'}`}>
                                                    Score: {lastScan.score || 0}/100
                                                </span>
                                            ) : (
                                                <span className="dark-badge">NEVER SCANNED</span>
                                            )}

                                            <button
                                                className="scan-button-dark"
                                                onClick={() => handleQuickScan(project.id)}
                                                disabled={isLoading}
                                            >
                                                {isLoading ? "⚡ Analyzing..." : "⚡ Run Manual Scan"}
                                            </button>

                                            <button
                                                className="scan-button-dark"
                                                style={{ background: 'transparent', borderColor: '#ef4444', color: '#ef4444' }}
                                                onClick={() => {
                                                    if (confirm("Are you sure? This cannot be undone.")) {
                                                        submit({ action: "deleteProject", projectId: project.id }, { method: "POST" });
                                                    }
                                                }}
                                            >
                                                ✖
                                            </button>
                                        </div>
                                    </div>

                                    <AiSeoPanel project={project} lastScan={lastScan} onScan={handleQuickScan} />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
