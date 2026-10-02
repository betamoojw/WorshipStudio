<script setup lang="ts">
import { computed } from 'vue'
import LiveVideoControls from '@/components/service-workspace/LiveVideoControls.vue'
import type { LiveVideoCommand, LiveVideoStatus } from '@/adapters/types'
import type { TransportDestination } from '@/composables/useLiveTransport'

const props = withDefaults(
  defineProps<{
    previousDisabled: boolean
    nextDisabled: boolean
    previous: TransportDestination
    next: TransportDestination
    isPresenting: boolean
    currentSlideLabel: string
    liveContextSnippet: string
    backgroundOnly: boolean
    backgroundOnlyDisabled: boolean
    isBlankScreen: boolean
    /** Set while a video is the live content — the middle of the bar becomes its controls. */
    liveVideo?: LiveVideoStatus
    liveVideoTitle?: string
    // Set by the parent on a short landscape-tablet viewport (see ServiceWorkspaceView.vue's
    // isShortViewport) — height isn't something this component can detect on its own the way
    // the width-based container queries below can within its own box.
    compact?: boolean
  }>(),
  { compact: false, liveVideo: undefined, liveVideoTitle: '' },
)
defineEmits<{
  previous: []
  next: []
  'toggle-background-only': []
  'toggle-blank-screen': []
  'video-command': [command: LiveVideoCommand]
}>()

const previousEyebrow = computed(() => (props.previous.newItem ? 'Previous item' : 'Previous'))
const nextEyebrow = computed(() => (props.next.newItem ? 'Next item' : 'Next'))
const blankLabel = computed(() => (props.isBlankScreen ? 'Restore Screen' : 'Blank Screen'))
const fullLabel = (destination: TransportDestination) =>
  destination.prefix ? `${destination.prefix} ${destination.label}` : destination.label
</script>

<template>
  <div
    class="transport-bar"
    :class="{ 'transport-bar--live': isPresenting, 'transport-bar--compact': compact }"
  >
    <!-- Live vs preview is the bar's top edge — red while presenting, a dim grey otherwise — rather
         than a chip, which cost the middle of the bar ~60px at every width. The same 3px either
         way, so going live changes a colour and never shifts the layout. Red is the app's live
         colour already (the Current preview's outline); the words are in the top bar's
         Start/Stop Presenting, and for screen readers, just below. -->
    <div class="transport-grid">
      <button
        type="button"
        class="transport-destination transport-destination--previous"
        :disabled="previousDisabled"
        :aria-label="`${previousEyebrow}: ${fullLabel(previous)}`"
        @click="$emit('previous')"
      >
        <v-icon icon="mdi-chevron-left" size="24" class="destination-chevron" />
        <span class="destination-copy">
          <small>{{ previousEyebrow }}</small>
          <span class="destination-label"
            ><span v-if="previous.prefix" class="destination-prefix">{{ previous.prefix }}</span
            >{{ previous.label }}</span
          >
        </span>
        <kbd>←</kbd>
      </button>

      <div class="transport-now">
        <span class="d-sr-only">{{ isPresenting ? 'Live' : 'Preview, not presenting' }}</span>
        <LiveVideoControls
          v-if="liveVideo"
          :status="liveVideo"
          :title="liveVideoTitle"
          @command="$emit('video-command', $event)"
        />
        <div v-else class="current-slide-copy">
          <strong>{{ currentSlideLabel }}</strong>
          <span v-if="liveContextSnippet">{{ liveContextSnippet }}</span>
        </div>
      </div>

      <div class="screen-overrides" role="group" aria-label="Screen overrides">
        <button
          type="button"
          class="screen-override-button"
          :class="{ 'screen-override-button--on': backgroundOnly }"
          :disabled="backgroundOnlyDisabled"
          :aria-pressed="backgroundOnly"
          aria-label="Background Only"
          title="Background Only (G)"
          @click="$emit('toggle-background-only')"
        >
          <v-icon icon="mdi-image-outline" size="18" />
          <span class="screen-override-label">Background Only</span>
          <kbd>G</kbd>
        </button>
        <button
          type="button"
          class="screen-override-button"
          :class="{ 'screen-override-button--on': isBlankScreen }"
          :aria-pressed="isBlankScreen"
          :aria-label="blankLabel"
          :title="`${blankLabel} (B)`"
          @click="$emit('toggle-blank-screen')"
        >
          <v-icon icon="mdi-monitor-off" size="18" />
          <span class="screen-override-label">{{ blankLabel }}</span>
          <kbd>B</kbd>
        </button>
      </div>

      <button
        type="button"
        class="transport-destination transport-destination--next"
        :disabled="nextDisabled"
        :aria-label="`${nextEyebrow}: ${fullLabel(next)}`"
        @click="$emit('next')"
      >
        <kbd>→</kbd>
        <span class="destination-copy">
          <small>{{ nextEyebrow }}</small>
          <span class="destination-label"
            ><span v-if="next.prefix" class="destination-prefix">{{ next.prefix }}</span
            >{{ next.label }}</span
          >
        </span>
        <v-icon icon="mdi-chevron-right" size="26" class="destination-chevron" />
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Laid out by the bar's own width (container queries), not the window's: four tiers, matching
   the approved mockups — wide, medium (laptops, tablets in landscape), narrow (tablet portrait)
   and phone, where it becomes two rows. */
.transport-bar {
  flex-shrink: 0;
  container: transport-bar / inline-size;
  padding: 10px 14px;
  border-top: 3px solid rgba(var(--v-theme-on-surface), 0.16);
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.08);
}
.transport-bar--live {
  border-top-color: rgb(var(--v-theme-error));
}
.transport-bar--compact {
  padding-top: 6px;
  padding-bottom: 6px;
}
.transport-grid {
  /* 64 rather than the mockups' 60: a label that wraps to its second line needs the room, or it
     sits hard against the button's top and bottom edges. */
  --transport-control-height: 64px;
  display: grid;
  grid-template-areas: 'previous now overrides next';
  /* Proportional rather than fixed (250/340px at a 1440px bar, as in the mockups), so the middle
     shrinks along with Previous and Next instead of being squeezed out by them at the low end of
     a tier — at an 800px bar, fixed columns left the live video no room for even its time. */
  grid-template-columns: minmax(0, 5fr) minmax(0, 9fr) auto minmax(0, 6.5fr);
  align-items: center;
  gap: 12px;
}
.transport-bar--compact .transport-grid {
  --transport-control-height: 48px;
}

