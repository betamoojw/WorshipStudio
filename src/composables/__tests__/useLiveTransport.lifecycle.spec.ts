import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { useLiveTransport } from '../useLiveTransport'
import { useSettingsStore } from '@/stores/settings'
import { useThemesStore } from '@/stores/themes'

const { getAdapter } = vi.hoisted(() => ({ getAdapter: vi.fn() }))
vi.mock('@/adapters', () => ({ getAdapter }))

/**
 * Starting and stopping from the phone remote. Each phone Start/Stop once ran twice: a hot reload
 * mid-mount left a remote-command listener behind from a workspace that had already unmounted,
 * and the two Starts raced for one presentation window until both failed. A double tap on the
 * phone reaches the same race.
 */

const flatSlides = [
  { key: 'a:0', itemIndex: 0, itemId: 'item-a', itemLabel: 'Welcome', subLabel: '', text: '' },
]

function mountTransport(isPresenting = ref(false)) {
  let api: ReturnType<typeof useLiveTransport> | undefined
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useLiveTransport({
          service: ref({ id: 's', items: [{ id: 'item-a', type: 'bulletin-note' }] }),
          selectedItemIndex: ref(0),
          flatSlides: computed(() => flatSlides),
          mediaById: computed(() => new Map()),
          mediaUrlById: new Map(),
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
  return { api: () => api!, wrapper }
}

let live: Record<string, ReturnType<typeof vi.fn>>
let onCommand: ReturnType<typeof vi.fn>

describe('useLiveTransport presenting lifecycle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    live = {
      startPresenting: vi.fn().mockResolvedValue(undefined),
      stopPresenting: vi.fn().mockResolvedValue(undefined),
      setLiveContent: vi.fn().mockResolvedValue(undefined),
      getPresentationSize: vi.fn().mockResolvedValue({ width: 1920, height: 1080 }),
      sendVideoCommand: vi.fn().mockResolvedValue(undefined),
      onVideoStatus: vi.fn().mockResolvedValue(() => {}),
    }
    onCommand = vi.fn().mockResolvedValue(() => {})
    getAdapter.mockReturnValue({
      kind: 'mock',
      live,
      remote: {
        onCommand,
        pushLiveState: vi.fn(),
        pushServiceOutline: vi.fn(),
        pushServiceOpen: vi.fn(),
      },
    })
  })

  it('starts once when a second toggle arrives while the first is still starting', async () => {
    const { api } = mountTransport()
    await flushPromises()

    const first = api().togglePresenting()
    const second = api().togglePresenting()
    await Promise.all([first, second])

    expect(live.startPresenting).toHaveBeenCalledTimes(1)
  })

  it('takes a toggle again once the previous change has finished', async () => {
    const { api } = mountTransport()
    await flushPromises()

    await api().togglePresenting()
    await api().togglePresenting()
    expect(live.startPresenting).toHaveBeenCalledTimes(1)
    expect(live.stopPresenting).toHaveBeenCalledTimes(1)
  })

  it('removes a remote-command listener that only resolves after the workspace unmounted', async () => {
    let resolveSubscription: (unlisten: () => void) => void = () => {}
    onCommand.mockReturnValue(new Promise((resolve) => (resolveSubscription = resolve)))
    const unlisten = vi.fn()

    const { wrapper } = mountTransport()
    await flushPromises()
    wrapper.unmount()
    resolveSubscription(unlisten)
    await flushPromises()

    expect(unlisten).toHaveBeenCalledTimes(1)
  })
})
