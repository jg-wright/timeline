import { outerface } from '@johngw/outerface'
import {
  type TimelineItemOptions,
  type TimelineParsable,
  TimelineItem,
} from './TimelineItem.js'

/**
 * A symbol to represent closing a timeline.
 */
export const CloseTimeline = Symbol.for('@johngw/timeline close timeline')

/**
 * @inheritDoc
 */
export type CloseTimeline = typeof CloseTimeline

/**
 * A timeline item that'll close the stream.
 *
 * @remarks
 * This expects the string representation `|`.
 */
@outerface<TimelineParsable<TimelineItemClose>>()
export class TimelineItemClose extends TimelineItem<CloseTimeline> {
  constructor(options?: TimelineItemOptions) {
    super('|', options)
  }

  get(): CloseTimeline {
    return CloseTimeline
  }

  override get finished(): boolean {
    return true
  }

  static readonly #regexp = this.createItemRegExp(/\|/)

  static parse(timeline: string, options?: TimelineItemOptions) {
    return this.#regexp.test(timeline)
      ? ([new TimelineItemClose(options), timeline.slice(1)] as const)
      : undefined
  }
}
