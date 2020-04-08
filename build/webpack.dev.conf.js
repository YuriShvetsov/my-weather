// Dev config..

const webpack = require('webpack')
const merge = require('webpack-merge')
const baseWebpackConfig = require('./webpack.base.conf')

const devWebpackConfig = merge(baseWebpackConfig, {
  // ..here
  mode: 'development',
  devtool: 'cheap-eval-source-map',
  devServer: {
    contentBase: baseWebpackConfig.externals.paths.dist,
    open: true,
    overlay: {
      warnings: false,
      errors: true
    },
    port: 9000
  },
  plugins: [
    new webpack.SourceMapDevToolPlugin({
      filename: '[name].map'
    })
  ]
})

module.exports = new Promise((resolve, reject) => {
  resolve(devWebpackConfig)
})