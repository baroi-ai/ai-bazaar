/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Add this line to allow your mobile device to access the dev server
  allowedDevOrigins: ['127.0.0.1', 'https://api.aibazaars.store'],
  
  // (Keep your existing image configs if you have them)
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8090',
        pathname: '/api/files/**',
      },
      // Add other remote patterns if you use them
    ],
  },
  
};

export default nextConfig;