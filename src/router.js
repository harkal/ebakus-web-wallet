import Vue from 'vue'
import Router from 'vue-router'

import History from '@/components/History.vue'
import ImportWallet from '@/components/ImportWallet.vue'
import OnBoarding from '@/components/OnBoarding.vue'
import Send from '@/components/Send.vue'
import Unlock from '@/components/Unlock.vue'

import store from '@/store'

Vue.use(Router)

const RouteNames = {
  HOME: 'home',

  NEW: 'new',
  IMPORT: 'import',
  UNLOCK: 'unlock',

  SEND: 'send',

  SETTINGS: 'settings',
}

const router = new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: RouteNames.HOME,
      component: History,
    },
    {
      path: '/new',
      name: RouteNames.NEW,
      component: OnBoarding,
    },
    {
      path: '/import',
      name: RouteNames.IMPORT,
      component: ImportWallet,
    },

    {
      path: '/unlock',
      name: RouteNames.UNLOCK,
      component: Unlock,
    },

    {
      path: '/send',
      name: RouteNames.SEND,
      component: Send,
    },
  ],
})

router.beforeEach((to, from, next) => {
  if (
    ![RouteNames.NEW, RouteNames.IMPORT, RouteNames.UNLOCK].includes(to.name) &&
    store.state.wallet.locked
  ) {
    // TODO: handle redirect back after unlock
    const redirectTo = from.name

    next({ name: RouteNames.UNLOCK, query: { redirectTo } })
  } else {
    next()
  }
})

export default router

export { RouteNames }
