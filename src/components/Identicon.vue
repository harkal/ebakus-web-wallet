<template>
  <div class="widget">
    <div
      id="identicon"
      ref="identicon"
      class="identicon"
      :class="{ placeholder: !publicKey || publicKey == '' }"
    />

    <img
      v-if="showSafariIdenticon"
      src="@/assets/img/ic-safari-disabled.png"
      srcset="
        @/assets/img/ic-safari-disabled@2x.png 2x,
        @/assets/img/ic-safari-disabled@3x.png 3x
      "
      class="safari"
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
    transform: translateZ(0);
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
}

.identicon {
  @include z-index(widgetIdenticon);

  position: relative;
  top: -$widget-border-width;
  // left: -$widget-border-width;
  right: 0;
  width: calc(var(--widget-size) - #{$widget-border-width * 2});
  height: calc(var(--widget-size) - #{$widget-border-width * 2});
  border-radius: var(--widget-size);

  &.placeholder::after {
    content: '';
    display: block;
    position: absolute;
    top: $widget-border-width;
    left: 0;
    bottom: -$widget-border-width;
    right: 0;
    border-radius: var(--widget-size);
    background-color: rgba(251, 251, 251, 0.15);
  }

  ::v-deep > div {
    position: relative;
    top: 0;
    left: -($widget-border-width * 1);
    transform: translateZ(0);
    transform-origin: 0 0;
    transform: scale(0.25);

    .opened & {
      top: ($widget-border-width * 3);
      left: ($widget-border-width * 2);
      transform: scale(0.55);
    }
  }
}

.safari {
  @include z-index(widgetSafariIdenticon);

  position: absolute;
  top: -8px;
  right: -8px;
  width: 80px;
  height: 80px;

  object-fit: contain;
}

.widget,
.widget::before,
.identicon.placeholder::after,
.identicon::v-deep > div {
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

.identicon::v-deep > div {
  // close animation
  transition: top animation-duration(status, base) ease-out,
    left animation-duration(status, base) ease-out,
    transform animation-duration(status, identicon) ease-out;
  transition-delay: animation-duration(fade, leave);

  .animating-closed-state & {
    transition: top animation-duration(status, base) / 3 ease-out,
      left animation-duration(status, base) / 3 ease-out;
    transition-delay: 0s;
  }

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
