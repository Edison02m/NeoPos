const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Configurar fallbacks para módulos de Node.js
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "path": require.resolve("path-browserify"),
        "fs": false,
        "util": require.resolve("util/"),
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "buffer": require.resolve("buffer"),
        "process": require.resolve("process/browser"),
        "os": false,
        "net": false,
        "tls": false,
        "child_process": false
      };

      // Configurar alias para resolver problemas de extensión
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        "process/browser": require.resolve("process/browser")
      };

      // Configurar extensiones
      webpackConfig.resolve.extensions = [
        '.js', '.jsx', '.ts', '.tsx', '.json', '.mjs'
      ];

      // Agregar plugins necesarios
      const webpack = require('webpack');
      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );

      // Configurar reglas para módulos específicos
      webpackConfig.module.rules.push({
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto'
      });

      // Ignorar advertencias específicas de estos módulos
      webpackConfig.ignoreWarnings = [
        /Failed to parse source map/,
        /Module not found: Error: Can't resolve 'encoding'/,
      ];

      return webpackConfig;
    },
  },
};