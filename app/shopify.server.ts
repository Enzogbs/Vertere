// app/shopify.server.ts
import "@shopify/shopify-app-remix/adapters/node";
import {
  AppDistribution,
  DeliveryMethod,
  shopifyApp,
  LATEST_API_VERSION,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-07";
import { redirect } from "@remix-run/node";
import prisma from "./db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: LATEST_API_VERSION,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: "AppStore",
  restResources,
  hooks: {
    afterAuth: async ({ session, admin }) => {
      shopify.registerWebhooks({ session });

      const existingShop = await prisma.shop.findUnique({ where: { shopUrl: session.shop } });
      if (existingShop?.subscriptionStatus === 'active') {
        return;
      }

      const response = await admin.graphql(
        `#graphql
        mutation AppSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!) {
          appSubscriptionCreate(name: $name, returnUrl: $returnUrl, lineItems: $lineItems, test: true) {
            userErrors { field message }
            appSubscription { id }
            confirmationUrl
          }
        }`,
        {
          variables: {
            name: "Starter Plan",
            returnUrl: `${process.env.SHOPIFY_APP_URL}/auth/callback?shop=${session.shop}`,
            lineItems: [{
              plan: {
                appRecurringPricingDetails: {
                  price: { amount: 9.99, currencyCode: "USD" },
                  interval: "EVERY_30_DAYS",
                },
              },
            }],
          },
        }
      );

      const result = await response.json();
      const confirmationUrl = result.data.appSubscriptionCreate.confirmationUrl;
      const chargeId = result.data.appSubscriptionCreate.appSubscription.id;

      try {
        await prisma.shop.upsert({
          where: { shopUrl: session.shop },
          create: {
            shopUrl: session.shop,
            accessToken: session.accessToken,
            subscriptionChargeId: BigInt(chargeId.split('/').pop()),
            subscriptionStatus: "pending",
          },
          update: {
            accessToken: session.accessToken,
            subscriptionChargeId: BigInt(chargeId.split('/').pop()),
            subscriptionStatus: "pending",
          },
        });
      } catch (error) {
        console.error("Failed to upsert shop in DB:", error);
      }

      throw redirect(confirmationUrl);
    },
  },
  future: { unstable_newEmbeddedAuthStrategy: true },
});

export default shopify;
export const apiVersion = LATEST_API_VERSION;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
