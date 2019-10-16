import Vue from 'vue'
import VueClipboard from 'vue-clipboard2'
import floor from 'lodash/floor'

import { init as initWeb3, web3 } from '@/actions/web3ebakus'

import MutationTypes from '@/store/mutation-types'

import store from '@/store'

import router from '@/router'

import parentFrameMessenger from '@/parentFrameMessenger/parentFrameMessenger'

import App from '@/App.vue'
import '@/assets/css/main.scss'

Vue.config.productionTip = process.env.NODE_ENV === 'production'

// start listening to messages from parent window if nested in iFrame
parentFrameMessenger()

Vue.use(VueClipboard)

Vue.filter('toFixed', function(price, limit = 2) {
  return price.toFixed(limit)
})

Vue.filter('floor', function(number) {
  return floor(number, 2)
})

Vue.filter('toEther', function(wei) {
  if (typeof wei == 'number') {
    wei = '0x' + wei.toString(16)
  }

  return web3.utils.fromWei(wei)
})

Vue.filter('toEtherFixed', function(wei) {
  if (typeof wei == 'number') {
    wei = '0x' + wei.toString(16)
  }

  return floor(parseFloat(web3.utils.fromWei(wei)), 2).toFixed(2)
})

new Vue({
  router,
  store,
  beforeCreate() {
    this.$store.commit(MutationTypes.INITIALISE_STORE)

    // init web3 ebakus instance
    initWeb3(this.$store.getters.network)
  },
  render: h => h(App),
}).$mount('#app')
