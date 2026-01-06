const nodeExternals = require('webpack-node-externals');
const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin');

const HMR_POLL = 'webpack/hot/poll?100';

const withHmrPoll = (entry) => {
  if (typeof entry === 'string') return [HMR_POLL, entry];
  if (Array.isArray(entry)) return [HMR_POLL, ...entry];
  if (entry && typeof entry === 'object')
    return Object.fromEntries(
      Object.entries(entry).map(([k, v]) => [k, withHmrPoll(v)]),
    );
  return entry;
};

module.exports = (options, webpack) => {
  const baseExternals = options.externals
    ? Array.isArray(options.externals)
      ? options.externals
      : [options.externals]
    : [];

  const outputFilename =
    (options.output && options.output.filename) || 'main.js';

  return {
    ...options,
    entry: withHmrPoll(options.entry),
    externals: [...baseExternals, nodeExternals({ allowlist: [HMR_POLL] })],
    plugins: [
      ...(options.plugins ?? []),
      new webpack.HotModuleReplacementPlugin(),
      new webpack.WatchIgnorePlugin({ paths: [/\.js$/, /\.d\.ts$/] }),
      new RunScriptWebpackPlugin({ name: outputFilename, autoRestart: false }),
    ],
  };
};
