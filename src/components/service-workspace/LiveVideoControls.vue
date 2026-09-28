<script setup lang="ts">
import { ref } from 'vue'
import type { LiveVideoCommand, LiveVideoStatus } from '@/adapters/types'
import { formatVideoTime } from '@/utils/videoTime'

/**
 * Operator transport for the live video — the middle of the transport bar (LiveTransportBar)
 * while a video is live, so it's in sight at every width, unlike the preview column, which
 * folds into a drawer below 1280px. A video goes live paused on its first frame (see
 * SlideContentRenderer.vue) and plays only when started here, with Space, or from the phone
 * remote. `status` is the audience output's own report of where the video is, so this always
 * shows the real screen rather than a guess.
 *
 * Bordered like the bar's Previous button, so the buttons read as belonging to this video rather
 * than to the bar. What it shows follows the whole bar's width (the `transport-bar` container),
 * never its own: the seek bar goes below a 1000px bar, the title in the narrow tier, leaving
 * Play/Pause, Back to start and the time. Its own width isn't monotonic with the window — the
 * bar's tier steps and the app's navigation collapsing both hand it room back as the window
 * narrows — so keying off it made the seek bar appear, vanish and reappear while dragging a
 * window edge. The bar's width only jumps where the navigation collapses (around 1276-1443px and
 * 904-959px), and none of these thresholds fall inside those.
 */
const props = defineProps<{ status: LiveVideoStatus; title: string }>()
const emit = defineEmits<{ command: [command: LiveVideoCommand] }>()

// While dragging, the thumb follows the pointer and the seek is sent once on release — not a
// seek per pixel, which would make the real screen stutter through every frame in between.
// Keyboard arrows (no start/end around them) seek straight away.
const scrubTime = ref<number>()
let dragging = false

function onScrubStart() {
  dragging = true
}
function onScrubInput(time: number) {
  if (dragging) scrubTime.value = time
  else emit('command', { type: 'seek', time })
}
function onScrubEnd(time: number) {
  dragging = false
  scrubTime.value = undefined
  emit('command', { type: 'seek', time })
}

function togglePlay() {
  emit('command', { type: props.status.playing ? 'pause' : 'play' })
}

const PLAY_BLOCKED_MESSAGE =
  "The audience window didn't allow the video to play. Click once in the middle of the audience window (the edges change slides), then press Play again."
</script>

<template>
  <div class="video-panel-host">
    <div class="video-panel" role="group" aria-label="Video controls">
      <button
        type="button"
        class="video-button video-button--play"
        :aria-label="status.playing ? 'Pause video' : 'Play video'"
        @click="togglePlay"
      >
        <v-icon :icon="status.playing ? 'mdi-pause' : 'mdi-play'" size="22" />
      </button>
      <button
        type="button"
        class="video-button"
        aria-label="Back to start"
        title="Back to start (paused)"
        @click="emit('command', { type: 'restart' })"
      >
        <v-icon icon="mdi-skip-backward" size="18" />
      </button>
      <div class="video-info">
        <div class="video-heading">
          <span v-if="status.playBlocked" class="video-blocked" :title="PLAY_BLOCKED_MESSAGE">
            <v-icon icon="mdi-alert-outline" size="15" />
            <span class="video-blocked-text">Click the audience window once, then Play</span>
          </span>
          <strong v-else class="video-title">{{ title }}</strong>
          <span class="video-time">
            {{ formatVideoTime(scrubTime ?? status.currentTime) }}
            <span class="video-duration">/ {{ formatVideoTime(status.duration) }}</span>
          </span>
        </div>
        <v-slider
          class="video-seek"
          :model-value="scrubTime ?? status.currentTime"
          :max="status.duration || 1"
          :disabled="!status.duration"
          aria-label="Video position"
          color="primary"
          density="compact"
          hide-details
          :thumb-size="14"
          :track-size="4"
          @start="onScrubStart"
          @update:model-value="onScrubInput"
          @end="onScrubEnd"
        />
      </div>
    </div>
    <!-- The full explanation, for screen readers; sighted operators get the short line above
         with this as its tooltip. -->
    <span v-if="status.playBlocked" class="d-sr-only" role="status">
      {{ PLAY_BLOCKED_MESSAGE }}
    </span>
  </div>
</template>

<style scoped>
.video-panel-host {
  min-width: 0;
}
.video-panel {
  display: flex;
  box-sizing: border-box;
  height: var(--transport-control-height, 64px);
  align-items: center;
  gap: 12px;
  padding: 0 12px 0 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 8px;
}
.video-button {
  display: grid;
  flex: none;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.14);
  border-radius: 50%;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.85);
  cursor: pointer;
}
.video-button--play {
  border-color: transparent;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}
.video-button:focus-visible {
  outline: 2px solid rgba(var(--v-theme-primary), 0.6);
  outline-offset: 2px;
}
.video-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}
.video-heading {
  display: flex;
  min-width: 0;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.video-title {
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), 0.94);
  font-size: 0.875rem;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.video-blocked {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
  overflow: hidden;
  color: rgb(var(--v-theme-warning));
  font-size: 0.8rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.video-time {
  flex: none;
  margin-left: auto;
  color: rgba(var(--v-theme-on-surface), 0.78);
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
}
.video-duration {
  color: rgba(var(--v-theme-on-surface), 0.55);
}
.video-seek {
  flex: none;
  margin: 0;
}
.video-seek :deep(.v-slider-track) {
  cursor: pointer;
}
/* Too narrow for a usable seek bar: position is still shown as time, and seeking stays
   available in the wider layouts. */
@container transport-bar (max-width: 999px) {
  .video-seek {
    display: none;
  }
}
/* The narrow tier (tablet portrait) shares its row with Previous, Next and the toggles; the phone
   tier below it gives this a row of its own again, so the title comes back there. The blocked
   warning keeps its icon, with the explanation as its tooltip. */
@container transport-bar (min-width: 520px) and (max-width: 799px) {
  .video-title,
  .video-blocked-text {
    display: none;
  }
}
</style>
