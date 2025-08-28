// app/routes/api.translate.ts
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { DateTime } from "luxon";
import prisma from "../db.server";
import { translateSearchWithGroq } from "../services/groq.server";

// Função auxiliar para CORS (headers)
function addCorsHeaders(response: Response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, X-API-Key");
  return response;
}

// O loader lida com a requisição de verificação OPTIONS do CORS
export const loader = async () => {
  return addCorsHeaders(new Response(null, { status: 204 }));
};

// A action lida com a requisição principal POST
export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("\n\n--- [API ACTION START] ---");

  if (request.method !== "POST") {
    console.log("[API] Rejeitado: Método não é POST.");
    return addCorsHeaders(json({ error: "Method not allowed" }, { status: 405 }));
  }

  const apiKey = request.headers.get("X-API-Key");
  if (!apiKey) {
    console.log("[API] Rejeitado: Chave de API não fornecida.");
    return addCorsHeaders(json({ error: "API Key not provided" }, { status: 403 }));
  }
  console.log(`[API] Chave de API recebida: ${apiKey}`);

  let shop = await prisma.shop.findUnique({ where: { apiKey } });
  if (!shop) {
    console.log("[API] Rejeitado: Chave de API inválida.");
    return addCorsHeaders(json({ error: "Invalid API Key" }, { status: 403 }));
  }
  console.log(`[API] Loja encontrada: ${shop.shopUrl}`);

  // (Lógica de assinatura e limite de uso omitida por enquanto para simplificar o teste)

  // Incremento do Uso
  console.log(`[API] PRE-INCREMENT: Uso atual é ${shop.currentUsage}`);
  try {
    const updatedShop = await prisma.shop.update({
      where: { id: shop.id },
      data: { currentUsage: { increment: 1 } },
    });
    console.log(`[API] POST-INCREMENT: Novo uso é ${updatedShop.currentUsage}`);
  } catch (error) {
    console.error("[API] ERRO AO INCREMENTAR USO:", error);
  }
  
  // Chamada da IA
  const { query } = await request.json();
  console.log(`[API] Chamando Groq com a query: "${query}"`);
  const translatedJson = await translateSearchWithGroq(query, shop.filters, shop.sorts);
  console.log("[API] Resposta recebida da Groq:", translatedJson);

  // Criação do Log de Busca
  console.log("[API] PRE-CREATE-LOG: Tentando salvar o log no banco de dados...");
  try {
    const newLog = await prisma.searchLog.create({
      data: {
        shopId: shop.id,
        originalQuery: query,
        returnedJson: JSON.stringify(translatedJson, null, 2),
      },
    });
    console.log(`[API] POST-CREATE-LOG: SUCESSO! Log salvo com ID: ${newLog.id}`);
  } catch (error) {
    console.error("[API] POST-CREATE-LOG: FALHA! Erro ao salvar o log:", error);
  }

  console.log("[API] Preparando resposta final...");
  const response = json(translatedJson);
  console.log("--- [API ACTION END] ---");
  return addCorsHeaders(response);
}; 