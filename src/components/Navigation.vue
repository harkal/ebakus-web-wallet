<template>
  <ul class="navigation">
    <router-link :to="{ name: RouteNames.HOME }" tag="li" exact>
      History
    </router-link>
    <router-link :to="{ name: RouteNames.SEND }" tag="li">
      Send
    </router-link>
    <router-link :to="{ name: RouteNames.RECEIVE }" tag="li">
      Receive
    </router-link>
  </ul>
</template>

<script>
import { RouteNames } from '@/router'

export default {
  computed: {
    RouteNames: () => RouteNames,
  },
}
</script>

<style scoped lang="scss">
@import '../assets/css/_variables.scss';

.navigation {
  position: absolute;
  right: 0;
  width: $wallet-opened-width;
  height: $status-navigation-height;
  margin: 0;
  padding: 5px 9px;

  list-style: none;
  background: #161d2a;
  color: #bababa;

  .hasBalance & {
    top: $widget-opened-top + $widget-size-opened + $status-bar-padding +
      $status-balance-height + $status-bar-padding;
  }

  .hasTitle & {
    top: $widget-opened-top + $widget-size-opened + $status-bar-padding +
      $status-title-height + $status-bar-padding;
  }

  li {
    position: relative;
    display: inline-block;
    width: 74px;
    border: 1px solid #8a8a8a;
    text-align: center;
    padding: 6px 0px;
    margin: 13px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    user-select: none;
    cursor: pointer;

    &:hover,
    &.active {
      color: white;
      background: rgba(253, 49, 95, 0.8);
      border: 1px solid #fd315f;
    }

    &:hover {
      background: rgb(253, 49, 95);
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
