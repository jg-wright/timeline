import { outerface } from '@johngw/outerface'
import {
  TimelineItem,
  type TimelineItemOptions,
  type TimelineParsable,
} from './TimelineItem.js'

/**
 * Represents a dash in a timeline.
 *
 * @remarks
 * A dash signifies nothing happening. Under the hood it advances the
 * timeline's virtual {@link Clock} by a single frame.
 */
@outerface<TimelineParsable<TimelineItemDash>>()
export class TimelineItemDash extends TimelineItem<undefined> {
  constructor(options: TimelineItemOptions) {
    super('-', options)
  }

  get() {
    return undefined
  }

  override get finished(): boolean {
    return true
  }

  static parse(timeline: string, options: TimelineItemOptions) {
    return timeline.startsWith('-')
      ? ([new TimelineItemDash(options), timeline.slice(1)] as const)
      : undefined
  }
}
