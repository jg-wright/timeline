import { asyncIterableToArray } from '../src/util.js'
import { outerface } from '@johngw/outerface'
import {
  Clock,
  type Clockable,
  CloseTimeline,
  NeverReachTimelineError,
  Timeline,
  TimelineError,
  TimelineTimer,
  TimelineInstanceOf,
  TimelineItem,
  type TimelineParsable,
} from '@johngw/timeline'
import { beforeEach, expect, test } from 'bun:test'

let timeline: Timeline

beforeEach(() => {
  timeline = Timeline.create(
    '--1--{foo: bar}--[a,b]--true--T--false--F--null--N--E--E(err foo)--T10--X--<Date>-|',
  )
})

test('Timeline', async () => {
  expect(
    (await asyncIterableToArray(timeline)).map((x) => x.get()),
  ).toStrictEqual([
    ...dashes(2),
    1,
    ...dashes(2),
    { foo: 'bar' },
    ...dashes(2),
    ['a', 'b'],
    ...dashes(2),
    true,
    ...dashes(2),
    true,
    ...dashes(2),
    false,
    ...dashes(2),
    false,
    ...dashes(2),
    null,
    ...dashes(2),
    null,
    ...dashes(2),
    new TimelineError(),
    ...dashes(2),
    new TimelineError('err foo'),
    ...dashes(2),
    expect.any(TimelineTimer),
    ...dashes(2),
    new NeverReachTimelineError(),
    ...dashes(2),
    new TimelineInstanceOf('Date'),
    ...dashes(1),
    CloseTimeline,
  ])
})

test('displayTimelinePosition', async () => {
  expect(timeline.displayTimelinePosition()).toBe(
    ` --1--{foo: bar}--[a,b]--true--T--false--F--null--N--E--E(err foo)--T10--X--<Date>-|
^`,
  )

  await timeline.next()
  expect(timeline.displayTimelinePosition()).toBe(
    `
--1--{foo: bar}--[a,b]--true--T--false--F--null--N--E--E(err foo)--T10--X--<Date>-|
^
`.trim(),
  )

  await timeline.next()
  await timeline.next()
  await timeline.next()
  await timeline.next()
  await timeline.next()
  await timeline.next()
  expect(timeline.displayTimelinePosition()).toBe(
    `
--1--{foo: bar}--[a,b]--true--T--false--F--null--N--E--E(err foo)--T10--X--<Date>-|
               ^
`.trim(),
  )
})

test('custom parser', async () => {
  @outerface<TimelineParsable<FooParser>>()
  class FooParser extends TimelineItem<'BAR'> {
    get() {
      return 'BAR' as const
    }

    static parse(timeline: string) {
      return timeline.startsWith('FOO')
        ? ([new FooParser('FOO'), timeline.slice(3)] as const)
        : undefined
    }
  }

  const timeline = Timeline.create('--1--2--FOO--|', [FooParser])

  expect(
    (await asyncIterableToArray(timeline)).map((x) => x.get()),
  ).toStrictEqual([
    ...dashes(2),
    1,
    ...dashes(2),
    2,
    ...dashes(2),
    'BAR',
    ...dashes(2),
    CloseTimeline,
  ])
})

test('consuming a timeline advances its clock one frame per dash', async () => {
  const timeline = Timeline.create('--1--|')
  expect(timeline.clock.now).toBe(0)
  await asyncIterableToArray(timeline)
  // 6 single-character items (-, -, 1, -, -, |), each passed as one frame.
  expect(timeline.clock.now).toBe(6)
})

test('timers finish deterministically off the shared clock, no real time', async () => {
  const clock = new Clock()
  const timeline = Timeline.create('T3--|', { clock })

  const { value } = await timeline.next()
  const timer = value!.get() as TimelineTimer
  expect(timer).toBeInstanceOf(TimelineTimer)

  // Reached but not enough frames have elapsed yet.
  expect(timer.started).toBe(true)
  expect(timer.finished).toBe(false)
  expect(timer.timeLeft).toBe(3)

  // Advancing the shared clock — not wall time — finishes it.
  clock.advance(3)
  expect(timer.finished).toBe(true)
  expect(timer.timeLeft).toBe(0)
  await timer.promise
})

test('a shared clock keeps two timelines in lockstep', () => {
  const clock = new Clock()
  const source = Timeline.create('--1--2------', { clock })
  const expected = Timeline.create('-----T10-2--', { clock })
  expect(source.clock).toBe(expected.clock)
})

test('a timeline accepts any Clockable, not just the built-in Clock', async () => {
  let now = 0
  const clock: Clockable = {
    get now() {
      return now
    },
    wait: () => Promise.resolve(),
    advance: (frames = 1) => {
      now += frames
    },
  }

  const timeline = Timeline.create('--|', { clock })
  expect(timeline.clock).toBe(clock)

  await asyncIterableToArray(timeline)
  // '-', '-', '|' => one frame each.
  expect(now).toBe(3)
})

function dashes(amount: number) {
  return new Array(amount).fill(undefined)
}
