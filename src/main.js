import Vue from 'vue'
import VueResource from 'vue-resource'
import VueClipboard from 'vue-clipboard2'

import App from './App.vue'
import router from './router'
import MutationTypes from './store/mutation-types'
import store from './store'
import { init as initWeb3 } from './actions/web3ebakus'

import './assets/css/main.scss'

Vue.config.productionTip = process.env.NODE_ENV === 'production'

Vue.use(VueResource)
Vue.use(VueClipboard)

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
