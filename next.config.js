/** @type {import('next').NextConfig} */
const nextConfig = {
  // 图片域名配置
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  // 实验性功能
  experimental: {
    // 启用服务器组件
    serverActions: true,
  },
}

module.exports = nextConfig
