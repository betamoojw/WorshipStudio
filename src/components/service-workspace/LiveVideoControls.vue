<script setup lang="ts">
import { ref } from 'vue'
import type { LiveVideoCommand, LiveVideoStatus } from '@/adapters/types'
import { formatVideoTime } from '@/utils/videoTime'

/**
 * Operator transport for the live video, under the Current preview (ServiceWorkspaceView). A
 * video goes live paused on its first frame (see SlideContentRenderer.vue) and plays only when
 * started here or from the phone remote. `status` is the audience output's own report of where
 * the video is, so this always shows the real screen rather than a guess.
 */
const props = defineProps<{ status: LiveVideoStatus }>()
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
</script>

<template>
  <div class="live-video-controls">
    <div class="d-flex align-center ga-1">
      <v-btn
        :icon="status.playing ? 'mdi-pause' : 'mdi-play'"
        :aria-label="status.playing ? 'Pause video' : 'Play video'"
        color="primary"
        variant="flat"
        size="small"
        @click="togglePlay"
      />
      <v-btn
        icon="mdi-skip-backward"
        aria-label="Back to start"
        title="Back to start (paused)"
        variant="text"
        size="small"
        @click="emit('command', { type: 'restart' })"
      />
      <v-slider
        :model-value="scrubTime ?? status.currentTime"
        :max="status.duration || 1"
        :disabled="!status.duration"
        aria-label="Video position"
        color="primary"
        density="compact"
        hide-details
        class="mx-1"
        @start="onScrubStart"
        @update:model-value="onScrubInput"
        @end="onScrubEnd"
      />
      <span class="video-time">
        {{ formatVideoTime(scrubTime ?? status.currentTime) }} /
        {{ formatVideoTime(status.duration) }}
      </span>
    </div>
    <v-alert
      v-if="status.playBlocked"
      type="warning"
      variant="tonal"
      density="compact"
      class="mt-2 text-body-2"
    >
      The audience window didn't allow the video to play. Click once in the middle of the audience
      window (the edges change slides), then press Play again.
    </v-alert>
  </div>
</template>

<style scoped>
.live-video-controls {
  margin-top: 10px;
}
.video-time {
  flex-shrink: 0;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}
</style>
