import { getDefaultClock, type Clockable } from '../Clock.js'
import type { Outerface } from '@johngw/outerface'

/**
 * Options shared by every {@link TimelineItem} constructor.
 */
export interface TimelineItemOptions {
  /**
   * The {@link Clockable} driving this item's timing. {@link Timeline}
   * passes its shared clock here so all of its items advance together.
   * Defaults to the shared ambient clock ({@link getDefaultClock}).
   */
  clock?: Clockable
}

/**
 * The base class of a timeline item.
 */
export abstract class TimelineItem<T> {
  #rawValue: string
  protected readonly clock: Clockable

  get rawValue() {
    return this.#rawValue
  }

  constructor(
    rawValue: string,
    { clock = getDefaultClock() }: TimelineItemOptions,
  ) {
    this.#rawValue = rawValue
    this.clock = clock
  }

  /**
   * If returns true, the item can be considered finished or "unimportant".
   */
  get finished(): boolean {
    return false
  }

  /**
   * Returns the value the `TimelineItem` decorates.
   */
  abstract get(): T

  /**
   * Called after this item has been used and before the next
   * item is "reached".
   *
   * @remarks
   * To match other timelines, that may be a string of dashes,
   * consider all characters in the raw value to wait just like
   * that of a dash.
   */
  async onPass() {
    const length = this.#rawValue.length
    for (let i = 0; i < length; i++) await this.dash()
  }

  protected async dash() {
    // Advancing the clock is the unit of timeline time. Awaiting it yields
    // to the microtask queue — so any timeline sharing this clock can react
    // to the frame — and lets a real/fake-timer-backed clock flush pending
    // timer callbacks before the next frame.
    await this.clock.advance(1)
  }

  /**
   * Called when this item is reached in the timeline.
   */
  onReach(): Promise<void> {
    return Promise.resolve()
  }

  /**
   * The string representation of this item in a timeline.
   */
  toTimeline(): string {
    return this.rawValue
  }

  /**
   * A piece of regular expression that will match something
   * after a timeline item.
   *
   * @remarks
   * This is generally one of:
   * - a dash
   * - a close symbol
   * - the end of the timeline
   */
  static readonly regexEnding = /(?:-|\||$)/

  /**
   * Creates a `RegExp` item to match your timeline item.
   *
   * @remarks
   * Prepends the regexp with a start character (`^`) and appends
   * it with {@link TimelineItem.regexEnding}.
   */
  static createItemRegExp(regexp: RegExp) {
    return new RegExp(`^${regexp.source}${this.regexEnding.source}`)
  }
}

/**
 * The static methods of a class that denote how it is turned
 * in to a {@link TimelineItem}.
 */
export interface TimelineParsable<
  T extends TimelineItem<unknown> = TimelineItem<unknown>,
> extends Outerface<T> {
  /**
   * Returns a binary tuple where:
   * 1. the 1st item is the parsed {@link TimelineItem}
   * 2. the 2nd item is the **rest** of the unparsed timeline
   *
   * @param timelinePart - the unparsed timeline, from the current position
   * @param options - forwarded to the constructed item; pass `options.clock`
   *   through to `super`/the item constructor so it shares the timeline's
   *   {@link Clock}.
   */
  parse(
    timelinePart: string,
    options: TimelineItemOptions,
  ): undefined | readonly [timelineItem: T, restOfTimeline: string]
}