.transport-destination {
  display: flex;
  box-sizing: border-box;
  min-width: 0;
  height: var(--transport-control-height);
  align-items: center;
  gap: 10px;
  padding: 0 12px 0 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 8px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.82);
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition:
    border-color var(--ws-transition-fast),
    background-color var(--ws-transition-fast);
}
.transport-destination--previous {
  grid-area: previous;
}
.transport-destination--next {
  grid-area: next;
  padding: 0 8px 0 12px;
  border-color: rgba(var(--v-theme-primary), 0.5);
  background: rgba(var(--v-theme-primary), 0.18);
  color: rgb(var(--v-theme-on-surface));
}
.transport-destination:hover:not(:disabled) {
  border-color: rgba(var(--v-theme-primary), 0.45);
  background: rgba(var(--v-theme-primary), 0.08);
}
.transport-destination--next:hover:not(:disabled) {
  background: rgba(var(--v-theme-primary), 0.26);
}
.transport-destination:focus-visible,
.screen-override-button:focus-visible {
  outline: 2px solid rgba(var(--v-theme-primary), 0.6);
  outline-offset: 1px;
}
.transport-destination:disabled {
  cursor: default;
  opacity: 0.42;
}
.destination-chevron {
  flex: none;
}
.destination-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}
.transport-destination--next .destination-copy {
  text-align: right;
}
.destination-copy small {
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}
.transport-destination--next .destination-copy small {
  color: rgba(var(--v-theme-on-surface), 0.72);
}
/* The gap after a scripture page's book ("Romans 8:31–35"). A margin rather than a space in the
   markup, which the template compiler strips from the end of the element. */
.destination-prefix {
  margin-right: 0.3em;
}
/* Two lines before anything is cut off — the label is already as short as it can be (just the
   part within the live item), so what's left is a long item name. */
.destination-label {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-size: 0.8125rem;
  font-weight: 560;
  line-height: 1.2;
}
/* A 48px button has room for one line under its caption, not two. */
.transport-bar--compact .destination-label {
  -webkit-line-clamp: 1;
}
.transport-destination--next .destination-label {
  font-size: 0.9375rem;
  font-weight: 650;
}

