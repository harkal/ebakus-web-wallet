import { exitDialog } from '../actions/wallet';
<template>
  <div class="safari-warning scroll-wrapper">
    <div class="wrapper">
      <h1>
        Hey There!
      </h1>
      <h2>
        Unfortunately the ebakus web wallet does not support use accross
        different dApps on safari based browsers at this time.
      </h2>

      <h3>
        For an optimal experience, please use an alternative to safari.
      </h3>

      <div class="browsers">
        <a
          href="https://www.google.com/chrome/browser/desktop/"
          target="_blank"
          rel="noopener"
          title="Download updated Chrome web browser from official Google website!"
        >
          <img
            src="@/assets/img/ic-chrome.png"
            srcset="
              @/assets/img/ic-chrome@2x.png 2x,
              @/assets/img/ic-chrome@3x.png 3x
            "
          />
          <span>Chrome</span>
        </a>

        <a
          href="https://www.mozilla.org/firefox/new"
          target="_blank"
          rel="noopener"
          title="Download updated Firefox web browser from official Mozilla Foundation website!"
        >
          <img
            src="@/assets/img/ic-firefox.png"
            srcset="
              @/assets/img/ic-firefox@2x.png 2x,
              @/assets/img/ic-firefox@3x.png 3x
            "
            class="ic_firefox"
          />
          <span>Firefox</span>
        </a>

        <a
          href="https://opera.com"
          target="_blank"
          rel="noopener"
          title="Download updated Opera web browser from official Opera Software website!"
        >
          <img
            src="@/assets/img/ic-opera.png"
            srcset="
              @/assets/img/ic-opera@2x.png 2x,
              @/assets/img/ic-opera@3x.png 3x
            "
            class="ic_opera"
          />
          <span>Opera</span>
        </a>

        <a
          href="https://www.microsoft.com/en-us/windows/microsoft-edge"
          target="_blank"
          rel="noopener"
          title="Download updated Edge web browser from official Microsoft website!"
        >
          <img
            src="@/assets/img/ic-edge.png"
            srcset="
              @/assets/img/ic-edge@2x.png 2x,
              @/assets/img/ic-edge@3x.png 3x
            "
            class="ic_edge"
          />
          <span>Edge</span>
        </a>
      </div>

      <button class="full" @click="continueUsingWallet">
        I will take my chances with Safari
      </button>
    </div>
  </div>
</template>

<script>
import { exitDialog } from '@/actions/wallet'

import { RouteNames } from '@/router'

import MutationTypes from '@/store/mutation-types'

import styleAnimationVariables from '@/assets/css/_animations.scss'

export default {
  mounted() {
    this.$store.commit(MutationTypes.ACTIVATE_DRAWER)
    this.$store.commit(MutationTypes.SHOW_DIALOG, {
      title: 'Not supported',
    })

    const self = this
    setTimeout(() => {
      self.$store.commit(MutationTypes.SET_OVERLAY_COLOR, 'black')
    }, styleAnimationVariables.animationWallet)
  },

  methods: {
    redirectBack: function() {
      let redirectFrom = this.$route.query.redirectFrom || RouteNames.HOME
      this.$router.push({ name: redirectFrom }, () => {})
    },
    continueUsingWallet: function() {
      this.$store.commit(MutationTypes.GRANT_SAFARI_ACCESS)

      this.redirectBack()

      exitDialog()
    },
  },
}
</script>

<style scoped lang="scss">
.browsers {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  align-content: center;

  margin: 24px auto;

  a {
    margin: 0 10px;
    text-align: center;
    text-decoration: none;

    &:first-child {
      margin-left: 0;
    }

    &:last-child {
      margin-right: 0;
    }

    img {
      width: 46px;
      height: 46px;
      object-fit: contain;
    }

    span {
      opacity: 0.48;
      font-size: 10px;
      font-weight: 600;
      color: #121212;
    }
  }
}
</style>
