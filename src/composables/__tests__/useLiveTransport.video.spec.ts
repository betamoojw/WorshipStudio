import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, nextTick, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { useLiveTransport } from '../useLiveTransport'
import { useSettingsStore } from '@/stores/settings'
import { useThemesStore } from '@/stores/themes'
import type { LiveVideoStatus, RemoteCommand } from '@/adapters/types'
import type { Service } from '@/models/service'

const { getAdapter } = vi.hoisted(() => ({ getAdapter: vi.fn() }))
vi.mock('@/adapters', () => ({ getAdapter }))

/**
 * Operator video controls. A video goes live paused on its first frame and only plays when the
 * operator (or a Full Control phone) says so; the audience output reports back where the video
 * actually is, and that report is what the operator's controls and the phone's mirror show.
 */

function service(): Service {
  return {
    id: 'service-1',
    date: '2026-09-27',
    time: '10:30',
    serviceTypeId: 'type-sunday',
    items: [
      { id: 'item-video', type: 'video', mediaId: 'media-video' },
      { id: 'item-note', type: 'bulletin-note', bulletinLabel: 'Welcome' },
    ],
    assignments: [],
    updatedAt: '2026-09-27T00:00:00.000Z',
    updatedByDevice: 'test',
  } as unknown as Service
}

const flatSlides = [
  {
    key: 'video:0',
    itemIndex: 0,
    itemId: 'item-video',
    itemLabel: 'Announcement Video',
    subLabel: '',
    text: '',
    mediaId: 'media-video',
    mediaKind: 'video',
    mediaFit: 'contain',
  },
  {
    key: 'note:0',
    itemIndex: 1,
    itemId: 'item-note',
    itemLabel: 'Welcome',
    subLabel: '',
    text: '',
  },
]

let live: {
  setLiveContent: ReturnType<typeof vi.fn>
  stopPresenting: ReturnType<typeof vi.fn>
  getPresentationSize: ReturnType<typeof vi.fn>
  sendVideoCommand: ReturnType<typeof vi.fn>
  onVideoStatus: ReturnType<typeof vi.fn>
}
let remote: {
  pushLiveState: ReturnType<typeof vi.fn>
  pushServiceOutline: ReturnType<typeof vi.fn>
  pushServiceOpen: ReturnType<typeof vi.fn>
  onCommand: ReturnType<typeof vi.fn>
}
let reportStatus: (status: LiveVideoStatus) => void
let sendRemoteCommand: (command: RemoteCommand) => void

// Unmounted after each test: each mount adds window keyboard listeners, and a leftover one from
// an earlier test with a video live would answer the next test's key presses.
const mounted: { unmount(): void }[] = []

async function mountTransport(slides: unknown[] = flatSlides, isPresenting = ref(true)) {
  let api: ReturnType<typeof useLiveTransport> | undefined
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useLiveTransport({
          service: ref(service()),
          selectedItemIndex: ref(0),
          flatSlides: computed(() => slides),
          mediaById: computed(() => new Map()),
          mediaUrlById: new Map([['media-video', 'asset://video.mp4']]),
          slidesById: computed(() => new Map()),
          themesStore: useThemesStore(),
          settingsStore: useSettingsStore(),
          isPresenting,
          readiness: computed(() => ({ blockers: [], warnings: [] })),
          readinessDialogOpen: ref(false),
          externalAppProfilesById: computed(() => new Map()),
          tryForwardKeydown: () => false,
          retryExternalApp: async () => {},
          closeExternalApp: async () => {},
          sendManualCommand: async () => {},
        } as unknown as Parameters<typeof useLiveTransport>[0])
        return () => h('div')
      },
    }),
  )
  mounted.push(wrapper)
  await flushPromises()
  return api!
}

