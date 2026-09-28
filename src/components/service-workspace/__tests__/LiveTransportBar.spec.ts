import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import LiveTransportBar from '../LiveTransportBar.vue'

const vuetify = createVuetify()

function mountBar(props: Partial<InstanceType<typeof LiveTransportBar>['$props']> = {}) {
  return mount(LiveTransportBar, {
    global: { plugins: [vuetify] },
    props: {
      previousDisabled: false,
      nextDisabled: false,
      previous: { label: 'Verse 2', newItem: false },
      next: { label: 'Verse 3', newItem: false },
      isPresenting: true,
      currentSlideLabel: 'Great Is Thy Faithfulness — Chorus',
      liveContextSnippet: '"Great is Thy faithfulness, O God my Father"',
      backgroundOnly: false,
      backgroundOnlyDisabled: false,
      isBlankScreen: false,
      ...props,
    },
  })
}

describe('LiveTransportBar', () => {
  it('marks live with the bar itself, not a chip', () => {
    const live = mountBar()
    expect(live.classes()).toContain('transport-bar--live')
    expect(live.text()).not.toMatch(/\bLIVE\b/)

    const preview = mountBar({ isPresenting: false })
    expect(preview.classes()).not.toContain('transport-bar--live')
    expect(preview.find('.d-sr-only').text()).toBe('Preview, not presenting')
  })

  it('says when Previous or Next leaves the live item', () => {
    const within = mountBar()
    expect(within.find('.transport-destination--next').text()).toContain('Next')
    expect(within.find('.transport-destination--next').text()).not.toContain('Next item')

    const crossing = mountBar({
      next: { label: 'Romans 8:28', newItem: true },
      previous: { label: 'Great Is Thy Faithfulness', newItem: true },
    })
    expect(crossing.find('.transport-destination--next').text()).toContain('Next item')
    expect(crossing.find('.transport-destination--next').attributes('aria-label')).toBe(
      'Next item: Romans 8:28',
    )
    expect(crossing.find('.transport-destination--previous').text()).toContain('Previous item')
  })

  it('shows the live slide normally, and the video controls while a video is live', () => {
    const song = mountBar()
    expect(song.find('.current-slide-copy').text()).toContain('Great Is Thy Faithfulness — Chorus')
    expect(song.find('.video-panel').exists()).toBe(false)

    const video = mountBar({
      liveVideo: { mediaId: 'm', playing: true, currentTime: 83, duration: 222 },
      liveVideoTitle: 'Announcement Video',
    })
    expect(video.find('.current-slide-copy').exists()).toBe(false)
    expect(video.find('.video-panel').text()).toContain('Announcement Video')
    expect(video.find('.video-panel').text()).toContain('1:23')
    expect(video.find('[aria-label="Pause video"]').exists()).toBe(true)
  })

  it('relays the video controls and the overrides', async () => {
    const bar = mountBar({
      liveVideo: { mediaId: 'm', playing: false, currentTime: 0, duration: 222 },
      liveVideoTitle: 'Announcement Video',
    })
    await bar.find('[aria-label="Play video"]').trigger('click')
    await bar.find('[aria-label="Back to start"]').trigger('click')
    expect(bar.emitted('video-command')).toEqual([[{ type: 'play' }], [{ type: 'restart' }]])

    await bar.find('[aria-label="Background Only"]').trigger('click')
    await bar.find('[aria-label="Blank Screen"]').trigger('click')
    expect(bar.emitted('toggle-background-only')).toHaveLength(1)
    expect(bar.emitted('toggle-blank-screen')).toHaveLength(1)
  })

  it('shows an override that is on as pressed', () => {
    const bar = mountBar({ backgroundOnly: true, isBlankScreen: true })
    expect(bar.find('[aria-label="Background Only"]').attributes('aria-pressed')).toBe('true')
    expect(bar.find('[aria-label="Restore Screen"]').attributes('aria-pressed')).toBe('true')
  })
})
