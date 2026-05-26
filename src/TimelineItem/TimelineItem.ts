import { timeout } from '../util.js'
import type { Outerface } from '@johngw/outerface'

/**
 * The base class of a timeline item.
 */
export abstract class TimelineItem<T> {
  #rawValue: string

  get rawValue() {
    return this.#rawValue
  }

  constructor(rawValue: string) {
    this.#rawValue = rawValue
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

  protected dash() {
    return timeout(1)
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
   */
  parse(
    timelinePart: string,
  ): undefined | readonly [timelineItem: T, restOfTimeline: string]
}
