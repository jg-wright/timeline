# @johngw/timeline

> Parse a stream-like timeline of values.

A timeline is the way to describe and test values over a period of time. For example, consider the following:

```
--1--2--3--4--
```

The above is a stream-like set of values that queues 1, 2, 3, 4.

The following is an example of merging 2 streams together and what the result would be after.

```
merge([
--1---2---3---4--
----a---b---c----
])

--1-a-2-b-3-c-4--
```

## Use

Use the `Timeline` class to generate an `AsncyIterator` of timeline values.

```javascript
const timeline = Timeline.create(`
  --1--{foo: bar}--[a,b]--true--T--false--F--null--N--E--E(err foo)--<Date>--T10--X-|
`)

for await (const value of timeline) {
  // Customise the handling of your values here
}
```

## Consistent timing

Timelines used to wait on real `setTimeout` timers, which made timing depend on wall-clock time — slow, and prone to drift between two timelines that are meant to line up. Instead, timing is now driven by a virtual `Clock` measured in _frames_ (one frame per dash). The clock only advances as a timeline is consumed, so timing is fully deterministic.

To coordinate two (or more) timelines — for example a source stream and the expectation it should produce — pass them the **same** `Clock` instance so they advance in lockstep:

```javascript
import { Clock, Timeline } from '@johngw/timeline'

const clock = new Clock()
const source = Timeline.create('--1--2------', { clock })
const expected = Timeline.create('-----T10-2--', { clock })
```

If you don't pass a clock, each `Timeline` gets its own fresh one.

### Driving real timers (e.g. testing a transformer)

The `Clock` above is enough when _everything_ runs on timeline time. But real code under test often uses real timers — `setTimeout`, `setInterval`, `Date`. Take a transformer that samples its latest value on an interval:

```typescript
export function sampleTime<T>(ms: number): TransformStream<T, T> {
  let buffer: T
  let hasSample = false
  let interval: ReturnType<typeof setInterval>

  return new TransformStream({
    start(controller) {
      interval = setInterval(() => {
        if (hasSample) controller.enqueue(buffer)
      }, ms)
    },
    transform(chunk) {
      hasSample = true
      buffer = chunk
    },
    flush: () => clearInterval(interval),
    cancel: () => clearInterval(interval),
  })
}
```

If you feed a timeline into this, the timeline advances on _frames_ while `setInterval` fires on _wall-clock time_ — they drift, and your test is flaky again. The fix is to put **both** on the same clock.

A `Timeline` accepts any [`Clockable`](src/Clock.ts), so you don't have to use the built-in `Clock`. Replace the global timers with a fake-timers library such as [`@sinonjs/fake-timers`](https://github.com/sinonjs/fake-timers), then hand the timeline a `Clockable` that reads and advances _that same fake clock_:

```typescript
import FakeTimers from '@sinonjs/fake-timers'
import { Timeline, type Clockable } from '@johngw/timeline'

// 1. Make the transformer's setInterval/setTimeout/Date controllable.
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
  // 2. A Clockable backed by the *same* fake clock the transformer is on.
  //    One frame == one fake millisecond.
  const clock: Clockable = {
    get now() {
      return fake.now
    },
    wait: (frames) =>
      new Promise((resolve) => {
        fake.setTimeout(resolve, frames)
      }),
    // `tickAsync` advances fake time *and* drains the promises the stream
    // pipeline schedules, so an interval's `enqueue` surfaces before the
    // next frame.
    advance: (frames = 1) => fake.tickAsync(frames).then(() => {}),
  }

  // 3. Consuming a dash now ticks the same clock sampleTime's interval is on,
  //    so `T20` and `setInterval(20)` fire together — deterministically.
  const source = Timeline.create('1-T40--------2--T20--|', { clock })
  const expected = Timeline.create('T20-1-T20-1-T20-2---', { clock })

  // …drive `source` into `sampleTime(20)` and assert against `expected`.
} finally {
  fake.uninstall()
}
```

The whole bridge is the `clock` adapter: because the timeline advances that clock as it's consumed, the transformer's real timers advance in lockstep with timeline frames — no manual ticking, and no `setTimeout` left to make timing inconsistent. Note that `install()` is process-global, so install/uninstall it per test (the `try`/`finally` above).

## Examples

See real-world examples in the `@johngw/stream-test` package:

- https://github.com/johngeorgewright/stream/blob/main/packages/stream-test/src/fromTimeline.ts
- https://github.com/johngeorgewright/stream/blob/main/packages/stream-test/src/expectTimeline.ts

## Syntax

The syntax for timelines are as follows:

### Closing a stream

A stream will only close, when specified to do so, with the pipe character: `|`.

For example:

```
--1--2--3--4--|
```

### Errors

An error can be populated downstream with the capital letter `E` and an optional message inside paranthesis: `E(my message)`.

### Never

Sometimes you may want to create an expectation that the timeline should **never** reach. Use the capital `X` for such a scenario.

