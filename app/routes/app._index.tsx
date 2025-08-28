// app/routes/app._index.tsx
import { useState, useEffect } from "react";
import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useRevalidator, Form, useNavigation, useActionData } from "@remix-run/react";
import { Page, BlockStack, Card, Text, TextField, Button, Icon, Box, InlineStack, Banner } from "@shopify/polaris";
import { ViewIcon, HideIcon, DuplicateIcon } from '@shopify/polaris-icons';
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// LOADER FINAL E COMPLETO
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  if (!session) {
    console.warn("Sessão não encontrada, redirecionando para login.");
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    return redirect(`/auth?shop=${shop}`);
  }

  const shopUrl = session.shop;
  const shopData = await prisma.shop.findUnique({
    where: { shopUrl: shopUrl },
  });

  if (!shopData) {
    console.error(`Loja ${shopUrl} não encontrada no DB. Reinstalação necessária.`);
    return json({ shop: null, error: "Shop not found. Please reinstall.", lastUpdated: new Date().toISOString() });
  }
  
  const safeShopData = {
    shopUrl: shopData.shopUrl, apiKey: shopData.apiKey, subscriptionStatus: shopData.subscriptionStatus,
    currentUsage: shopData.currentUsage, usageLimit: shopData.usageLimit,
    filters: shopData.filters, sorts: shopData.sorts,
  };
  
  // Get search log counts for the last 30 days
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 29); // 30 days including today
  startDate.setHours(0, 0, 0, 0);

  // Get all logs for the last 30 days
  const rawLogs = await prisma.searchLog.findMany({
    where: {
      shop: { shopUrl: shopUrl },
      createdAt: { gte: startDate },
    },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  });

  // Aggregate by day
  const countsByDay = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    countsByDay[key] = 0;
  }
  rawLogs.forEach(log => {
    const key = log.createdAt.toISOString().slice(0, 10);
    if (countsByDay[key] !== undefined) countsByDay[key]++;
  });
  const searchLogChartData = Object.entries(countsByDay).map(([date, count]) => ({ date, count }));

  // Top search terms (last 30 days)
  const topSearchesRaw = await prisma.searchLog.groupBy({
    by: ['originalQuery'],
    where: {
      shop: { shopUrl: shopUrl },
      createdAt: { gte: startDate },
    },
    _count: { originalQuery: true },
    orderBy: { _count: { originalQuery: 'desc' } },
    take: 10,
  });
  const topSearches = topSearchesRaw.map(item => ({
    query: item.originalQuery,
    count: item._count.originalQuery,
  }));

  // Top filters and sorts (last 30 days)
  const logsForFilters = await prisma.searchLog.findMany({
    where: {
      shop: { shopUrl: shopUrl },
      createdAt: { gte: startDate },
    },
    select: { returnedJson: true },
  });
  const filterCounts = {};
  const sortCounts = {};
  logsForFilters.forEach(log => {
    try {
      const data = JSON.parse(log.returnedJson);
      // Count filters
      if (data.filters && Array.isArray(data.filters)) {
        data.filters.forEach(filter => {
          filterCounts[filter] = (filterCounts[filter] || 0) + 1;
        });
      }
      // Count sorts
      if (data.sorts) {
        sortCounts[data.sorts] = (sortCounts[data.sorts] || 0) + 1;
      }
    } catch (e) {
      // ignore parse errors
    }
  });
  const topFilters = Object.entries(filterCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([filter, count]) => ({ filter, count }));
  const topSorts = Object.entries(sortCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([sort, count]) => ({ sort, count }));

  return json({ shop: safeShopData, error: null, lastUpdated: new Date().toISOString(), searchLogChartData, topSearches, topFilters, topSorts });
};

// ACTION FINAL E COMPLETA
export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    if (!session) {
        return json({ error: "Not authenticated" }, { status: 401 });
    }
    const formData = await request.formData();
    
    const filters = formData.get("filters") as string;
    const sorts = formData.get("sorts") as string;

    await prisma.shop.update({
        where: { shopUrl: session.shop },
        data: { filters, sorts },
    });

    return json({ success: true });
};


