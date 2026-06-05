import { outerface } from '@johngw/outerface'
import {
  TimelineItem,
  type TimelineItemOptions,
  type TimelineParsable,
} from './TimelineItem.js'

/**
 * A timeline item, with the value of `null` that is generated
 * with the shorthand `N`.
 */
@outerface<TimelineParsable<TimelineItemNull>>()
export class TimelineItemNull extends TimelineItem<null> {
  constructor(options: TimelineItemOptions) {
    super('N', options)
  }

  get() {
    return null
  }

  static readonly #regex = this.createItemRegExp(/N/)

  static parse(timeline: string, options: TimelineItemOptions) {
    return this.#regex.test(timeline)
      ? ([new TimelineItemNull(options), timeline.slice(1)] as const)
      : undefined
  }
}
