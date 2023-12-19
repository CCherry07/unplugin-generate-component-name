const path = require('path')
const { VueLoaderPlugin } = require('vue-loader')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const GenComponentName = require('unplugin-generate-component-name/webpack');
const { DefinePlugin } = require('webpack');
const isProduction = process.env.NODE_ENV === 'production'
module.exports = {
  stats: "errors-only",
  mode: "development",
  plugins: [
    new DefinePlugin({
      __VUE_OPTIONS_API__: false,
      __VUE_PROD_DEVTOOLS__: false
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, './public/index.html'),
      title: 'webpack-app'
    }),
    new VueLoaderPlugin(),
    GenComponentName.default()
  ],
  entry: {
    main: path.resolve(__dirname, './src/main.ts')
  },
  output: {
    path: path.resolve(__dirname, '../dist')
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.js', '.ts', '.vue']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "ts-loader",
        options: {
          configFile: path.resolve(process.cwd(), "tsconfig.json"),
          appendTsSuffixTo: [/\.vue$/],
        },
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1
            }
          },
          'postcss-loader'
        ]
      },
      {
        test: /\.(ttf|woff|woff2|eto|svg)$/,
        exclude: path.resolve(__dirname, '../src/assets/img'),
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 4 * 1024
          }
        },
        generator: {
          filename: isProduction
            ? 'static/fonts/[name].[contenthash:8][ext]'
            : 'static/fonts/[name][ext]'
        }
      },
      {
        test: /\.(jpe?g|png|gif|svg)$/,
        exclude: path.resolve(__dirname, '../src/assets/fonts'),
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 4 * 1024
          }
        },
        generator: {
          filename: isProduction ?
            'static/img/[name].[contenthash:8][ext]' :
            'static/img/[name][ext]'
        }
      },
    ],
  },
}
