<template>
  <!-- <div class="navigation"> -->
  <ul class="navigation">
    <router-link :to="{ name: RouteNames.HOME }" tag="li">
      History
    </router-link>
    <router-link :to="{ name: RouteNames.SEND }" tag="li">
      Send
    </router-link>
    <router-link :to="{ name: RouteNames.RECEIVE }" tag="li">
      Receive
    </router-link>
  </ul>
  <!-- </div> -->
</template>

<script>
// import { mapGetters } from 'vuex'
import { RouteNames } from '@/router'

export default {
  computed: {
    // ...mapGetters(['isDrawerActive', 'txPending']),
    RouteNames: () => RouteNames,
  },
  // methods: {
  //   changeTab(event) {
  //     this._activeTab = event.target.id
  //     store.commit('setActiveTab', event.target.id)
  //     if (this._activeTab != 'ebk-tab_send') {
  //       store.commit('clearTxPending')
  //     }
  //   },
  // },
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
/* #mainWallet.active .tabbar {
  transform: translateY(0);
  top: 187px;
  opacity: 1;
  animation: grow 0.2s ease-out;
  z-index: 9998;
  margin: 0px;
}
@keyframes grow {
  0% {
    display: none;
  }
  1% {
    display: block;
    opacity: 0.5;
    transform: translateY(-120%);
  }
  100% {
    opacity: 1;
    transform: translateY(0%);
  }
}
ul.tabbar li {
  opacity: 0;
}
#mainWallet.active > ul.tabbar > li {
  opacity: 1;
  animation: grow_ 0.2s ease-out;
}
@keyframes grow_ {
  0% {
    opacity: 0;
  }
  1% {
    opacity: 0;
    transform: scale(0.8);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
} */

.navigation {
  // position: absolute;

  list-style: none;
  width: 320px;
  background: #161d2a;
  color: #bababa;
  padding: 5px 9px;

  li {
    position: relative;
    display: inline-block;
    width: 74px;
    border: 1px solid #8a8a8a;
    text-align: center;
    padding: 6px 0px;
    margin: 13px;
    border-radius: 20px;
    font-size: 14px;
    cursor: pointer;
    font-weight: 500;
    user-select: none;

    &:hover {
      color: white;
      background: rgb(253, 49, 95);
      border: 1px solid #fd315f;
    }
    &.active {
      color: white;
      background: rgba(253, 49, 95, 0.8);
      border: 1px solid #fd315f;
    }

    &.notification:after {
      position: absolute;
      height: 14px;
      top: -5px;
      right: -5px;
      padding: 0px 4px;
      border-radius: 100%;

      content: '1';

      font-size: 10px;
      color: white;
      background: #fd315f;
      border: 1px solid #fd315f;
    }
  }
}
</style>
