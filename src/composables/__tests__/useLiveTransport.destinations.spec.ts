import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { useLiveTransport } from '../useLiveTransport'
import { useSettingsStore } from '@/stores/settings'
import { useThemesStore } from '@/stores/themes'

const { getAdapter } = vi.hoisted(() => ({ getAdapter: vi.fn() }))
vi.mock('@/adapters', () => ({ getAdapter }))

/**
 * What the transport bar's Previous and Next say. Within the live item only the part that differs
 * ("Verse 3") — the item's own name is already the live label beside them, and repeating it is
 * what cut them off. Crossing into another item names that item and says it's a new one, since
 * that press leaves the song on screen.
 */

const flatSlides = [
  {
    key: 's:1',
    itemIndex: 0,
    itemId: 'song',
    itemLabel: 'Great Is Thy Faithfulness',
    subLabel: 'Verse 1',
    text: '',
  },
  {
    key: 's:2',
    itemIndex: 0,
    itemId: 'song',
    itemLabel: 'Great Is Thy Faithfulness',
    subLabel: 'Chorus',
    text: '',
  },
  {
    key: 'v:0',
    itemIndex: 1,
    itemId: 'video',
    itemLabel: 'Announcement Video',
    subLabel: '',
    text: '',
  },
  { key: 'r:0', itemIndex: 2, itemId: 'rom', itemLabel: 'Romans 8:28', subLabel: 'ESV', text: '' },
]

function mountTransport() {
  let api: ReturnType<typeof useLiveTransport> | undefined
  mount(
    defineComponent({
      setup() {
        api = useLiveTransport({
          service: ref({ id: 's', items: [{}, {}, {}] }),
          selectedItemIndex: ref(0),
          flatSlides: computed(() => flatSlides),
          mediaById: computed(() => new Map()),
          mediaUrlById: new Map(),
          slidesById: computed(() => new Map()),
          themesStore: useThemesStore(),
          settingsStore: useSettingsStore(),
          isPresenting: ref(false),
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
  return api!
}

// One sermon item holding two passages: Romans 8:28–35 over two pages, then John 3:16.
const sermonSlides = [
  {
    key: 'p:0',
    itemIndex: 0,
    itemId: 'sermon',
    itemLabel: 'Romans 8:28-35',
    subLabel: 'ESV',
    verseRange: '8:28–30',
    passagePart: '28–30',
    verseBook: 'Romans',
    text: '',
  },
  {
    key: 'p:1',
    itemIndex: 0,
    itemId: 'sermon',
    itemLabel: 'Romans 8:28-35',
    subLabel: 'ESV',
    verseRange: '8:31–35',
    passagePart: '31–35',
    verseBook: 'Romans',
    text: '',
  },
  {
    key: 'p:2',
    itemIndex: 0,
    itemId: 'sermon',
    itemLabel: 'John 3:16',
    subLabel: 'ESV',
    verseRange: '3:16',
    verseBook: 'John',
    text: '',
  },
]

function mountScripture() {
  let api: ReturnType<typeof useLiveTransport> | undefined
  mount(
    defineComponent({
      setup() {
        api = useLiveTransport({
          service: ref({ id: 's', items: [{}] }),
          selectedItemIndex: ref(0),
          flatSlides: computed(() => sermonSlides),
          mediaById: computed(() => new Map()),
          mediaUrlById: new Map(),
          slidesById: computed(() => new Map()),
          themesStore: useThemesStore(),
          settingsStore: useSettingsStore(),
          isPresenting: ref(false),
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
  return api!
}

describe('useLiveTransport destinations', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getAdapter.mockReturnValue({
      kind: 'mock',
      live: {
        setLiveContent: vi.fn().mockResolvedValue(undefined),
        stopPresenting: vi.fn().mockResolvedValue(undefined),
        getPresentationSize: vi.fn().mockResolvedValue(undefined),
        sendVideoCommand: vi.fn().mockResolvedValue(undefined),
        onVideoStatus: vi.fn().mockResolvedValue(() => {}),
      },
    })
  })

  it('names only the part when staying within the live item', () => {
    const api = mountTransport()
    api.goLive(1)
    expect(api.previousDestination.value).toEqual({ label: 'Verse 1', newItem: false })
  })

  it('names the item, and says so, when the move leaves the live item', () => {
    const api = mountTransport()
    api.goLive(1)
    expect(api.nextDestination.value).toEqual({ label: 'Announcement Video', newItem: true })

    api.goLive(2)
    expect(api.previousDestination.value).toEqual({
      label: 'Great Is Thy Faithfulness',
      newItem: true,
    })
    expect(api.nextDestination.value).toEqual({ label: 'Romans 8:28', newItem: true })
  })

  it('names the ends of the service when there is nowhere to go', () => {
    const api = mountTransport()
    api.goLive(0)
    expect(api.previousDestination.value).toEqual({ label: 'Beginning of service', newItem: false })
    api.goLive(3)
    expect(api.nextDestination.value).toEqual({ label: 'End of service', newItem: false })
  })

  it('names a scripture page by its chapter and verses, with the book for where there is room', () => {
    const api = mountScripture()
    api.goLive(0)
    expect(api.nextDestination.value).toEqual({
      label: '8:31–35',
      prefix: 'Romans',
      newItem: false,
    })
    // The live label keeps the whole passage, with this page's verses after it.
    expect(api.currentSlideLabel.value).toBe('Romans 8:28-35 (28–30)')
  })

  it('keeps the book when moving to a different passage within the same sermon', () => {
    const api = mountScripture()
    api.goLive(1)
    expect(api.nextDestination.value).toEqual({ label: 'John 3:16', newItem: false })
  })

  it('labels a slide with no part of its own without a dangling dash', () => {
    const api = mountTransport()
    api.goLive(2)
    expect(api.currentSlideLabel.value).toBe('Announcement Video')
    api.goLive(3)
    expect(api.currentSlideLabel.value).toBe('Romans 8:28 — ESV')
  })
})
