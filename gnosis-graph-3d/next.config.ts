import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  webpack: (config, { isServer }) => {
    // Handle WebGL-related files
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      type: 'asset/source'
    });

    // Handle canvas for server-side
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    
    // Prevent server-side bundle from including browser-specific modules
    if (isServer) {
      config.externals = [
        ...config.externals,
        'three',
        '@react-three/fiber',
        '@react-three/drei'
      ];
    }

    // Disable webpack cache to resolve snapshot issues
    config.cache = false;

    // Optimize module resolution
    config.resolve = {
      ...config.resolve,
      preferRelative: true,
      fallback: {
        ...config.resolve?.fallback,
        punycode: false
      }
    };

    return config;
  },
  // Experimental features
  experimental: {
    webpackBuildWorker: false,
    // Disable certain optimizations that might cause issues
    optimizeCss: false,
    // More aggressive tree-shaking
    optimizePackageImports: ['three', '@react-three/fiber', '@react-three/drei']
  }
};

export default nextConfig;
