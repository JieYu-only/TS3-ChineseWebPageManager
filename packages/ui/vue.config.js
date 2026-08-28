module.exports = {
  lintOnSave: undefined,
  runtimeCompiler: true,

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
          src: 'img/icons/ts3_manager.png',
          sizes: '380x380',
          type: 'image/png',
          purpose: 'any'
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
      appleTouchIcon: 'img/icons/ts3_manager.png',
      maskIcon: 'img/icons/ts3_manager.svg',
      msTileImage: 'img/icons/ts3_manager.png'
    }
  }
}
