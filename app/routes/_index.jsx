import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { login } from "../shopify.server";

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
        <div style={{ padding: "2rem", fontFamily: "Inter, sans-serif" }}>
            <h1>ACHTy AI - AI Recommends You</h1>
            <p>AI Visibility Scanner for Shopify Stores</p>
            {showForm && (
                <Form method="post" action="/auth/login">
                    <label>
                        <span>Shop domain</span>
                        <input type="text" name="shop" placeholder="your-shop.myshopify.com" />
                    </label>
                    <button type="submit">Log in</button>
                </Form>
            )}
        </div>
    );
}
