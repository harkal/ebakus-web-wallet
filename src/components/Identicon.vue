<template>
  <div class="widget">
    <div
      id="identicon"
      ref="identicon"
      class="identicon"
      :class="{ placeholder: publicKey == '' }"
    />
  </div>
</template>

<script>
import jazzicon from 'jazzicon'

export default {
  props: {
    publicKey: {
      type: String,
      default: '',
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

.widget {
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
  z-index: 9999;
  pointer-events: initial;

  transform-origin: center;
  // transition: all animation-duration(status, identicon) linear;

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
    // transition: all animation-duration(status, identicon) linear;
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
  position: relative;
  top: -$widget-border-width;
  // left: -$widget-border-width;
  right: 0;
  width: calc(var(--widget-size) - #{$widget-border-width * 2});
  height: calc(var(--widget-size) - #{$widget-border-width * 2});
  border-radius: var(--widget-size);

  // transition: all 150ms ease-in-out;

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
    // transition: all animation-duration(status, identicon) linear;

    .opened & {
      top: ($widget-border-width * 3);
      left: ($widget-border-width * 2);
      transform: scale(0.55);
    }
  }
}

.widget,
.widget::before,
.identicon::v-deep > div {
  transition: top animation-duration(status, identicon) ease-out,
    height animation-duration(status, identicon) ease-out,
    right animation-duration(status, identicon) ease-out,
    width animation-duration(status, identicon) ease-out,
    border animation-duration(status, identicon) ease-out;

  .opened & {
    transition-delay: 0s;
  }
}

.identicon::v-deep > div {
  transition: top animation-duration(status, identicon) ease-out,
    left animation-duration(status, identicon) ease-out,
    transform animation-duration(status, identicon) ease-out;

  .opened & {
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
