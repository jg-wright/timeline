import { getDefaultClock, type Clockable } from '../Clock.js'
import { outerface } from '@johngw/outerface'
import {
  TimelineItem,
  type TimelineItemOptions,
  type TimelineParsable,
} from './TimelineItem.js'

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

  constructor(ms: number, options: TimelineItemOptions) {
    super(`T${ms}`, options)
    this.#timer = new TimelineTimer(ms, this.clock)
  }

  override get finished(): boolean {
    return this.#timer.finished
  }

  override onReach() {
    this.#timer.start()
    return super.onReach()
  }

  /**
   * Passing a timer advances the clock by the timer's full duration — not
   * the 1-frame-per-character default. This is what makes a `Tn` consume
   * `n` frames of virtual time when a timeline is iterated, so a consumer
   * never has to wait on {@link TimelineTimer.promise} (which, on a virtual
   * clock, would deadlock: nothing advances the clock while you await it).
   *
   * Advanced one frame at a time (like {@link TimelineItem.dash}) so each
   * frame yields control — letting a timeline sharing this clock interleave
   * in lock-step rather than the source jumping the whole duration at once.
   */
  override async onPass() {
    for (let i = 0; i < this.#timer.ms; i++) await this.clock.advance(1)
  }

  get() {
    return this.#timer
  }

  static readonly #regex = this.createItemRegExp(/(T(\d+))/)

  static parse(timeline: string, options: TimelineItemOptions) {
    const result = this.#regex.exec(timeline)
    return result
      ? ([
          new TimelineItemTimer(Number(result[2]), options),
          timeline.slice(result[1]!.length),
        ] as const)
      : undefined
  }
}

/**
 * Represents a timer in a timeline.
 *
 * @remarks
 * Backed by a virtual {@link Clock} rather than wall-clock time, so a
 * timer of `ms` frames finishes exactly when the clock has advanced `ms`
 * frames since it started — deterministically, on every run.
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
  readonly #clock: Clockable

  constructor(ms: number, clock: Clockable = getDefaultClock()) {
    this.#ms = ms
    this.#clock = clock
  }

  start() {
    const start = this.#clock.now
    this.#state = {
      started: true,
      start,
      end: start + this.#ms,
      promise: this.#clock.wait(this.#ms),
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
    return this.#state.started ? this.#state.end - this.#clock.now : undefined
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
