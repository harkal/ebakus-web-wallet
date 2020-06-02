const zlib = require('zlib')
const webpack = require('webpack')
const CompressionPlugin = require('compression-webpack-plugin')

const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const env = IS_PRODUCTION
  ? process.env.IS_TESTNET
    ? require('./config/testnet.env')
    : require('./config/mainnet.env')
  : require('./config/dev.env')

module.exports = {
  configureWebpack: {
    devServer: {
      host: '0.0.0.0',
      disableHostCheck: !!process.env.DISABLE_HOST_CHECK,
    },
    plugins: [
      // new webpack.optimize.LimitChunkCountPlugin({
      //   maxChunks: 1,
      // }),
      new webpack.DefinePlugin({
        'process.env': env,
      }),

      new webpack.IgnorePlugin(/^\.\/wordlists\/(?!english)/, /bip39\/src$/),

      new CompressionPlugin({
        filename: '[path].gz[query]',
        algorithm: 'gzip',
        test: /\.(js|css|html|svg)$/,
        threshold: 10240,
        minRatio: 0.8,
      }),

      new CompressionPlugin({
        filename: '[path].br[query]',
        algorithm: 'brotliCompress',
        test: /\.(js|css|html|svg)$/,
        compressionOptions: {
          // zlib’s `level` option matches Brotli’s `BROTLI_PARAM_QUALITY` option.
          level: 11,
        },
        threshold: 10240,
        minRatio: 0.8,
        deleteOriginalAssets: false,
      }),
    ],
  },
  chainWebpack: config => {
    // config.optimization.delete('splitChunks')
    // config.output.globalObject('this')

    // this is not a good practice,
    // but it's used because we link to a local path for `web3-ebakus` at package.json
    // https://github.com/vuejs/vue-cli/issues/2948#issuecomment-438589725
    config.resolve.symlinks(false)
  },
  productionSourceMap: false,
}
