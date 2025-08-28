

// app/services/groq.server.ts
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ATUALIZE A FUNÇÃO PARA ACEITAR OS NOVOS PARÂMETROS
export async function translateSearchWithGroq(
  query: string,
  filters: string | null,
  sorts: string | null
) {
  // Constrói a parte do prompt que inclui os filtros e sorts, se eles existirem
  const storeContext = `
    Filtros disponíveis na loja: ${filters || "não especificado"}.
    Opções de ordenação disponíveis: ${sorts || "não especificado"}.
  `;

  const systemPrompt = `Você é um robô analítico de e-commerce altamente preciso. Sua única função é converter uma string de busca de um usuário em um objeto JSON estruturado, seguindo as regras e filtros fornecidos.

        Pense passo a passo. Siga estas REGRAS com atenção:
        1.  Primeiro, analise a busca e identifique os termos que correspondem EXATAMENTE aos FILTROS DISPONÍVEIS.
        2.  Se um termo corresponder a um filtro (ex: "camiseta" para o filtro "categoria"), você DEVE usar o filtro e NÃO deve adicionar o termo na lista de "atributos". A lista de "atributos" é APENAS para características que NÃO possuem um filtro específico.
        3.  Procure por preços. Termos como "até 500", "abaixo de 1000", "menos de 300" devem preencher o campo 'preco_max'.
        4.  Retorne APENAS o objeto JSON, sem nenhum texto, explicação ou formatação de código.

        ---
        EXEMPLOS PARA APRENDIZADO:

        Busca de Exemplo 1: "tênis de corrida masculino azul tamanho 42"
        Filtros Disponíveis de Exemplo: [{{"nome_filtro": "categoria", "valores_possiveis": "tênis, sapato"}}, {{"nome_filtro": "cor", "valores_possiveis": "azul, preto"}}, {{"nome_filtro": "tamanho", "valores_possiveis": "40, 41, 42"}}, {{"nome_filtro": "genero", "valores_possiveis": "masculino, feminino"}}]
        JSON de Saída Esperado para Exemplo 1:
        {{
          "categoria": "tênis",
          "genero": "masculino",
          "cor": "azul",
          "tamanho": "42",
          "atributos": ["de corrida"]
        }}

        Busca de Exemplo 2: "notebook para trabalho com 16gb de ram por menos de 5000"
        Filtros Disponíveis de Exemplo: [{{"nome_filtro": "categoria", "valores_possiveis": "notebook, celular"}}, {{"nome_filtro": "memoria_ram", "valores_possiveis": "8gb, 16gb, 32gb"}}]
        JSON de Saída Esperado para Exemplo 2:
        {{
          "categoria": "notebook",
          "memoria_ram": "16gb",
          "preco_max": 5000.0,
          "atributos": ["para trabalho"]
        }}
        ---

        AGORA, EXECUTE A TAREFA REAL:
        Filtros e ordenacoes da loja: ${storeContext}

        esse é o atual mapa de categorias que temos disponiveis na shopify: {"categoria": "filter.p.product_type", "cor": "filter.v.option.color",
            "tamanho": "filter.v.option.size", "material": "filter.v.option.material",
            "marca": "filter.p.vendor", "preco_max": "filter.v.price.lte", "preco_min": "filter.v.price.gte"}

            encaixe apenas as especificacoes do cliente que se encixarem nos keys,values dispniveis na shopify,always put a q parameter with the same value of filter.p.product_type
        
        Exemplo de entrada e url gerada : Shirt of Medium size -> /search?q=shirt&filter.v.option.size=Medium

        """`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      model: "llama3-8b-8192",
      temperature: 0.2,
      response_format: { type: "json_object" },
    });
    const result = chatCompletion.choices[0]?.message?.content;
    return result ? JSON.parse(result) : {};
  } catch (error) {
    console.error("Groq API Error:", error);
    return { atributos: query.split(" ") };
  }
}