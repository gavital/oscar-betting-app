// src/config/rss-feeds.ts
export type RssFeedConfig = {
    categoryId: string;
    urls: string[];
    // filtros simples para extrair nomes; podem ser regex/keywords
    keywords?: string[];
  };
  
  export const RSS_FEEDS: RssFeedConfig[] = [
    {
      categoryId: 'cat_melhor_filme', // substitua pelos IDs reais
      urls: [
        'https://www.omelete.com.br/rss', 
        'https://www.adorocinema.com/rss/noticias.xml'
      ],
      keywords: ['Oscar', 'Indicados', 'Melhor Filme']
    },
    // outras categorias...
  ];