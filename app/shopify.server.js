import "@shopify/shopify-app-remix/adapters/node";
import {
    ApiVersion,
    AppDistribution,
    shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { BillingInterval } from "@shopify/shopify-api";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

// Fail loudly if critical env vars are missing in production
if (!process.env.SHOPIFY_API_SECRET) {
    throw new Error("SHOPIFY_API_SECRET environment variable is required");
}
if (!process.env.SHOPIFY_APP_URL) {
    console.warn("⚠ SHOPIFY_APP_URL not set — app will not work correctly in production");
}

// Set to false for production billing (real charges)
export const IS_TEST_BILLING = process.env.BILLING_TEST_MODE === "true";

const shopify = shopifyApp({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    apiVersion: ApiVersion.January26,
    scopes: process.env.SCOPES?.split(",") || ["read_products", "read_content", "read_themes"],
    appUrl: process.env.SHOPIFY_APP_URL || "",
    authPathPrefix: "/auth",
    sessionStorage: new PrismaSessionStorage(prisma),
    distribution: AppDistribution.AppStore,
    billing: {
        "Pro Monthly": {
            amount: 199.90,
            currencyCode: "USD",
            interval: BillingInterval.Every30Days,
            trialDays: 0,
        },
    },
    future: {
        unstable_newEmbeddedAuthStrategy: true,
        removeRest: true,
    },
    ...(process.env.SHOP_CUSTOM_DOMAIN
        ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
        : {}),
});

export default shopify;
export const apiVersion = ApiVersion.January26;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
export const MONTHLY_PLAN = "Pro Monthly";
