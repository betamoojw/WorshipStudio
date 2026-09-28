import { beforeAll, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import SlideContentRenderer from '@/components/live/SlideContentRenderer.vue'
import type { LiveSlideContent, LiveVideoStatus } from '@/adapters/types'

/**
 * A Media/Video item's video is operator-driven: it goes live paused on its first frame with no
 * native controls on the audience screen, and moves only on `controlVideo` — the operator's own
 * transport, relayed by the presentation window. A theme's looping background video is a
 * different thing and still autoplays.
 */

function videoContent(): LiveSlideContent {
  return {
    itemLabel: 'Announcement Video',
    subLabel: '',
    text: '',
    media: { url: 'asset://video.mp4', mediaId: 'media-video', kind: 'video', fit: 'contain' },
  }
}

function mountVideo() {
  const wrapper = mount(SlideContentRenderer, { props: { content: videoContent() } })
  const video = wrapper.find('video.media-fill').element as HTMLVideoElement
  return { wrapper, video }
}

describe('SlideContentRenderer foreground video', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    if (!document.fonts) {
      Object.defineProperty(document, 'fonts', {
        configurable: true,
        value: { addEventListener() {}, removeEventListener() {} },
      })
    }
  })

  it('neither autoplays nor shows native controls', () => {
    const { video } = mountVideo()
    expect(video.autoplay).toBe(false)
    expect(video.controls).toBe(false)
  })

  it('still autoplays a theme background video', () => {
    const wrapper = mount(SlideContentRenderer, {
      props: {
        content: {
          itemLabel: 'Song',
          subLabel: 'Verse 1',
          text: 'Words',
          presentationTheme: {
            fontFamily: 'sans-serif',
            textColor: '#fff',
            textEffect: { type: 'none', color: '#000', size: 0 },
            backgroundColor: '#000',
            backgroundMedia: {
              url: 'asset://loop.mp4',
              mediaId: 'media-loop',
              kind: 'video',
              fit: 'cover',
            },
          },
        },
      },
    })
    expect((wrapper.find('video.theme-background').element as HTMLVideoElement).autoplay).toBe(true)
  })

  it('plays, pauses, seeks and cues back to the start on command', async () => {
    const { wrapper, video } = mountVideo()
    const play = vi.spyOn(video, 'play').mockResolvedValue(undefined)
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => {})
    const api = wrapper.vm as unknown as InstanceType<typeof SlideContentRenderer>

    api.controlVideo({ type: 'play' })
    expect(play).toHaveBeenCalledTimes(1)

    api.controlVideo({ type: 'seek', time: 42 })
    expect(video.currentTime).toBe(42)

    api.controlVideo({ type: 'restart' })
    expect(pause).toHaveBeenCalled()
    expect(video.currentTime).toBe(0)

    api.controlVideo({ type: 'pause' })
    expect(pause).toHaveBeenCalledTimes(2)
  })

  it('hides a media image under Background Only', async () => {
    const image: LiveSlideContent = {
      itemLabel: 'Welcome',
      subLabel: '',
      text: '',
      media: { url: 'asset://welcome.png', mediaId: 'media-image', kind: 'image', fit: 'contain' },
    }
    const wrapper = mount(SlideContentRenderer, { props: { content: image } })
    expect(wrapper.find('img.media-fill').exists()).toBe(true)
    await wrapper.setProps({ content: { ...image, backgroundOnly: true } })
    expect(wrapper.find('img.media-fill').exists()).toBe(false)
  })

  it('hides a video under Background Only', async () => {
    const wrapper = mount(SlideContentRenderer, { props: { content: videoContent() } })
    await wrapper.setProps({ content: { ...videoContent(), backgroundOnly: true } })
    expect(wrapper.find('video.media-fill').exists()).toBe(false)
  })

  it('reports when the browser refuses to start playback', async () => {
    const { wrapper, video } = mountVideo()
    vi.spyOn(video, 'play').mockRejectedValue(new DOMException('blocked', 'NotAllowedError'))
    const api = wrapper.vm as unknown as InstanceType<typeof SlideContentRenderer>

    api.controlVideo({ type: 'play' })
    await flushPromises()

    const statuses = wrapper.emitted('video-status') as [LiveVideoStatus][]
    expect(statuses.at(-1)?.[0]).toMatchObject({ mediaId: 'media-video', playBlocked: true })
  })
})
