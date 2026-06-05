import { asyncIterableReduce, search } from './util.js'
import { getDefaultClock, type Clockable } from './Clock.js'
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
 * Options accepted by {@link Timeline.create} and the {@link Timeline}
 * constructor.
 */
export interface TimelineOptions {
  /**
   * The {@link Clockable} that drives this timeline's timing. Defaults to the
   * shared ambient clock ({@link getDefaultClock}), so timelines coordinate
   * by default. Pass an explicit clock to override it for this timeline.
   */
  clock?: Clockable
}

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
  readonly #clock: Clockable
  #position = -1

  constructor(
    timeline: string,
    Parsers: Parsers,
    options: TimelineOptions = {},
  ) {
    this.#Parsers = Parsers
    this.#clock = options.clock ?? getDefaultClock()
    this.#unparsed = timeline.trim()
    this.#parsed = this.#parse()
  }

  static create(
    timeline: string,
    options?: TimelineOptions,
  ): Timeline<DefaultParsers>

  static create<Parsers extends TimelineParsable<TimelineItem<unknown>>[]>(
    timeline: string,
    Items: Parsers,
    options?: TimelineOptions,
  ): Timeline<[...Parsers, ...DefaultParsers]>

  static create<Parsers extends TimelineParsable<TimelineItem<unknown>>[]>(
    timeline: string,
    ItemsOrOptions?: Parsers | TimelineOptions,
    options?: TimelineOptions,
  ): Timeline<[...Parsers, ...DefaultParsers]> {
    const Items = Array.isArray(ItemsOrOptions) ? ItemsOrOptions : []
    const resolvedOptions = Array.isArray(ItemsOrOptions)
      ? options
      : ItemsOrOptions
    return new Timeline<[...Parsers, ...DefaultParsers]>(
      timeline,
      [...(Items as Parsers), ...DefaultParsers],
      resolvedOptions,
    )
  }

  get Parsers() {
    return this.#Parsers
  }

  /**
   * The virtual {@link Clock} driving this timeline's timing.
   */
  get clock() {
    return this.#clock
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
      const result = search(this.#Parsers, (Item) =>
        Item.parse($timeline, { clock: this.#clock }),
      )
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