describe('useLiveTransport video controls', () => {
  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    live = {
      setLiveContent: vi.fn().mockResolvedValue(undefined),
      stopPresenting: vi.fn().mockResolvedValue(undefined),
      getPresentationSize: vi.fn().mockResolvedValue({ width: 1920, height: 1080 }),
      sendVideoCommand: vi.fn().mockResolvedValue(undefined),
      onVideoStatus: vi.fn(async (callback: (status: LiveVideoStatus) => void) => {
        reportStatus = callback
        return () => {}
      }),
    }
    remote = {
      pushLiveState: vi.fn(),
      pushServiceOutline: vi.fn(),
      pushServiceOpen: vi.fn(),
      onCommand: vi.fn(async (callback: (command: RemoteCommand) => void) => {
        sendRemoteCommand = callback
        return () => {}
      }),
    }
    getAdapter.mockReturnValue({ kind: 'mock', live, remote })
  })

  it('shows a live video as paused at the start until the audience output reports otherwise', async () => {
    const api = await mountTransport()
    expect(api.liveVideo.value).toBeUndefined()

    api.goLive(0)
    expect(api.liveVideo.value).toEqual({
      mediaId: 'media-video',
      playing: false,
      currentTime: 0,
      duration: 0,
    })

    reportStatus({ mediaId: 'media-video', playing: true, currentTime: 12, duration: 90 })
    expect(api.liveVideo.value?.playing).toBe(true)
    expect(api.liveVideo.value?.currentTime).toBe(12)
  })

  it('toggles between play and pause based on the reported state', async () => {
    const api = await mountTransport()
    api.goLive(0)

    api.toggleVideoPlayback()
    expect(live.sendVideoCommand).toHaveBeenLastCalledWith({ type: 'play' })

    reportStatus({ mediaId: 'media-video', playing: true, currentTime: 3, duration: 90 })
    api.toggleVideoPlayback()
    expect(live.sendVideoCommand).toHaveBeenLastCalledWith({ type: 'pause' })
  })

  it('ignores a late report from a video that is no longer live', async () => {
    const api = await mountTransport()
    api.goLive(0)
    reportStatus({ mediaId: 'some-other-video', playing: true, currentTime: 40, duration: 90 })
    expect(api.liveVideo.value?.playing).toBe(false)
    expect(api.liveVideo.value?.currentTime).toBe(0)
  })

  it('has no video controls, and sends nothing, once a non-video slide is live', async () => {
    const api = await mountTransport()
    api.goLive(1)
    expect(api.liveVideo.value).toBeUndefined()

    api.sendVideoCommand({ type: 'play' })
    expect(live.sendVideoCommand).not.toHaveBeenCalled()
  })

  it('takes Play/Pause and Back to Start from the phone remote', async () => {
    const api = await mountTransport()
    api.goLive(0)

    sendRemoteCommand({ action: 'video-toggle-play' })
    expect(live.sendVideoCommand).toHaveBeenLastCalledWith({ type: 'play' })

    sendRemoteCommand({ action: 'video-restart' })
    expect(live.sendVideoCommand).toHaveBeenLastCalledWith({ type: 'restart' })
  })

  it('mirrors the reported play state to the phone', async () => {
    const api = await mountTransport()
    api.goLive(0)
    await nextTick()

    reportStatus({ mediaId: 'media-video', playing: true, currentTime: 5, duration: 90 })
    await nextTick()
    expect(remote.pushLiveState).toHaveBeenLastCalledWith(
      expect.objectContaining({ video: { playing: true, currentTime: 5, duration: 90 } }),
    )
    expect(api.liveVideo.value?.playing).toBe(true)
  })

  it('picks a video back up where it was after the screen is blanked and restored', async () => {
    const api = await mountTransport()
    api.goLive(0)
    await nextTick()
    reportStatus({ mediaId: 'media-video', playing: true, currentTime: 37, duration: 90 })

    api.toggleBlankScreen()
    await nextTick()
    // The old element can still report during its fade-out — that must not count as "restored".
    reportStatus({ mediaId: 'media-video', playing: true, currentTime: 37.2, duration: 90 })
    expect(live.sendVideoCommand).not.toHaveBeenCalled()

    api.toggleBlankScreen()
    await nextTick()
    // The fresh element's first report before its metadata is in can't be seeked yet.
    reportStatus({ mediaId: 'media-video', playing: false, currentTime: 0, duration: 0 })
    expect(live.sendVideoCommand).not.toHaveBeenCalled()

    reportStatus({ mediaId: 'media-video', playing: false, currentTime: 0, duration: 90 })
    expect(live.sendVideoCommand.mock.calls).toEqual([
      [{ type: 'seek', time: 37 }],
      [{ type: 'play' }],
    ])

    // Only once — later reports are just the video playing on.
    reportStatus({ mediaId: 'media-video', playing: true, currentTime: 38, duration: 90 })
    expect(live.sendVideoCommand).toHaveBeenCalledTimes(2)
  })

  it('leaves a video that was paused before blanking paused after restoring', async () => {
    const api = await mountTransport()
    api.goLive(0)
    await nextTick()
    reportStatus({ mediaId: 'media-video', playing: false, currentTime: 12, duration: 90 })

    api.toggleBlankScreen()
    await nextTick()
    api.toggleBlankScreen()
    await nextTick()
    reportStatus({ mediaId: 'media-video', playing: false, currentTime: 0, duration: 90 })
    expect(live.sendVideoCommand.mock.calls).toEqual([[{ type: 'seek', time: 12 }]])
  })

  it('brings a video back paused where it was after moving live away and back', async () => {
    const api = await mountTransport()
    api.goLive(0)
    await nextTick()
    reportStatus({ mediaId: 'media-video', playing: true, currentTime: 37, duration: 90 })

    // An accidental Next, then straight back.
    await api.next()
    await nextTick()
    await api.previous()
    await nextTick()
    reportStatus({ mediaId: 'media-video', playing: false, currentTime: 0, duration: 90 })

    // Its place, but not playing: returning is a move, and videos never start by themselves.
    expect(live.sendVideoCommand.mock.calls).toEqual([[{ type: 'seek', time: 37 }]])
  })

  it('brings a video back paused when moving live away from a blank screen', async () => {
    const api = await mountTransport()
    api.goLive(0)
    await nextTick()
    reportStatus({ mediaId: 'media-video', playing: true, currentTime: 37, duration: 90 })

    // Blank Screen alone would resume it playing — moving live afterwards makes it a move.
    api.toggleBlankScreen()
    await nextTick()
    api.goLive(1)
    await nextTick()
    api.goLive(0)
    await nextTick()
    reportStatus({ mediaId: 'media-video', playing: false, currentTime: 0, duration: 90 })
    expect(live.sendVideoCommand.mock.calls).toEqual([[{ type: 'seek', time: 37 }]])
  })

  it('starts a video over that had finished before moving away', async () => {
    const api = await mountTransport()
    api.goLive(0)
    await nextTick()
    reportStatus({ mediaId: 'media-video', playing: false, currentTime: 90, duration: 90 })

    await api.next()
    await nextTick()
    await api.previous()
    await nextTick()
    reportStatus({ mediaId: 'media-video', playing: false, currentTime: 0, duration: 90 })
    expect(live.sendVideoCommand).not.toHaveBeenCalled()
  })

  it('keeps the place of a video passed through before it loaded far enough to restore', async () => {
    const api = await mountTransport()
    api.goLive(0)
    await nextTick()
    reportStatus({ mediaId: 'media-video', playing: true, currentTime: 37, duration: 90 })
    await api.next()
    await nextTick()

    // Back on it, but moved off again before its metadata arrived — the fresh element's zero
    // must not replace the place it was waiting to restore.
    await api.previous()
    await nextTick()
    reportStatus({ mediaId: 'media-video', playing: false, currentTime: 0, duration: 0 })
    await api.next()
    await nextTick()
    await api.previous()
    await nextTick()
    reportStatus({ mediaId: 'media-video', playing: false, currentTime: 0, duration: 90 })
    expect(live.sendVideoCommand.mock.calls).toEqual([[{ type: 'seek', time: 37 }]])
  })

  it('forgets every place when presenting stops', async () => {
    const isPresenting = ref(true)
    const api = await mountTransport(flatSlides, isPresenting)
    api.goLive(0)
    await nextTick()
    reportStatus({ mediaId: 'media-video', playing: true, currentTime: 37, duration: 90 })
    await api.next()
    await nextTick()

    await api.togglePresenting()
    await nextTick()
    isPresenting.value = true
    await api.previous()
    await nextTick()
    reportStatus({ mediaId: 'media-video', playing: false, currentTime: 0, duration: 90 })
    expect(live.sendVideoCommand).not.toHaveBeenCalled()
  })

  describe('Background Only on a video', () => {
    // An advanced slide carries its own background (no theme needed), which makes it the
    // simplest slide with a background to build here.
    function advancedSlide(key: string, itemIndex: number, color: string) {
      return {
        key,
        itemIndex,
        itemId: `item-${key}`,
        itemLabel: `Slide ${key}`,
        subLabel: '',
        text: '',
        scene: { background: { type: 'color', color }, elements: [] },
      }
    }
    const note = (key: string, itemIndex: number) => ({
      key,
      itemIndex,
      itemId: `item-${key}`,
      itemLabel: 'Note',
      subLabel: '',
      text: '',
    })
    const video = (key: string, itemIndex: number) => ({ ...flatSlides[0], key, itemIndex })

    it('shows the background of the nearest earlier slide that has one', async () => {
      // The slide just before is a note with no background — it looks past it.
      const api = await mountTransport([
        advancedSlide('far', 0, '#112233'),
        note('near', 1),
        video('video', 2),
        advancedSlide('after', 3, '#445566'),
      ])
      api.goLive(2)
      api.toggleBackgroundOnly()

      const payload = api.liveContentPayload.value
      expect(payload?.media).toBeUndefined()
      expect(payload?.backgroundOnly).toBe(true)
      expect(payload?.scene?.background).toEqual({ type: 'color', color: '#112233' })
    })

    it('falls back to the nearest later slide when nothing earlier has a background', async () => {
      const api = await mountTransport([
        note('before', 0),
        video('video', 1),
        note('next', 2),
        advancedSlide('later', 3, '#445566'),
      ])
      api.goLive(1)
      api.toggleBackgroundOnly()
      expect(api.liveContentPayload.value?.scene?.background).toEqual({
        type: 'color',
        color: '#445566',
      })
    })

    it('goes black when nothing in the service has a background', async () => {
      const api = await mountTransport([note('before', 0), video('video', 1)])
      api.goLive(1)
      api.toggleBackgroundOnly()
      const payload = api.liveContentPayload.value
      expect(payload?.backgroundOnly).toBe(true)
      expect(payload?.media).toBeUndefined()
      expect(payload?.scene).toBeUndefined()
      expect(payload?.presentationTheme).toBeUndefined()
    })

    it('picks the video back up where it was when Background Only turns off', async () => {
      const api = await mountTransport([advancedSlide('before', 0, '#112233'), video('video', 1)])
      api.goLive(1)
      await nextTick()
      reportStatus({ mediaId: 'media-video', playing: true, currentTime: 21, duration: 90 })

      api.toggleBackgroundOnly()
      await nextTick()
      expect(api.liveVideo.value).toBeUndefined()

      api.toggleBackgroundOnly()
      await nextTick()
      reportStatus({ mediaId: 'media-video', playing: false, currentTime: 0, duration: 90 })
      expect(live.sendVideoCommand.mock.calls).toEqual([
        [{ type: 'seek', time: 21 }],
        [{ type: 'play' }],
      ])
    })

    it('keeps the place Background Only saved if the screen is then blanked', async () => {
      const api = await mountTransport([advancedSlide('before', 0, '#112233'), video('video', 1)])
      api.goLive(1)
      await nextTick()
      reportStatus({ mediaId: 'media-video', playing: false, currentTime: 55, duration: 90 })

      // A tick between each, as separate key presses always are.
      api.toggleBackgroundOnly()
      await nextTick()
      api.toggleBlankScreen()
      await nextTick()
      api.toggleBlankScreen()
      await nextTick()
      reportStatus({ mediaId: 'media-video', playing: false, currentTime: 0, duration: 90 })
      expect(live.sendVideoCommand.mock.calls).toEqual([[{ type: 'seek', time: 55 }]])
    })
  })

  describe('Space', () => {
    function press(key: string, init: KeyboardEventInit = {}) {
      const down = new KeyboardEvent('keydown', { key, cancelable: true, ...init })
      window.dispatchEvent(down)
      const up = new KeyboardEvent('keyup', { key, cancelable: true })
      window.dispatchEvent(up)
      return { down, up }
    }

    it('plays and pauses the live video, and keeps a focused button from also firing', async () => {
      const api = await mountTransport()
      api.goLive(0)

      const { down, up } = press(' ')
      expect(live.sendVideoCommand).toHaveBeenLastCalledWith({ type: 'play' })
      expect(down.defaultPrevented).toBe(true)
      expect(up.defaultPrevented).toBe(true)

      reportStatus({ mediaId: 'media-video', playing: true, currentTime: 1, duration: 90 })
      press(' ')
      expect(live.sendVideoCommand).toHaveBeenLastCalledWith({ type: 'pause' })
    })

    it('ignores key repeat from holding Space down', async () => {
      const api = await mountTransport()
      api.goLive(0)
      press(' ', { repeat: true })
      expect(live.sendVideoCommand).not.toHaveBeenCalled()
    })

    it('leaves Space alone when no video is live', async () => {
      const api = await mountTransport()
      api.goLive(1)
      const { down, up } = press(' ')
      expect(down.defaultPrevented).toBe(false)
      expect(up.defaultPrevented).toBe(false)
    })
  })
})
