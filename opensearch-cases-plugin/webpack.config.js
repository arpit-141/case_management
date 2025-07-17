const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { DefinePlugin } = require('webpack');

module.exports = {
  mode: 'production',
  entry: {
    plugin: './public/index.ts',
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].js',
    libraryTarget: 'umd',
    publicPath: '/plugins/opensearch-cases-plugin/',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'public'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env.PLUGIN_ID': JSON.stringify('opensearchCases'),
    }),
  ],
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
  },
  optimization: {
    minimize: true,
  },
};