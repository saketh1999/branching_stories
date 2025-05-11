/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      // Allow Vercel Blob storage domains
      'public.blob.vercel-storage.com',
      'bozxo14ddbqm1o86.public.blob.vercel-storage.com', // Specific domain from error
      'picsum.photos', // Added for placeholder images
      // For any other specific subdomains, add them here
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Setting the output to 'standalone' for better Vercel deployment
  output: 'standalone',
  // Enable experimental server actions for Vercel Blob support
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig; 