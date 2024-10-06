
/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheHandler: process.env.NODE_ENV === 'production' ? require.resolve('./cache-handler.mjs') : undefined,
  // Use `experimental` option instead of the `cacheHandler` property when using Next.js versions from 13.5.1 to 14.0.4
  /* experimental: {
        incrementalCacheHandlerPath:
            process.env.NODE_ENV === 'production' ? require.resolve('./cache-handler.mjs') : undefined,
    }, */
  output: "standalone",
};

module.exports = nextConfig;

