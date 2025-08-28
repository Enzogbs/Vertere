// ==========================================================
// VERTERE AI SEARCH SNIPPET - VERSÃO DE DEBUG COM LOGGING
// ==========================================================
(function() {
    console.log("Vertere AI Search: Script iniciado.");

    function findSearchForm() {
        console.log("Vertere AI Search: Procurando formulário de busca...");
        const selectors = ['form[action*="/search"]', 'form[role="search"]'];
        for (const selector of selectors) {
            const form = document.querySelector(selector);
            if (form && form.querySelector('input[name="q"]')) {
                console.log("Vertere AI Search: Formulário encontrado!", form);
                return form;
            }
        }
        console.error("Vertere AI Search: NENHUM formulário de busca compatível foi encontrado. Script encerrado.");
        return null;
    }

    const searchForm = findSearchForm();
    if (!searchForm) { return; }

    console.log("Vertere AI Search: Lendo configurações (API Key e URL)...");
    const scriptTag = document.querySelector('script[src*="vertere-snippet.js"]');
    const apiKey = scriptTag ? scriptTag.dataset.apiKey : null;
    const apiUrl = scriptTag ? scriptTag.dataset.apiUrl : null;

    if (!apiKey || !apiUrl) {
        console.error("Vertere AI Search: API Key ou URL da API não encontradas no script tag. Verifique o bloco Liquid.", { apiKey, apiUrl });
        return;
    }
    console.log("Vertere AI Search: Configurações lidas com sucesso:", { apiKey, apiUrl });

    console.log("Vertere AI Search: Adicionando 'espião' (event listener) ao formulário.");
    searchForm.addEventListener('submit', async (event) => {
        console.log("%c--- Vertere AI Search: Busca interceptada! ---", "color: blue; font-weight: bold;");
        event.preventDefault(); 
        
        const searchInput = searchForm.querySelector('input[name="q"]');
        const userQuery = searchInput.value;
        console.log("Query do usuário:", userQuery);

        if (!userQuery.trim()) {
            console.log("Vertere AI Search: Query vazia. Executando busca padrão.");
            searchForm.submit();
            return;
        }

        try {
            console.log("Iniciando chamada para a API em:", apiUrl);
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey
                },
                body: JSON.stringify({ query: userQuery })
            });
            console.log("Resposta da API recebida:", response);

            if (!response.ok) {
                throw new Error('A resposta da API falhou com o status: ' + response.status);
            }

            console.log("Resposta da API foi OK (status 2xx). Processando JSON...");
            const data = await response.json();
            console.log("JSON recebido da IA:", data);
            
            const finalUrl = buildShopifySearchURL(data);
            console.log("URL final construída:", finalUrl);
            
            console.log("Redirecionando agora...");
            window.location.href = finalUrl;

        } catch (error) {
            console.error("%c--- Vertere AI Search: ERRO! Revertendo para a busca padrão. ---", "color: red; font-weight: bold;");
            console.error("Detalhe do erro:", error);
            searchForm.submit(); 
        }
    });

    function buildShopifySearchURL(jsonData) {
        const baseUrl = '/search';
        const params = new URLSearchParams();

        const shopifyMapping = {
            "categoria": "filter.p.product_type",
            "cor": "filter.v.option.color",
            "tamanho": "filter.v.option.size",
            "material": "filter.v.option.material",
            "marca": "filter.p.vendor",
            "preco_max": "filter.p.price.max",
            "preco_min": "filter.p.price.min"
        };

        // NOVO: Mapeamento dos valores de ordenação da IA para os valores da Shopify
        const sortMapping = {
            'preço_crescente': 'price-ascending',
            'preço_decrescente': 'price-descending',
            'mais_vendidos': 'best-selling',
            'mais_recentes': 'created-descending'
        };

        let queryTerms = jsonData.atributos || [];

        for (const key in jsonData) {
            const shopifyParam = shopifyMapping[key];
            if (shopifyParam && jsonData[key]) {
                params.set(shopifyParam, jsonData[key]);
            } 
            // NOVO: Lógica para tratar a ordenação
            else if (key === 'ordenacao' && jsonData[key]) {
                const sortByValue = sortMapping[jsonData[key]];
                if (sortByValue) {
                    params.set('sort_by', sortByValue);
                }
            } 
            else if (key !== 'atributos' && jsonData[key]) {
                if (typeof jsonData[key] === 'string') {
                    queryTerms.push(jsonData[key]);
                }
            }
        }

        params.set('q', [...new Set(queryTerms)].join(' '));
        // Garante que o tipo de busca seja por produto
        params.set('type', 'product'); 
        
        return `${baseUrl}?${params.toString()}`;
    }
})();