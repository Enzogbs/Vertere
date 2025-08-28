// app/routes/app.analytics.tsx
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, BlockStack, Text, IndexTable, Box } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { Prisma } from "@prisma/client";

// Carrega os logs do banco de dados
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const searchLogs = await prisma.searchLog.findMany({
    where: { shop: { shopUrl: session.shop } },
    orderBy: { createdAt: "desc" },
    take: 50, // Pega os últimos 50 logs
  });
  return json({ searchLogs });
};

export default function AnalyticsPage() {
  const { searchLogs } = useLoaderData<typeof loader>();

  return (
    <Page title="Análise de Buscas">
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">Últimas Buscas Realizadas na Loja</Text>
          <IndexTable
            itemCount={searchLogs.length}
            headings={[
              { title: "Data" },
              { title: "Busca do Cliente" },
              { title: "JSON Gerado pela IA" },
            ]}
            selectable={false}
          >
            {searchLogs.map((log, index) => (
              <IndexTable.Row id={String(log.id)} key={log.id} position={index}>
                <IndexTable.Cell>{new Date(log.createdAt).toLocaleString()}</IndexTable.Cell>
                <IndexTable.Cell>{log.originalQuery}</IndexTable.Cell>
                <IndexTable.Cell>
                  <Box as="pre" background="bg-subdued" padding="200" borderRadius="100" style={{whiteSpace: 'pre-wrap'}}>
                    {log.returnedJson}
                  </Box>
                </IndexTable.Cell>
              </IndexTable.Row>
            ))}
          </IndexTable>
        </BlockStack>
      </Card>
    </Page>
  );
}