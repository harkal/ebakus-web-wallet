import Vue from 'vue'
import Router from 'vue-router'

import Home from '@/views/Home.vue'

import OnBoarding from '@/components/OnBoarding.vue'
import Unlock from '@/components/Unlock.vue'

import store from '@/store'

Vue.use(Router)

const RouteNames = {
  HOME: 'HOME',

  NEW: 'NEW',
  IMPORT: 'IMPORT',
  UNLOCK: 'UNLOCK',

  SETTINGS: 'SETTINGS',
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
      path: '/unlock',
      name: RouteNames.UNLOCK,
      component: Unlock,
    },
  ],
})

router.beforeEach((to, from, next) => {
  if (
    ![RouteNames.NEW, RouteNames.UNLOCK].includes(to.name) &&
    store.state.wallet.locked
  ) {
    next({ name: RouteNames.UNLOCK })
  } else {
    next()
  }
})

export default router

export { RouteNames }
