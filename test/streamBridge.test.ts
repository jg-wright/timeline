/**
 * End-to-end proof that a timeline and real-timer code (a transformer using
 * `setInterval`) can share ONE virtual clock, so their timing lines up
 * deterministically with no wall-clock dependency.
 *
 * This builds minimal `fromTimeline` / `sampleTime` / `expectTimeline`
 * pieces — mirroring `@johngw/stream-test` — with the three fixes needed to
 * make the pull-based timelines work on a virtual clock:
 *
 *   1. The source never `await`s a timer's promise (that deadlocks on a
 *      virtual clock). Passing the timer advances the clock by its duration
 *      (see `TimelineItemTimer.onPass`), so the source just moves on.
 *   2. Only the source drives the clock. The expectation reads the same
 *      clock through a read-only view whose `advance` is a no-op, so the two
 *      timelines don't double-advance shared time.
 *   3. The expectation yields with a microtask, never a (possibly faked)
 *      `setTimeout`, so it can't deadlock against the fake timers.
 */
import FakeTimers from '@sinonjs/fake-timers'
import { expect, test } from 'bun:test'
import {
  type Clockable,
  type ParsedTimelineItem,
  Timeline,
  TimelineItemClose,
  TimelineItemDash,
  TimelineItemTimer,
} from '../src/index.js'

/** The transformer under test, from the README example. */
function sampleTime<T>(ms: number): TransformStream<T, T> {
  let buffer: T
  let hasSample = false
  let interval: ReturnType<typeof setInterval>

  return new TransformStream<T, T>({
    start(controller) {
      interval = setInterval(() => {
        if (hasSample) controller.enqueue(buffer)
      }, ms)
    },
    transform(chunk) {
      hasSample = true
      buffer = chunk
    },
    // `flush` covers normal completion; the real transformer also has a
    // `cancel`, omitted here as this lib's `Transformer` type predates it.
    flush: () => clearInterval(interval),
  })
}

/** The clock object returned by `FakeTimers.install`. */
type FakeClock = ReturnType<typeof FakeTimers.install>

/** A `Clockable` backed by fake timers; one frame == one fake millisecond. */
function fakeClockable(fake: FakeClock): Clockable {
  return {
    get now() {
      return fake.now
    },
    wait: (frames) =>
      new Promise((resolve) => {
        fake.setTimeout(() => resolve(), frames)
      }),
    // Step one frame at a time so an interval's `enqueue` is delivered and
    // matched before the clock moves on — keeping timing checks exact.
    advance: async (frames = 1) => {
      for (let i = 0; i < frames; i++) await fake.tickAsync(1)
    },
  }
}

/** A read-only view of a clock: reads its time, but never advances it. */
function readonlyClock(clock: Clockable): Clockable {
  return {
    get now() {
      return clock.now
    },
    wait: (frames) => clock.wait(frames),
    advance: () => {},
  }
}

/** Minimal `fromTimeline`: a source ReadableStream driven by the clock. */
function fromTimeline(
  timelineString: string,
  clock: Clockable,
): ReadableStream<number> {
  const timeline = Timeline.create(timelineString, { clock })
  return new ReadableStream<number>({
    async pull(controller) {
      const { done, value } = await timeline.next()
      if (done || value instanceof TimelineItemClose) return controller.close()
      // A dash and a timer both just spend time (their `onPass` advances the
      // clock); move on without emitting.
      if (
        value instanceof TimelineItemDash ||
        value instanceof TimelineItemTimer
      )
        return this.pull!(controller)
      controller.enqueue(value!.get() as number)
    },
  })
}

/** Minimal `expectTimeline`: a sink that matches chunks against the marble. */
function expectTimeline(
  timelineString: string,
  clock: Clockable,
  check: (expected: unknown, chunk: unknown) => void,
): WritableStream<number> {
  // Read the shared clock, but never advance it — only the source drives.
  const timeline = Timeline.create(timelineString, {
    clock: readonlyClock(clock),
  })
  let nextResult = next()

  async function next(): Promise<
    IteratorResult<ParsedTimelineItem, undefined>
  > {
    const result = await timeline.next()
    if (result.value instanceof TimelineItemDash) return next()
    return result
  }

  async function consume(chunk: number): Promise<void> {
    const { done, value } = await nextResult
    if (done) throw new Error(`received an extra value: ${chunk}`)
    if (value instanceof TimelineItemTimer) {
      const timer = value.get()
      await Promise.resolve() // yield — never a (faked) timer
      if (!timer.finished)
        throw new Error(
          `expected a ${timer.ms}-frame timer to have finished; ${timer.timeLeft} frames left`,
        )
      nextResult = next()
      return consume(chunk) // re-match this chunk against the next item
    }
    check(value!.get(), chunk)
    nextResult = next()
  }

  return new WritableStream<number>({
    write: (chunk) => consume(chunk),
    async close() {
      if (timeline.hasUnfinishedItems())
        throw new Error('the timeline expected more values')
    },
  })
}

test('a timeline and a setInterval transformer share one clock, deterministically', async () => {
  const fake = FakeTimers.install({
    toFake: [
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
      'Date',
    ],
  })

  try {
    const clock = fakeClockable(fake)
    const matched: Array<[unknown, unknown]> = []

    await fromTimeline('1-T40--------2--T20--|', clock)
      .pipeThrough(sampleTime<number>(20))
      .pipeTo(
        expectTimeline('T20-1-T20-1-T20-2---', clock, (expected, chunk) => {
          matched.push([expected, chunk])
          expect(chunk).toBe(expected)
        }),
      )

    // sampleTime(20) emits its latest value every 20 frames: 1 @20, 1 @40,
    // 2 @60 — exactly what the expectation marble describes.
    expect(matched).toEqual([
      [1, 1],
      [1, 1],
      [2, 2],
    ])
  } finally {
    fake.uninstall()
  }
})

test('the expectation fails when a value arrives before its timer has elapsed', async () => {
  const fake = FakeTimers.install({
    toFake: [
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
      'Date',
    ],
  })

  try {
    const clock = fakeClockable(fake)

    const run = fromTimeline('1-T40--|', clock)
      .pipeThrough(sampleTime<number>(20))
      // Demands 50 frames before the first value, but it arrives at frame 20.
      .pipeTo(expectTimeline('T50-1', clock, () => {}))

    await expect(run).rejects.toThrow(/timer to have finished/)
  } finally {
    fake.uninstall()
  }
})
