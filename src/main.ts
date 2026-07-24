import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { queryClient } from '@/lib/query-client'
import { router } from '@/router'
import { useThemeStore } from '@/stores/theme.store'
import { setupApiInterceptors } from '@/services/api.service'
import { setupInventorySync } from '@/features/storefront/state/inventory-sync-channel'
import { useCartActions } from '@/features/cart/api/cart-api'
import { setupCartSync } from '@/features/cart/state/cart-sync-channel'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(VueQueryPlugin, { queryClient })

setupApiInterceptors(pinia, { queryClient, router })
const stopInventorySync = setupInventorySync()
const stopCartSync = setupCartSync(() => useCartActions().refresh())

useThemeStore(pinia).initTheme()

app.mount('#app')

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopInventorySync()
    stopCartSync()
  })
}
