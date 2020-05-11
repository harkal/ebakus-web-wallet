import Vue from 'vue'
import Router from 'vue-router'

import History from '@/components/History.vue'
import ImportWallet from '@/components/ImportWallet.vue'
import OnBoarding from '@/components/OnBoarding.vue'
import Send from '@/components/Send.vue'
import Receive from '@/components/Receive.vue'
import DappWhitelist from '@/components/DappWhitelist.vue'
import DappWhitelistAddContract from '@/components/DappWhitelistAddContract.vue'
import Unlock from '@/components/Unlock.vue'

import store from '@/store'

// FIXME: import is broken for some reason, try to use it after webpack upgrade
// import {
//   loadedInIframe,
// } from '@/parentFrameMessenger/parentFrameMessenger'

const loadedInIframe = () => {
  try {
    return window.self !== window.top
  } catch (e) {
    return true
  }
}

// import { isSafari } from '@/utils'
// import styleAnimationVariables from '@/assets/css/_animations.scss'

Vue.use(Router)

const RouteNames = {
  HOME: 'home',

  NEW: 'new',
  IMPORT: 'import',
  UNLOCK: 'unlock',

  SEND: 'send',
  RECEIVE: 'receive',

  WHITELIST_DAPP: 'whitelist_dapp',
  WHITELIST_CONTRACT_FOR_DAPP: 'whitelist_contract_for_dapp',

  SETTINGS: 'settings',
  STAKE: 'stake',
  VOTING_STAKE: 'voting_stake',

  SAFARI_WARNING: 'safari_warning',
}

// when in iframe use 'abstract', otherwise, history.back() on parent will change iframe history too
const routerMode = loadedInIframe() ? 'abstract' : 'history'

const router = new Router({
  mode: routerMode,
  base: process.env.BASE_URL,
  linkActiveClass: 'active',
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
    {
      path: '/receive',
      name: RouteNames.RECEIVE,
      component: Receive,
    },

    {
      path: '/whitelist/dapp',
      name: RouteNames.WHITELIST_DAPP,
      component: DappWhitelist,
    },
    {
      path: '/whitelist/dapp/contract',
      name: RouteNames.WHITELIST_CONTRACT_FOR_DAPP,
      component: DappWhitelistAddContract,
    },

    {
      path: '/settings',
      name: RouteNames.SETTINGS,
      component: () =>
        import(/* webpackChunkName: "settings" */ '@/components/Settings'),
    },

    {
      path: '/settings/stake',
      name: RouteNames.STAKE,
      component: () =>
        import(/* webpackChunkName: "stake" */ '@/components/Stake'),
    },

    {
      path: '/voting/stake',
      name: RouteNames.VOTING_STAKE,
      component: () =>
        import(/* webpackChunkName: "stake" */ '@/components/Stake'),
    },

    // {
    //   path: '/safari-warning',
    //   name: RouteNames.SAFARI_WARNING,
    //   component: () =>
    //     import(
    //       /* webpackChunkName: "safari-warning" */ '@/components/SafariWarning'
    //     ),
    // },
  ],
})

router.beforeEach((to, from, next) => {
  // if (
  //   isSafari &&
  //   from.name !== null && // check that it is not initial render
  //   to.name !== RouteNames.SAFARI_WARNING &&
  //   !store.state.isSafariAllowed
  // ) {
  //   setTimeout(() => {
  //     next({
  //       name: RouteNames.SAFARI_WARNING,
  //       query: { redirectFrom: to.name },
  //     })
  //   }, styleAnimationVariables.animationWallet)
  // } else
  if (
    ![
      RouteNames.NEW,
      RouteNames.IMPORT,
      RouteNames.UNLOCK,
      RouteNames.SAFARI_WARNING,
    ].includes(to.name) &&
    store.state.isStateLoaded && // without this check the next getter will be falsy
    store.getters.wallet.locked
  ) {
    next({ name: RouteNames.UNLOCK, query: { redirectFrom: to.name } })
  } else {
    next()
  }
})

export default router

export { RouteNames }
