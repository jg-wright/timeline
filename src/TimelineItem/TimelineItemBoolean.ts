import { outerface } from '@johngw/outerface'
import { type TimelineParsable, TimelineItem } from './TimelineItem.js'

/**
 * Represents the shorthand for a boolean value, in a timeline.
 *
 * @remarks
 * Can either be `F` (false) or `T` (true).
 */
@outerface<TimelineParsable<TimelineItemBoolean>>()
export class TimelineItemBoolean extends TimelineItem<boolean> {
  #value: boolean

  constructor(rawValue: 'F' | 'T') {
    super(rawValue)
    this.#value = rawValue === 'T'
  }

  get() {
    return this.#value
  }

  static readonly #regexp = this.createItemRegExp(/([FT])/)

  static parse(timeline: string) {
    const result = this.#regexp.exec(timeline)
    return result
      ? ([
          new TimelineItemBoolean(result[1] as 'F' | 'T'),
          timeline.slice(1),
        ] as const)
      : undefined
  }
}
