// app/routes/api.validate-key.ts
import { json, type ActionFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";

// Esta action apenas verifica se a API Key existe
export const action = async ({ request }: ActionFunctionArgs) => {
  // Apenas permitimos o método POST
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { apiKey } = await request.json();
    if (!apiKey) {
      return json({ error: "API Key is missing" }, { status: 400 });
    }

    // Usamos 'count' que é mais eficiente que 'findUnique' para apenas verificar a existência.
    const count = await prisma.shop.count({
      where: { apiKey: apiKey },
    });

    // Se encontramos 1 loja com essa chave, ela é válida.
    return json({ isValid: count > 0 });

  } catch (error) {
    console.error("Error validating API key:", error);
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
};