.transport-now {
  grid-area: now;
  min-width: 0;
  padding: 0 8px;
}
.current-slide-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}
.current-slide-copy strong,
.current-slide-copy span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.current-slide-copy strong {
  color: rgba(var(--v-theme-on-surface), 0.94);
  font-size: 0.9375rem;
  font-weight: 650;
}
.current-slide-copy span {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.78rem;
}
/* Same tier as the video's title (LiveVideoControls): gone where the middle shares its row, back
   on the phone layout, where it has a row of its own. */
@container transport-bar (min-width: 520px) and (max-width: 799px) {
  .current-slide-copy span {
    display: none;
  }
}

.screen-overrides {
  display: flex;
  grid-area: overrides;
  gap: 6px;
}
.screen-override-button {
  display: flex;
  height: 44px;
  align-items: center;
  gap: 8px;
  padding: 0 8px 0 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.05);
  color: rgba(var(--v-theme-on-surface), 0.9);
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 560;
  white-space: nowrap;
}
.screen-override-button:hover:not(:disabled) {
  background: rgba(var(--v-theme-on-surface), 0.1);
}
.screen-override-button:disabled {
  cursor: default;
  opacity: 0.42;
}
.screen-override-button--on,
.screen-override-button--on:hover:not(:disabled) {
  border-color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}
.screen-override-button--on kbd {
  border-color: rgba(var(--v-theme-on-primary), 0.4);
  background: rgba(var(--v-theme-on-primary), 0.14);
  color: rgb(var(--v-theme-on-primary));
}

.transport-bar kbd {
  display: inline-grid;
  box-sizing: border-box;
  min-width: 24px;
  height: 24px;
  flex: none;
  place-items: center;
  padding: 0 5px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.14);
  border-bottom-color: rgba(var(--v-theme-on-surface), 0.24);
  border-radius: 5px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-family: inherit;
  font-size: 0.69rem;
  font-weight: 650;
  line-height: 1;
}

/* Medium: the arrow keys on Previous/Next go (they're obvious); the toggles keep G and B, which
   aren't, and lose their words instead. */
@container transport-bar (max-width: 1199px) {
  .transport-grid {
    gap: 10px;
  }
  .transport-destination > kbd,
  .screen-override-label,
  .destination-prefix {
    display: none;
  }
  .screen-override-button {
    gap: 7px;
    padding: 0 7px 0 10px;
  }
  .transport-destination--next .destination-label {
    font-size: 0.875rem;
  }
}

/* Narrow (tablet portrait): Previous is its chevron alone, Next keeps a short label, the
   toggles are icons. */
@container transport-bar (max-width: 799px) {
  .transport-grid {
    --transport-control-height: 52px;
    grid-template-columns: 52px minmax(0, 1fr) auto 140px;
    gap: 8px;
  }
  .transport-destination--previous {
    justify-content: center;
    padding: 0;
  }
  .transport-destination--previous .destination-copy {
    display: none;
  }
  .transport-destination--next {
    gap: 6px;
    padding: 0 4px 0 10px;
  }
  .transport-destination--next .destination-label {
    display: block;
    overflow: hidden;
    font-size: 0.78rem;
    font-weight: 620;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .screen-override-button {
    width: 44px;
    justify-content: center;
    padding: 0;
  }
  .screen-override-button kbd {
    display: none;
  }
  .transport-now {
    padding: 0 4px;
  }
}

/* Phone: two rows — what's live (or the video's controls) across the top, then Previous, the
   toggles and a wide Next. The only way to keep every control at a usable size. */
@container transport-bar (max-width: 519px) {
  .transport-grid {
    grid-template-areas:
      'now now now'
      'previous overrides next';
    grid-template-columns: 52px auto minmax(0, 1fr);
    row-gap: 8px;
  }
}
/* Next gets what's left after Previous and the toggles (about the bar's width less 182px); below
   ~120px that's no longer room for a caption and a name, so it goes to its chevron alone, like
   Previous. Its fill still marks it as the main button, and its aria-label still names where it
   goes. */
@container transport-bar (max-width: 299px) {
  /* Same fixed width as Previous, with the toggles centred between the two. */
  .transport-grid {
    grid-template-columns: 52px minmax(0, 1fr) 52px;
  }
  .screen-overrides {
    justify-content: center;
  }
  .transport-destination--next {
    justify-content: center;
    padding: 0;
  }
  .transport-destination--next .destination-copy {
    display: none;
  }
}
</style>
