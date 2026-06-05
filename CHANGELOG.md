# Changelog

## [5.0.0](https://github.com/jg-wright/timeline/compare/v4.0.1...v5.0.0) (2026-06-05)


### ⚠ BREAKING CHANGES

* `TimelineParsable.parse` and `TimelineItem` constructors now accept a `TimelineItemOptions` argument; custom parsers should forward `options` to super so they share the timeline's clock. `TimelineTimer` is backed by a `Clockable` rather than real wall-clock time.

### Features

* drive timeline timing with a virtual clock instead of real timers ([07b3baf](https://github.com/jg-wright/timeline/commit/07b3baf3ec5a5eb5ffc9447465c98cf3cbce9eb9))
* drive timeline timing with a virtual clock instead of real timers ([7e5298b](https://github.com/jg-wright/timeline/commit/7e5298be68c27ce1bb0c8c73492e3c2a65d7e112))


### Bug Fixes

* ensure outerface is correctly typed ([5c8b70d](https://github.com/jg-wright/timeline/commit/5c8b70dbdce67259fa97b17b4e9a68848453caac))

## [5.0.0](https://github.com/jg-wright/timeline/compare/v4.0.1...v5.0.0) (2026-06-05)


### ⚠ BREAKING CHANGES

* `TimelineParsable.parse` and `TimelineItem` constructors now accept a `TimelineItemOptions` argument; custom parsers should forward `options` to super so they share the timeline's clock. `TimelineTimer` is backed by a `Clockable` rather than real wall-clock time.

### Features

* drive timeline timing with a virtual clock instead of real timers ([07b3baf](https://github.com/jg-wright/timeline/commit/07b3baf3ec5a5eb5ffc9447465c98cf3cbce9eb9))
* drive timeline timing with a virtual clock instead of real timers ([7e5298b](https://github.com/jg-wright/timeline/commit/7e5298be68c27ce1bb0c8c73492e3c2a65d7e112))


### Bug Fixes

* ensure outerface is correctly typed ([5c8b70d](https://github.com/jg-wright/timeline/commit/5c8b70dbdce67259fa97b17b4e9a68848453caac))

## [4.0.1](https://github.com/jg-wright/timeline/compare/v4.0.0...v4.0.1) (2026-05-26)


### Bug Fixes

* ensure module annotation ([f250ae0](https://github.com/jg-wright/timeline/commit/f250ae00d1d4925c7cea219a3643a7604a623cd1))

## [4.0.0](https://github.com/johngeorgewright/timeline/compare/v3.0.1...v4.0.0) (2026-01-22)


### ⚠ BREAKING CHANGES

* remove commonjs support

### Bug Fixes

* release command ([790d82f](https://github.com/johngeorgewright/timeline/commit/790d82fa03b162dc3b23712f13a14c93c2f29098))


### Miscellaneous Chores

* move to bun ([cde7386](https://github.com/johngeorgewright/timeline/commit/cde7386e6354e356f4f609465a11ce819ddf1ccb))
