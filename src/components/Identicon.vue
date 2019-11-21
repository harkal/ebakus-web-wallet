<template>
  <div class="widget" :class="{ safari: showSafariIdenticon }">
    <div
      id="identicon"
      ref="identicon"
      class="identicon"
      :class="{ placeholder: !publicKey || publicKey == '' }"
    />
  </div>
</template>

<script>
import { mapState } from 'vuex'
import jazzicon from 'jazzicon'

import { isSafari } from '@/utils'

export default {
  props: {
    publicKey: {
      type: String,
      default: '',
    },
  },
  computed: {
    ...mapState({
      isDrawerActive: state => state.ui.isDrawerActive,
      isSafariAllowed: state => state.isSafariAllowed,
    }),

    showSafariIdenticon: function() {
      return isSafari && !this.isSafariAllowed && this.isDrawerActive
    },
  },

  watch: {
    publicKey() {
      this.init()
    },
  },
  mounted() {
    this.init()
  },
  methods: {
    init() {
      const publicKey = this.publicKey
      if (publicKey && publicKey != '') {
        const identicon = jazzicon(
          100,
          parseInt(`0x${publicKey.substr(publicKey.length - 12)}`)
        )
        if (this.$refs.identicon.hasChildNodes()) {
          this.$refs.identicon.removeChild(this.$refs.identicon.childNodes[0])
        }
        this.$refs.identicon.appendChild(identicon)
      }
    },
  },
}
</script>

<style scoped lang="scss">
@import '../assets/css/variables';
@import '../assets/css/animations';
@import '../assets/css/z-index';

.widget {
  @include z-index(widget);

  --widget-size: #{$widget-size-base};

  position: absolute;
  margin: 0;
  top: 8px;
  left: 8px;

  display: flex;
  align-items: center;
  justify-content: center;

  width: var(--widget-size) !important;
  height: var(--widget-size);

  background: transparent;
  border: $widget-border-width solid transparent;
  border-radius: $widget-size-opened;
  box-shadow: 0 2px 14px 0 rgba(0, 0, 0, 0.15);
  pointer-events: initial;

  transform-origin: center;

  &::before {
    display: block;
    content: '';
    position: absolute;
    top: -($widget-blades-offset + $widget-border-width);
    left: -($widget-blades-offset + $widget-border-width);
    width: calc(var(--widget-size) + #{$widget-blades-offset * 2});
    height: calc(var(--widget-size) + #{$widget-blades-offset * 2});
    border-left: 2px solid rgba(254, 65, 132, 1);
    border-right: 3px solid rgba(40, 216, 179, 1);
    border-bottom: 3px solid rgba(0, 174, 239, 0);
    border-top: 3px solid rgba(40, 216, 179, 0);
    border-radius: 100%;
    box-sizing: border-box;
    opacity: 0;
    animation: rotation 1s infinite linear;
  }

  &:hover {
    box-shadow: 0 2px 18px 0 rgba(0, 0, 0, 0.18);

    &::before {
      opacity: 0.75;
    }
  }

  /* loading */
  &.loading::before {
    opacity: 1;
  }

  #wallet:not(.opened) & {
    &:hover {
      transform: scale(1.1);
    }
  }

  .opened & {
    --widget-size: #{$widget-size-opened};

    top: $widget-opened-top;
    background-color: #121212;
    border-color: #fff;
  }

  &.safari {
    border-color: transparent;
    border-radius: 0;
    background-image: url(../assets/img/ic-safari-disabled.png);
    background-image: image-set(
      url(../assets/img/ic-safari-disabled.png) 1x,
      url(../assets/img/ic-safari-disabled@2x.png) 2x,
      url(../assets/img/ic-safari-disabled@3x.png) 3x
    );
    background-repeat: no-repeat;

    background-position: center center;
    background-size: var(--widget-size);

    .opened & {
      background-position: -7px -5px;
      background-size: calc(var(--widget-size) + 8px);
    }

    &::before {
      display: none;
    }

    .identicon ::v-deep > div {
      display: none !important;
    }
  }
}

.identicon {
  @include z-index(widgetIdenticon);

  display: flex;
  align-items: center;
  justify-content: center;

  width: 100%;
  height: 100%;
  border-radius: var(--widget-size);

  &.placeholder::after {
    content: '';
    display: block;
    width: 86%;
    height: 86%;
    border-radius: var(--widget-size);
    background-color: rgba(251, 251, 251, 0.15);
  }

  ::v-deep > div {
    transform: scale(0.26);
    flex: 1 0 auto;

    .opened & {
      transform: scale(0.56);
    }
  }
}

.widget {
  // close animation
  transition: top animation-duration(status, base) ease-out,
    right animation-duration(status, base) ease-out,
    height animation-duration(status, identicon) ease-out,
    width animation-duration(status, identicon) ease-out,
    border animation-duration(status, identicon) ease-out;
  transition-delay: animation-duration(fade, leave);

  .animating-closed-state & {
    transition: top animation-duration(status, base) / 3 ease-out,
      right animation-duration(status, base) / 3 ease-out;
    transition-delay: 0s;
  }

  .opened & {
    // open animation
    transition-delay: 0s;
  }
}

.widget::before {
  // close animation
  transition: width animation-duration(status, identicon) ease-out,
    height animation-duration(status, identicon) ease-out;
  transition-delay: animation-duration(fade, leave);

  .opened & {
    // open animation
    transition-delay: 0s;
  }
}

.identicon::v-deep > div {
  // close animation
  transition: transform animation-duration(status, identicon) ease-out;
  transition-delay: animation-duration(fade, leave);

  .opened & {
    // open animation
    transition-delay: 0s;
  }
}

@keyframes rotation {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(359deg);
  }
}
</style>
