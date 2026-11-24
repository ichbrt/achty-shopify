import { useState } from "react";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import {
    AppProvider as PolarisAppProvider,
    Button,
    Card,
    FormLayout,
    Page,
    Text,
    TextField,
} from "@shopify/polaris";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import enTranslations from "@shopify/polaris/locales/en.json";
import { login } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
    const errors = loginErrorMessage(await login(request));
    return json({ errors, polarisTranslations: enTranslations });
};

export const action = async ({ request }) => {
    const errors = loginErrorMessage(await login(request));
    return json({ errors });
};

function loginErrorMessage(loginErrors) {
    if (loginErrors?.shop === "MISSING_SHOP") {
        return { shop: "Please enter your shop domain to log in." };
    }
    if (loginErrors?.shop === "INVALID_SHOP") {
        return { shop: "Please enter a valid Shopify store domain (e.g., my-store.myshopify.com)." };
    }
    return {};
}

export default function AuthLogin() {
    const loaderData = useLoaderData();
    const actionData = useActionData();
    const [shop, setShop] = useState("");
    const errors = actionData?.errors || loaderData?.errors || {};

    return (
        <PolarisAppProvider i18n={loaderData.polarisTranslations}>
            <Page narrowWidth>
                <Card>
                    <Form method="post">
                        <FormLayout>
                            <Text variant="headingMd" as="h2">
                                Log in to ACHTy AI
                            </Text>
                            <TextField
                                type="text"
                                name="shop"
                                label="Shop domain"
                                helpText="example.myshopify.com"
                                value={shop}
                                onChange={setShop}
                                autoComplete="on"
                                error={errors.shop}
                            />
                            <Button submit variant="primary">
                                Log in
                            </Button>
                        </FormLayout>
                    </Form>
                </Card>
            </Page>
        </PolarisAppProvider>
    );
}
