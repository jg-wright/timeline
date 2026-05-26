import { outerface } from '@johngw/outerface'
import { TimelineItem, type TimelineParsable } from './TimelineItem.js'

/**
 * A timeline item that would represent an instance of something.
 *
 * @remarks
 * Used with `<InstanceName>`.
 */
@outerface<TimelineParsable<TimelineItemInstance>>()
export class TimelineItemInstance extends TimelineItem<TimelineInstanceOf> {
  #name: string

  constructor(name: string) {
    super(`<${name}>`)
    this.#name = name
  }

  get() {
    return new TimelineInstanceOf(this.#name)
  }

  static readonly #regexp = this.createItemRegExp(/(<(\w+)>)/)

  static parse(timeline: string) {
    const result = this.#regexp.exec(timeline)
    return result
      ? ([
          new TimelineItemInstance(result[2]!),
          timeline.slice(result[1]!.length),
        ] as const)
      : undefined
  }
}

/**
 * Represents an instance of something.
 */
export class TimelineInstanceOf {
  #name: string

  constructor(name: string) {
    this.#name = name
  }

  get name() {
    return this.#name
  }
}