For example, the `buffer` transformer's test uses this to test that the buffer's `notifier` close event will close the source stream:

```
--1--2--3---X

buffer(
--------|
)

--------[1,2,3]
```

### Timers

To signal waiting for a period of time, use a capital `T` followed by a number, representing the amount of time to wait for.

For example:

```
--1--2------

debounce(10)

-----T10-2--
```

Timing is **virtual**, not wall-clock. A timeline is driven by a [`Clock`](#consistent-timing) that advances one _frame_ per dash; a `Tn` finishes once the clock has advanced `n` frames. This makes timing deterministic and independent of how fast the machine is or how busy the event loop gets — no `setTimeout` is involved.

### Null

Although the keyword `null` can be used, a shorter `N` can also be used.

### Booleans

Althought the keywords `true` & `false` can be used, the shorter versions `T` & `F` can also be used.

### Instances

Although we cannot actually provide instances through a timeline string, we can represent one. Use `<InstanceName>` and receive a `TimelineInstanceOf<{ InstanceName }>` object.

### Numbers, Strings, Boolean, Objects & Arrays

Any combination of characters, other than a dash (`-`) or any of the above syntax, will be parsed by [js-yaml](https://github.com/nodeca/js-yaml).

## Customizing

You have the ability to add your own timeline items.

### Creating the parser

Each timeline item must have a parser. It should take from **the beginning** of a given timeline string and returning a binary tuple where the first value is an instance of the timeline item and the second value is the remaining timeline string.

```typescript
import { outerface } from '@johngw/outerface'
import {
  TimelineItem,
  TimelineItemOptions,
  TimelineParsable,
} from '@johngw/timeline/TimelineItem'

@outerface<TimelineParsable<FooBarTimelineItem>>()
export class FooBarTimelineItem extends TimelineItem<string> {
  static parse(timeline: string, options?: TimelineItemOptions) {
    const result = this.createItemRegExp('(FOO)').exec(timeline)
    return result
      ? [
          new FooBarTimelineItem(result[1], options),
          timeline.slice(result[1].length),
        ]
      : undefined
  }
}
```

If your parser returns `undefined` it the iterator will keep moving on to the following parsers until it receives a tuple.

Now we need to implement the rest of the `TimelineItem`.

```typescript
import { outerface } from '@johngw/outerface'
import {
  TimelineItem,
  TimelineItemOptions,
  TimelineParsable,
} from '@johngw/timeline/TimelineItem'

@outerface<TimelineParsable<FooBarTimelineItem>>()
export class FooBarTimelineItem extends TimelineItem<string> {
  static parse(timeline: string, options?: TimelineItemOptions) {
    const result = this.createItemRegExp('(FOO)').exec(timeline)
    return result
      ? [
          new FooBarTimelineItem(result[1], options),
          timeline.slice(result[1].length),
        ]
      : undefined
  }

  get() {
    return 'BAR'
  }
}
```

`FooBarTimelineItem` will now be used whenever there is `'FOO'` in the timeline. The value, however, will be `'BAR'`.

```typescript
const timeline = Timeline.create('--1--2--FOO--', [FooBarTimelineItem])

let output = ''
for await (const item of timeline) {
  const value = item.get()
  output += value === undefined ? '-' : value
}

console.info(output)
// '--1--2--BAR--'
```

### Lifecycle Hooks

There are lifecycle methods to implement if you wish to hook in to the timeline iterator.

#### `onReach`

This method is called when a timeline item is reached.

```typescript
import { outerface } from '@johngw/outerface'
import {
  TimelineItem,
  TimelineItemOptions,
  TimelineParsable,
} from '@johngw/timeline/TimelineItem'

@outerface<TimelineParsable<FooBarTimelineItem>>()
export class FooBarTimelineItem extends TimelineItem<string> {
  static parse(timeline: string, options?: TimelineItemOptions) {
    const result = this.createItemRegExp('(FOO)').exec(timeline)
    return result
      ? [
          new FooBarTimelineItem(result[1], options),
          timeline.slice(result[1].length),
        ]
      : undefined
  }

  get() {
    return 'BAR'
  }

  override onReach() {
    console.info('Foo has happened')
    return super.onReach()
  }
}
```

#### `onPass`

A method that is called just before reaching the next item.

```typescript
import { outerface } from '@johngw/outerface'
import {
  TimelineItem,
  TimelineItemOptions,
  TimelineParsable,
} from '@johngw/timeline/TimelineItem'

@outerface<TimelineParsable<FooBarTimelineItem>>()
export class FooBarTimelineItem extends TimelineItem<string> {
  static parse(timeline: string, options?: TimelineItemOptions) {
    const result = this.createItemRegExp('(FOO)').exec(timeline)
    return result
      ? [
          new FooBarTimelineItem(result[1], options),
          timeline.slice(result[1].length),
        ]
      : undefined
  }

  get() {
    return 'BAR'
  }

  override onPass() {
    console.info('Successfully passed the foo item')
    return super.onPass()
  }
}
```