export default function Dashboard() {
  const { shop, error, lastUpdated, searchLogChartData, topSearches, topFilters, topSorts } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();
  
  const isSaving = navigation.state === 'submitting' && navigation.formData?.has('filters');
  const isRefreshing = navigation.state === "loading" && navigation.formData == null;

  const [filtersValue, setFiltersValue] = useState(shop?.filters || '');
  const [sortsValue, setSortsValue] = useState(shop?.sorts || '');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  
  useEffect(() => {
    if (actionData?.success) {
      setShowSaveSuccess(true);
      const timer = setTimeout(() => setShowSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [actionData]);

  if (error || !shop) {
    return (
      <Page>
        <Card>
          <Banner title="Erro ao Carregar Dados" tone="critical">
            <p>Não conseguimos encontrar os dados da sua loja em nosso banco de dados. A solução é reinstalar o aplicativo para sincronizar os dados novamente.</p>
          </Banner>
        </Card>
      </Page>
    );
  }

  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const usagePercentage = (shop.currentUsage / shop.usageLimit) * 100;

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') revalidator.revalidate();
    }, 10000);
    return () => clearInterval(interval);
  }, [revalidator]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shop.apiKey).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  // Prepare chart data
  const chartData = {
    labels: searchLogChartData.map((d) => d.date),
    datasets: [
      {
        label: 'Buscas por dia',
        data: searchLogChartData.map((d) => d.count),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.2,
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Buscas nos últimos 30 dias' },
    },
    scales: {
      x: { title: { display: true, text: 'Data' } },
      y: { title: { display: true, text: 'Buscas' }, beginAtZero: true, precision: 0 },
    },
  };

  return (
    <Page>
      {showSaveSuccess && <Banner title="Configurações salvas com sucesso!" tone="success" onDismiss={() => setShowSaveSuccess(false)} />}
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Chave de API</Text>
            <InlineStack align="start" gap="200" blockAlign="center">
              <div style={{ flexGrow: 1 }}><TextField label="Sua chave de API" labelHidden value={shop.apiKey} type={apiKeyVisible ? "text" : "password"} disabled autoComplete="off" /></div>
              <Button onClick={() => setApiKeyVisible(!apiKeyVisible)}><Icon source={apiKeyVisible ? HideIcon : ViewIcon} /></Button>
              <Button onClick={handleCopy}><Icon source={DuplicateIcon} /></Button>
            </InlineStack>
            {copySuccess && <Text as="p" tone="success">Copiado!</Text>}
          </BlockStack>
        </Card>
        
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingMd">Uso da Busca Inteligente</Text>
              <Button onClick={() => revalidator.revalidate()} loading={isRefreshing}>Atualizar</Button>
            </InlineStack>
            <Text as="p">Você usou {shop.currentUsage} de {shop.usageLimit} buscas este mês.</Text>
            <div style={{width: '100%', backgroundColor: '#dfe3e8', borderRadius: '4px', height: '10px'}}><div style={{width: `${usagePercentage}%`, backgroundColor: '#008060', borderRadius: '4px', height: '10px'}} /></div>
            <Text as="p" tone="subdued" alignment="end" variant="bodySm">Última atualização: {new Date(lastUpdated).toLocaleTimeString()}</Text>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Buscas por Dia (últimos 30 dias)</Text>
            <div style={{ width: '100%', minHeight: 300 }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Top Search Terms (30 days)</Text>
            <ul>
              {topSearches.map((item, idx) => (
                <li key={idx}>
                  <strong>{item.query}</strong>: {item.count}
                </li>
              ))}
            </ul>
          </BlockStack>
        </Card>
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Top Filters (30 days)</Text>
            <ul>
              {topFilters.map((item, idx) => (
                <li key={idx}>
                  <strong>{item.filter}</strong>: {item.count}
                </li>
              ))}
            </ul>
          </BlockStack>
        </Card>
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Top Sorts (30 days)</Text>
            <ul>
              {topSorts.map((item, idx) => (
                <li key={idx}>
                  <strong>{item.sort}</strong>: {item.count}
                </li>
              ))}
            </ul>
          </BlockStack>
        </Card>

        <Card>
          <Form method="post">
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Configuração da Loja</Text>
              <Text as="p">Informe os filtros e opções de ordenação disponíveis na sua loja. Separe-os por vírgula.</Text>
              <TextField label="Filtros Disponíveis" name="filters" value={filtersValue} onChange={setFiltersValue} autoComplete="off" />
              <TextField label="Ordenações Disponíveis" name="sorts" value={sortsValue} onChange={setSortsValue} autoComplete="off" />
              <Box paddingBlockStart="200">
                <Button submit variant="primary" loading={isSaving} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar Configurações'}</Button>
              </Box>
            </BlockStack>
          </Form>
        </Card>
      </BlockStack>
    </Page>
  );
}