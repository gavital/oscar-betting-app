import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Libera o host do CDN do TMDB para o componente next/image
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**', // cobre tamanhos (w185, w500 etc.) e caminhos de imagens
      },
    ],
    // Se desejar desabilitar a otimização (não recomendado), você pode usar:
    // unoptimized: true,
  },
};

export default nextConfig;