<template>
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
.navigation {
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
