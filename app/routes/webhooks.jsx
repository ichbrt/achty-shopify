import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log(`[Webhook] ${topic} from ${shop}`);

    switch (topic) {
        case "APP_UNINSTALLED":
            // Clean up all shop data and sessions when app is uninstalled
            await prisma.session.deleteMany({ where: { shop } });
            const shopRecord = await prisma.shop.findUnique({
                where: { shopDomain: shop },
            });
            if (shopRecord) {
                // Cascade delete will remove projects, scans, and scan results
                await prisma.shop.delete({ where: { id: shopRecord.id } });
            }
            break;

        case "CUSTOMERS_DATA_REQUEST":
            // We don't store customer-specific data beyond Shopify sessions.
            // Respond with confirmation that no customer data is held.
            console.log(`[Webhook] CUSTOMERS_DATA_REQUEST — no customer PII stored`);
            break;

        case "CUSTOMERS_REDACT":
            // Delete any session data associated with the customer
            if (payload?.customer?.id) {
                await prisma.session.deleteMany({
                    where: {
                        shop,
                        userId: BigInt(payload.customer.id),
                    },
                });
            }
            console.log(`[Webhook] CUSTOMERS_REDACT — session data cleaned for shop ${shop}`);
            break;

        case "SHOP_REDACT":
            // Shop requested full data erasure — delete all PII
            await prisma.session.deleteMany({ where: { shop } });
            const shopToRedact = await prisma.shop.findUnique({
                where: { shopDomain: shop },
            });
            if (shopToRedact) {
                // Anonymize shop PII (email, name) but keep record for audit
                await prisma.shop.update({
                    where: { id: shopToRedact.id },
                    data: {
                        email: null,
                        shopName: "[REDACTED]",
                        accessToken: null,
                    },
                });
            }
            console.log(`[Webhook] SHOP_REDACT — PII removed for ${shop}`);
            break;

        default:
            console.log(`[Webhook] Unhandled topic: ${topic}`);
    }

    return new Response();
};
