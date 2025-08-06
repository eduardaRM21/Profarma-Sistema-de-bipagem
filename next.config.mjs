/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Configurações para melhorar o suporte à câmera
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'camera=*, microphone=*, geolocation=*',
          },
        ],
      },
    ]
  },
  // Configurações de segurança para APIs de mídia
  experimental: {
    webVitalsAttribution: ['CLS', 'LCP'],
  },
}

export default nextConfig
