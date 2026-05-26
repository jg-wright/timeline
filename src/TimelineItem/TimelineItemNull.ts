import { outerface } from '@johngw/outerface'
import { TimelineItem, type TimelineParsable } from './TimelineItem.js'

/**
 * A timeline item, with the value of `null` that is generated
 * with the shorthand `N`.
 */
@outerface<TimelineParsable<TimelineItemNull>>()
export class TimelineItemNull extends TimelineItem<null> {
  constructor() {
    super('N')
  }

  get() {
    return null
  }

  static readonly #regex = this.createItemRegExp(/N/)

  static parse(timeline: string) {
    return this.#regex.test(timeline)
      ? ([new TimelineItemNull(), timeline.slice(1)] as const)
      : undefined
  }
}
