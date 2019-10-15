import Vue from 'vue'
import VueClipboard from 'vue-clipboard2'
import floor from 'lodash/floor'

import App from './App.vue'
import router from './router'
import MutationTypes from './store/mutation-types'
import store from './store'
import { init as initWeb3, web3 } from './actions/web3ebakus'

import './assets/css/main.scss'

Vue.config.productionTip = process.env.NODE_ENV === 'production'

Vue.use(VueClipboard)

Vue.filter('toFixed', function(price, limit = 2) {
  return price.toFixed(limit)
})

Vue.filter('floor', function(number) {
  return floor(number, 2)
})

Vue.filter('toEther', function(wei) {
  return web3.utils.fromWei(String(wei))
})

Vue.filter('toEtherBalance', function(wei) {
  return floor(parseFloat(web3.utils.fromWei(String(wei))), 2).toFixed(2)
})

new Vue({
  router,
  store,
  beforeCreate() {
    // init web3 ebakus instance
    initWeb3(this.$store.getters.network)

    this.$store.commit(MutationTypes.INITIALISE_STORE)
  },
  render: h => h(App),
}).$mount('#app')
