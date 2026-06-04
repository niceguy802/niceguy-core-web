import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createHttpPlugin } from '@/framework/http'

const app = createApp(App)

// 注册 HTTP 插件，全局可用 this.$url / inject('$url')
app.use(createHttpPlugin())

app.mount('#app')
