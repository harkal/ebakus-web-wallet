const webpack = require('webpack')

const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const env = IS_PRODUCTION
  ? require('./config/prod.env')
  : require('./config/dev.env')

module.exports = {
  configureWebpack: {
    devServer: {
      host: '0.0.0.0',
      disableHostCheck: !!process.env.DISABLE_HOST_CHECK,
    },
    plugins: [
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1,
      }),
      new webpack.DefinePlugin({
        'process.env': env,
      }),
    ],
  },
  chainWebpack: config => {
    config.optimization.delete('splitChunks')
    config.output.globalObject('this')

    // this is not a good practice,
    // but it's used because we link to a local path for `web3-ebakus` at package.json
    // https://github.com/vuejs/vue-cli/issues/2948#issuecomment-438589725
    config.resolve.symlinks(false)
  },
  productionSourceMap: false,
}
