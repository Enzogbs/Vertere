// app/routes/app.tsx

import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      {/* CORRIGIDO: Usando NavMenu como na documentação */}
      <NavMenu>
        <Link to="/app" rel="home">
          Painel Principal
        </Link>
        <Link to="/app/analytics">
          Análise de Buscas
        </Link>
      </NavMenu>
      
      {/* O Outlet renderiza as páginas filhas (Painel ou Análise) */}
      <Outlet />
    </AppProvider>
  );
}

// O resto do arquivo (ErrorBoundary, headers) continua o mesmo
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};