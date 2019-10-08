import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

import { INITIALISE_STORE } from './store/mutation-types'

Vue.config.productionTip = false

new Vue({
  router,
  store,
  beforeCreate() {
    this.$store.commit(INITIALISE_STORE)
  },
  render: h => h(App),
}).$mount('#app')
