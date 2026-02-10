// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import './assets/style.css'
import CookieBanner from './components/CookieBanner.vue'
import Analytics from './components/Analytics.vue'
import {
  fpjsPlugin
} from '@fingerprintjs/fingerprintjs-pro-vue-v3'

const app = createApp(App)

app.use(fpjsPlugin, {
  loadOptions: {
    apiKey: "oI2dmzSFVVdHDNj8m70b"
  },
})

app.component('CookieBanner', CookieBanner)
app.component('Analytics', Analytics)
app.mount('#app')



