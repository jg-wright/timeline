import { asyncIterableReduce, search } from './util.js'
import { TimelineItemBoolean } from './TimelineItem/TimelineItemBoolean.js'
import { TimelineItemClose } from './TimelineItem/TimelineItemClose.js'
import { TimelineItemError } from './TimelineItem/TimelineItemError.js'
import { TimelineItemNeverReach } from './TimelineItem/TimelineItemNeverReach.js'
import { TimelineItemNull } from './TimelineItem/TimelineItemNull.js'
import { TimelineItemTimer } from './TimelineItem/TimelineItemTimer.js'
import { TimelineItemDefault } from './TimelineItem/TimelineItemDefault.js'
import { TimelineItemDash } from './TimelineItem/TimelineItemDash.js'
import {
  TimelineItem,
  type TimelineParsable,
} from './TimelineItem/TimelineItem.js'
import { TimelineItemInstance } from './TimelineItem/TimelineItemInstance.js'

/**
 * The configured Timeline parsers.
 */
export const DefaultParsers = [
  TimelineItemDash,
  TimelineItemBoolean,
  TimelineItemClose,
  TimelineItemInstance,
  TimelineItemError,
  TimelineItemNeverReach,
  TimelineItemNull,
  TimelineItemTimer,
  TimelineItemDefault,
] satisfies TimelineParsable<TimelineItem<unknown>>[]

export type DefaultParsers = typeof DefaultParsers

/**
 * The union of configured {@link TimelineItem} instances.
 */
export type ParsedTimelineItem<
  Parsers extends TimelineParsable<TimelineItem<unknown>>[] = DefaultParsers,
> =
  Parsers extends Array<infer T>
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      T extends abstract new (...args: any) => any
      ? InstanceType<T>
      : never
    : never

/**
 * The union of configured TimelineItem contained values.
 */
export type ParsedTimelineItemValue<
  Parsers extends TimelineParsable<TimelineItem<unknown>>[] = DefaultParsers,
> = ParsedTimelineItem<Parsers> extends TimelineItem<infer V> ? V : never

/**
 * Given a timeline, parse it in to a list of {@link TimelineItem} objects.
 */
export class Timeline<
  Parsers extends TimelineParsable<TimelineItem<unknown>>[] = DefaultParsers,
> implements AsyncIterableIterator<ParsedTimelineItem<Parsers>> {
  readonly #unparsed: string
  readonly #parsed: ParsedTimelineItem<Parsers>[]
  readonly #Parsers: Parsers
  #position = -1

  constructor(timeline: string, Parsers: Parsers) {
    this.#Parsers = Parsers
    this.#unparsed = timeline.trim()
    this.#parsed = this.#parse()
  }

  static create(timeline: string): Timeline<DefaultParsers>

  static create<Parsers extends TimelineParsable<TimelineItem<unknown>>[]>(
    timeline: string,
    Items: Parsers,
  ): Timeline<[...Parsers, ...DefaultParsers]>

  static create<Parsers extends TimelineParsable<TimelineItem<unknown>>[]>(
    timeline: string,
    Items?: Parsers,
  ): Timeline<[...Parsers, ...DefaultParsers]> {
    return new Timeline<[...Parsers, ...DefaultParsers]>(timeline, [
      ...((Items || []) as Parsers),
      ...DefaultParsers,
    ])
  }

  get Parsers() {
    return this.#Parsers
  }

  get position() {
    return this.#position
  }

  toString() {
    return this.#unparsed
  }

  async toTimeline() {
    return asyncIterableReduce(this, '', (out, item) => out + item.toTimeline())
  }

  /**
   * Displays the current position of timeline.
   *
   * @example
   * ```
   * const timeline = new Timeline('--{foo: bar}--4--|')
   * await timeline.next()
   * await timeline.next()
   * await timeline.next()
   * await timeline.next()
   * await timeline.next()
   * console.info(timeline.displayTimelinePosition())
   * `
   * --{foo: bar}--4--|
   *              ^
   * `
   * ```
   */
  displayTimelinePosition() {
    const unparsed = this.#unparsed
    if (this.#position < 0)
      return ` ${unparsed}
^`
    let length = 0
    for (let i = 0; i < this.#position && i < this.#parsed.length; i++)
      length += this.#parsed[i]!.rawValue.length

    return `${unparsed}
${' '.repeat(length)}^`
  }

  hasUnfinishedItems() {
    return (
      this.#position < this.#parsed.length - 1 &&
      !!this.#parsed
        .slice(this.#position + 1)
        .filter((value: TimelineItem<unknown>) => !value.finished).length
    )
  }

  toJSON() {
    return this.#parsed
  }

  async next(): Promise<
    IteratorResult<ParsedTimelineItem<Parsers>, undefined>
  > {
    const previous = this.#parsed[this.position]
    if (previous) await previous.onPass()

    if (this.#position >= this.#parsed.length - 1)
      return { done: true, value: undefined }

    const value = this.#parsed[++this.#position]
    if (!value) return { done: true, value: undefined }

    await value.onReach()

    return { done: false, value }
  }

  startOver() {
    this.#position = -1
  }

  [Symbol.asyncIterator]() {
    return this
  }

  #parse() {
    const results: ParsedTimelineItem<Parsers>[] = []
    let $timeline = this.#unparsed

    while ($timeline.length) {
      const result = search(this.#Parsers, (Item) => Item.parse($timeline))
      if (!result)
        throw new Error(
          `Cannot find a TimelineParsable capable of parsing ${$timeline}`,
        )
      results.push(result[0] as ParsedTimelineItem<Parsers>)
      $timeline = result[1]
    }

    return results
  }
}
