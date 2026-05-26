import { outerface } from '@johngw/outerface'
import { TimelineItem, type TimelineParsable } from './TimelineItem.js'

/**
 * Represents a dash in a timeline.
 *
 * @remarks
 * A dash signifies nothing happening. However, under the hood,
 * it's a 1ms delay.
 */
@outerface<TimelineParsable<TimelineItemDash>>()
export class TimelineItemDash extends TimelineItem<undefined> {
  constructor() {
    super('-')
  }

  get() {
    return undefined
  }

  override get finished(): boolean {
    return true
  }

  static parse(timeline: string) {
    return timeline.startsWith('-')
      ? ([new TimelineItemDash(), timeline.slice(1)] as const)
      : undefined
  }
}
