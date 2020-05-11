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

const defaultLocale =
  (navigator.languages && navigator.languages[0]) ||
  navigator.language ||
  navigator.userLanguage ||
  'en-GB'

const numberFormatter = window.Intl
  ? new Intl.NumberFormat(defaultLocale)
  : { format: num => num }

Vue.filter('numberFormatter', function(num) {
  return numberFormatter.format(num)
})

const numberFormatterFixed = window.Intl
  ? new Intl.NumberFormat(defaultLocale, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    })
  : { format: num => floor(parseFloat(num), 4).toFixed(4) }

Vue.filter('numberFormatterFixed', function(num) {
  return numberFormatterFixed.format(num)
})

Vue.filter('toFixed', function(price, limit = 4) {
  return price.toFixed(limit)
})

Vue.filter('floor', function(number) {
  return floor(number, 4)
})

const toEther = wei => {
  if (typeof wei == 'number') {
    wei = '0x' + wei.toString(16)
  }

  return numberFormatter.format(Web3.utils.fromWei(wei))
}
Vue.filter('toEther', toEther)

Vue.filter('toEtherFixed', function(wei) {
  if (typeof wei == 'number') {
    wei = '0x' + wei.toString(16)
  }

  return numberFormatterFixed.format(Web3.utils.fromWei(wei))
})

new Vue({
  router,
  store,
  render: h => h(App),
}).$mount('#app')
