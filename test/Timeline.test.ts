import { asyncIterableToArray } from '../src/util.js'
import { outerface } from '@johngw/outerface'
import {
  CloseTimeline,
  NeverReachTimelineError,
  Timeline,
  TimelineError,
  TimelineTimer,
  TimelineInstanceOf,
  TimelineItem,
  type TimelineParsable,
} from '@johngw/timeline'
import { beforeEach, expect, test } from 'vitest'

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

function dashes(amount: number) {
  return new Array(amount).fill(undefined)
}
