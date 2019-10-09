import Vue from 'vue'
import VueResource from 'vue-resource'
import VueClipboard from 'vue-clipboard2'

import App from './App.vue'
import router from './router'
import store from './store'

import './assets/css/main.scss'

import MutationTypes from './store/mutation-types'

Vue.config.productionTip = process.env.NODE_ENV === 'production'

Vue.use(VueResource)
Vue.use(VueClipboard)

new Vue({
  router,
  store,
  beforeCreate() {
    this.$store.commit(MutationTypes.INITIALISE_STORE)
  },
  render: h => h(App),
}).$mount('#app')
