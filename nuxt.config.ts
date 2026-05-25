export default defineNuxtConfig({
  devtools: { enabled: true },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  runtimeConfig: {
    reinfolibApiKey: '',
    googlePlacesApiKey: '',
    supabaseServiceKey: '',
    public: {
      mapboxToken: '',
      supabaseUrl: '',
      supabaseAnonKey: '',
    },
  },

  css: ['mapbox-gl/dist/mapbox-gl.css'],

  app: {
    head: {
      title: 'SUMALLY（スマリー）',
      htmlAttrs: { lang: 'ja' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            '住所のハザードリスクと生活利便性を一画面で確認できるサービス。スコアの計算ロジックを完全公開。',
        },
      ],
    },
  },

  compatibilityDate: '2024-11-01',
})
