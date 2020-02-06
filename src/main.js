import Vue from 'vue'
import VueClipboard from 'vue-clipboard2'
import floor from 'lodash/floor'
import Web3 from 'web3'

import store from '@/store'

import router from '@/router'

import parentFrameMessenger from '@/parentFrameMessenger/parentFrameMessenger'

import App from '@/App.vue'

import WorkAdjustment from '@/components/WorkAdjustment.vue'

import '@/assets/css/main.scss'

Vue.config.productionTip = process.env.NODE_ENV === 'production'

// start listening to messages from parent window if nested in iFrame
parentFrameMessenger()

Vue.use(VueClipboard)

Vue.component('WorkAdjustment', WorkAdjustment)

Vue.filter('toFixed', function(price, limit = 4) {
  return price.toFixed(limit)
})

Vue.filter('floor', function(number) {
  return floor(number, 4)
})

Vue.filter('toEther', function(wei) {
  if (typeof wei == 'number') {
    wei = '0x' + wei.toString(16)
  }

  return Web3.utils.fromWei(wei)
})

Vue.filter('toEtherFixed', function(wei) {
  if (typeof wei == 'number') {
    wei = '0x' + wei.toString(16)
  }

  return floor(parseFloat(Web3.utils.fromWei(wei)), 4).toFixed(4)
})

new Vue({
  router,
  store,
  render: h => h(App),
}).$mount('#app')
