import { outerface } from '@johngw/outerface'
import {
  type TimelineItemOptions,
  type TimelineParsable,
  TimelineItem,
} from './TimelineItem.js'

/**
 * Represents an error in the timeline.
 *
 * @remarks
 * Represented by an `E` character.
 */
@outerface<TimelineParsable<TimelineItemError>>()
export class TimelineItemError extends TimelineItem<TimelineError> {
  #error: TimelineError

  constructor(message: string | undefined, options: TimelineItemOptions) {
    super(message === undefined ? 'E' : `E(${message})`, options)
    this.#error = new TimelineError(message)
  }

  get() {
    return this.#error
  }

  static readonly #regexp = this.createItemRegExp(/(E(?:\(([^)]*)\))?)/)

  static parse(timeline: string, options: TimelineItemOptions) {
    const result = this.#regexp.exec(timeline)
    return result
      ? ([
          new TimelineItemError(result[2], options),
          timeline.slice(result[1]!.length),
        ] as const)
      : undefined
  }
}

/**
 * Base TimelineError.
 *
 * @group Utils
 * @category Timeline
 */
export class TimelineError extends Error {
  constructor(message?: string) {
    super(message || 'Timeline Error')
  }
}
