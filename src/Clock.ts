/**
 * The contract a timeline uses to tell the time.
 *
 * @remarks
 * A timeline only needs three things from a clock: read the current time,
 * wait for time to pass, and advance time. The built-in {@link Clock}
 * implements this with a deterministic frame counter, but you can supply
 * any implementation — for example one backed by a fake-timers library so
 * the timeline shares a clock with the real `setInterval`/`setTimeout`
 * timers inside the code under test. See the README's "Driving real
 * timers" section.
 */
export interface Clockable {
  /**
   * The current virtual time, measured in frames.
   */
  readonly now: number

  /**
   * Returns a promise that resolves once the clock has advanced by
   * `frames` frames.
   */
  wait(frames: number): Promise<void>

  /**
   * Advances virtual time by `frames` (default 1). May be asynchronous so
   * that implementations backed by real/fake timers can flush pending
   * timer callbacks and microtasks while advancing.
   */
  advance(frames?: number): void | Promise<void>
}

/**
 * The default {@link Clockable}: a virtual clock that drives timeline
 * timing deterministically.
 *
 * @remarks
 * Instead of relying on wall-clock timers (`setTimeout`), time is modelled
 * as an integer number of "frames". The clock only ever advances when a
 * timeline is consumed (one frame per dash), so two timelines sharing the
 * same `Clock` instance advance in lockstep and resolve their timers at
 * exactly the same point on every run — no matter how fast or slow the
 * machine is.
 *
 * @example
 * Share a single clock between two timelines so their timers line up:
 * ```typescript
 * const clock = new Clock()
 * const source = Timeline.create('--1--2------', { clock })
 * const expected = Timeline.create('-----T10-2--', { clock })
 * ```
 */
let defaultClock: Clockable | undefined

/**
 * The ambient {@link Clockable} a {@link Timeline} uses when none is passed
 * explicitly.
 *
 * @remarks
 * Sharing a clock is almost always what you want — a source, the code under
 * test, and an expectation all need to advance together — so timelines
 * default to this single ambient clock rather than a fresh one each. Replace
 * it with {@link setDefaultClock} (e.g. a fake-timers-backed clock in a
 * test), or override per timeline with `Timeline.create(str, { clock })`.
 */
export function getDefaultClock(): Clockable {
  return (defaultClock ??= new Clock())
}

/**
 * Sets the ambient {@link Clockable} returned by {@link getDefaultClock} and
 * used by new timelines without an explicit `clock`.
 *
 * @returns a function that restores the previously-set default. Pair it with
 * a test's teardown so the ambient clock doesn't leak between tests.
 */
export function setDefaultClock(clock: Clockable): () => void {
  const previous = defaultClock
  defaultClock = clock
  return () => {
    defaultClock = previous
  }
}

export class Clock implements Clockable {
  #now = 0
  #waiters: { at: number; resolve: () => void }[] = []

  /**
   * The current virtual time, measured in frames.
   */
  get now() {
    return this.#now
  }

  /**
   * Returns a promise that resolves once the clock has advanced by
   * `frames` frames. A non-positive `frames` resolves immediately.
   */
  wait(frames: number): Promise<void> {
    if (frames <= 0) return Promise.resolve()
    const at = this.#now + frames
    return new Promise<void>((resolve) => {
      this.#waiters.push({ at, resolve })
    })
  }

  /**
   * Advances virtual time by `frames` (default 1), resolving any
   * waiters whose target frame has now been reached.
   */
  advance(frames = 1) {
    this.#now += frames
    const due = this.#waiters.filter((waiter) => waiter.at <= this.#now)
    this.#waiters = this.#waiters.filter((waiter) => waiter.at > this.#now)
    for (const waiter of due) waiter.resolve()
  }
}
