import { outerface } from '@johngw/outerface'
import { TimelineItem, type TimelineParsable } from './TimelineItem.js'

/**
 * A timeline item that should never be reached.
 *
 * @remarks
 * Represented by the `X` character.
 */
@outerface<TimelineParsable<TimelineItemNeverReach>>()
export class TimelineItemNeverReach extends TimelineItem<NeverReachTimelineError> {
  #error: NeverReachTimelineError

  constructor() {
    super('X')
    this.#error = new NeverReachTimelineError()
  }

  get() {
    return this.#error
  }

  override get finished(): boolean {
    return true
  }

  static readonly #regexp = this.createItemRegExp(/X/)

  static parse(timeline: string) {
    return this.#regexp.test(timeline)
      ? ([new TimelineItemNeverReach(), timeline.slice(1)] as const)
      : undefined
  }
}

/**
 * An error to represent that the stream requires terminating.
 */
export class NeverReachTimelineError extends Error {
  constructor() {
    super('The stream was expected to have closed by now')
  }
}
