/* eslint-disable @typescript-eslint/no-var-requires */
import type { Configuration } from 'webpack';
import webpack from 'webpack';
import nodeExternals from 'webpack-node-externals';

/**
 * NestJS Webpack HMR config (works with: nest build --webpack --webpackPath webpack-hmr.config.ts --watch)
 * - Targets Node
 * - Enables Hot Module Replacement
 * - Keeps node_modules external except the HMR polling entry
 */
module.exports = (options: Configuration): Configuration => {
  const isWatch = (options.watch ?? false) === true;

  return {
    ...options,
    entry: [
      ...(isWatch ? ['webpack/hot/poll?100'] : []),
      ...(Array.isArray(options.entry)
        ? options.entry
        : [options.entry as any]),
    ].filter(Boolean) as any,

    externals: [
      nodeExternals({
        allowlist: isWatch ? ['webpack/hot/poll?100'] : [],
      }),
    ],

    plugins: [
      ...(options.plugins ?? []),
      ...(isWatch ? [new webpack.HotModuleReplacementPlugin()] : []),
    ],

    // Faster rebuilds in dev; keep existing if set
    devtool: options.devtool ?? (isWatch ? 'inline-source-map' : false),

    // Ensure webpack can correctly resolve .ts output from Nest builder
    resolve: {
      ...(options.resolve ?? {}),
      extensions: ['.ts', '.js', ...(options.resolve?.extensions ?? [])],
    },
  };
};
