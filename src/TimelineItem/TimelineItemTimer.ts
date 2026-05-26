import { timeout } from '../util.js'
import { outerface } from '@johngw/outerface'
import { TimelineItem, type TimelineParsable } from './TimelineItem.js'

/**
 * A timeline item that represents a timer.
 *
 * @remarks
 * Timers are used in 2 ways. One for simply delaying the stream's
 * content and the other is to expect that a certain amount of time
 * has passed since the previous item.
 */
@outerface<TimelineParsable<TimelineItemTimer>>()
export class TimelineItemTimer extends TimelineItem<TimelineTimer> {
  #timer: TimelineTimer

  constructor(ms: number) {
    super(`T${ms}`)
    this.#timer = new TimelineTimer(ms)
  }

  override get finished(): boolean {
    return this.#timer.finished
  }

  override onReach() {
    this.#timer.start()
    return super.onReach()
  }

  get() {
    return this.#timer
  }

  static readonly #regex = this.createItemRegExp(/(T(\d+))/)

  static parse(timeline: string) {
    const result = this.#regex.exec(timeline)
    return result
      ? ([
          new TimelineItemTimer(Number(result[2])),
          timeline.slice(result[1]!.length),
        ] as const)
      : undefined
  }
}

/**
 * Represents a timer in a timeline.
 */
export class TimelineTimer {
  #state:
    | {
        started: false
      }
    | {
        started: true
        start: number
        end: number
        promise: Promise<void>
      } = {
    started: false,
  }

  readonly #ms: number

  constructor(ms: number) {
    this.#ms = ms
  }

  start() {
    const start = Date.now()
    this.#state = {
      started: true,
      start,
      end: start + this.#ms,
      promise: timeout(this.#ms),
    }
  }

  toJSON() {
    return {
      name: 'TimelineTimer',
      finished: this.finished,
      ms: this.#ms,
      started: this.#state.started,
      timeLeft: this.timeLeft,
    }
  }

  toString() {
    return `TimelineTimer(${this.ms}ms) { ${
      this.finished
        ? 'finished'
        : this.#state.started
          ? `${this.timeLeft}ms`
          : ''
    } }`
  }

  get timeLeft() {
    return this.#state.started ? this.#state.end - Date.now() : undefined
  }

  get started() {
    return this.#state.started
  }

  get finished() {
    const timeLeft = this.timeLeft
    return timeLeft === undefined ? false : timeLeft <= 0
  }

  get promise() {
    return this.#state.started ? this.#state.promise : undefined
  }

  get ms() {
    return this.#ms
  }
}
