module.exports = {
  lintOnSave: false,
  runtimeCompiler: true,
  productionSourceMap: false,

  css: {
    extract: {
      // Vuetify components are loaded across many lazy routes. Their generated
      // CSS is order-independent, but mini-css-extract-plugin cannot infer it.
      ignoreOrder: true
    },
    loaderOptions: {
      sass: {
        sassOptions: {
          // Vuetify 2 uses legacy Sass division internally. Keep application
          // warnings visible while silencing warnings from dependencies.
          quietDeps: true,
          silenceDeprecations: [
            'slash-div',
            'legacy-js-api',
            'import',
            'global-builtin',
            'if-function'
          ]
        }
      }
    }
  },

  configureWebpack: {
    optimization: {
      // A small standalone runtime keeps long-lived vendor chunk hashes stable.
      runtimeChunk: 'single'
    },
    performance: {
      hints: 'warning',
      maxAssetSize: 600000,
      maxEntrypointSize: 1100000
    }
  },

  chainWebpack: (config) => {
    config.module
      .rule('mdi-woff2-only')
      .test(/materialdesignicons\.css$/)
      .enforce('pre')
      .use('string-replace-loader')
      .loader('string-replace-loader')
      .options({
        search: /src: url\("\.\.\/fonts\/materialdesignicons-webfont\.eot[^;]+;\s*src: [^;]+;/,
        replace:
          'src: url("../fonts/materialdesignicons-webfont.woff2?v=4.9.95") format("woff2");'
      })
  },

  pwa: {
    name: 'TS3 Manager',
    themeColor: '#1c2537',
    msTileColor: '#1c2537',
    appleMobileWebAppCapable: 'yes',
    appleMobileWebAppStatusBarStyle: 'black',
    manifestPath: 'manifest.json',
    manifestOptions: {
      name: 'TS3 Manager',
      short_name: 'TS3 Manager',
      description: 'TeamSpeak 3 中文网页管理控制台',
      start_url: './',
      scope: './',
      display: 'standalone',
      background_color: '#1c2537',
      theme_color: '#1c2537',
      icons: [
        {
          src: 'img/icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: 'img/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: 'img/icons/icon-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    },
    workboxOptions: {
      cacheId: 'ts3-manager-v3',
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,
      navigateFallback: 'index.html',
      navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/socket\.io(?:\/|$)/],
      importScripts: ['service-worker-migration.js'],
      exclude: [/\.map$/, /^manifest.*\.js$/],
      runtimeCaching: [
        {
          urlPattern: ({ url }) =>
            url.origin === self.location.origin &&
            (/^\/api(?:\/|$)/.test(url.pathname) ||
              /^\/socket\.io(?:\/|$)/.test(url.pathname)),
          handler: 'NetworkOnly'
        }
      ]
    },
    iconPaths: {
      favicon32: 'img/icons/favicon.png',
      appleTouchIcon: 'img/icons/icon-192.png',
      maskIcon: 'img/icons/ts3_manager.svg',
      msTileImage: 'img/icons/icon-512.png'
    }
  }
}
