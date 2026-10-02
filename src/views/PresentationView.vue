<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event'
import SlideContentRenderer from '@/components/live/SlideContentRenderer.vue'
import type { LiveSlideContent, LiveVideoCommand, LiveVideoStatus } from '@/adapters/types'

/**
 * The audience-facing window (see src/adapters/tauri/index.ts's `live` port) — never routed
 * to normally, only ever rendered when App.vue detects it's running in the "presentation"
 * Tauri window. No app-bar, no Vuetify: just the current slide, full-bleed, via the shared
 * SlideContentRenderer (also used by the operator's Previous/Current/Next preview thumbnails
 * in ServiceWorkspaceView).
 */
const current = ref<LiveSlideContent>()
const rendererRef = ref<InstanceType<typeof SlideContentRenderer>>()
let unlisten: UnlistenFn | undefined
let unlistenVideoCommand: UnlistenFn | undefined

// The operator's video transport controls land here and go straight to the renderer, which owns
// the real <video>; where it actually is goes back the same way (see the Tauri adapter's
// sendVideoCommand/onVideoStatus).
function reportVideoStatus(status: LiveVideoStatus) {
  void emit('live:video-status', status)
}

onMounted(async () => {
  unlisten = await listen<LiveSlideContent | null>('live:slide-changed', (event) => {
    current.value = event.payload ?? undefined
  })
  unlistenVideoCommand = await listen<LiveVideoCommand>('live:video-command', (event) => {
    rendererRef.value?.controlVideo(event.payload)
  })
  // Tells the operator window's adapter this window is actually listening now, so it can
  // (re)send the current slide — see the matching comment in openPresentationWindow().
  await emit('presentation:ready')
})
onUnmounted(() => {
  unlisten?.()
  unlistenVideoCommand?.()
})
</script>

<template>
  <SlideContentRenderer
    ref="rendererRef"
    :content="current"
    transition
    @video-status="reportVideoStatus"
  />
</template>
