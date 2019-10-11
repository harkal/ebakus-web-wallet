import Vue from 'vue'
import Router from 'vue-router'

import Home from '@/views/Home.vue'

import ImportWallet from '@/components/ImportWallet.vue'
import OnBoarding from '@/components/OnBoarding.vue'
import Unlock from '@/components/Unlock.vue'

import store from '@/store'

Vue.use(Router)

const RouteNames = {
  HOME: 'home',

  NEW: 'new',
  IMPORT: 'import',
  UNLOCK: 'unlock',

  SETTINGS: 'settings',
}

const router = new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: RouteNames.HOME,
      component: Home,
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
  ],
})

router.beforeEach((to, from, next) => {
  if (
    ![RouteNames.NEW, RouteNames.IMPORT, RouteNames.UNLOCK].includes(to.name) &&
    store.state.wallet.locked
  ) {
    // TODO: handle redirect back after unlock

    next({ name: RouteNames.UNLOCK })
  } else {
    next()
  }
})

export default router

export { RouteNames }
