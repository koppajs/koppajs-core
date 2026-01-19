# Test Classification Table

This document tracks all failing tests in koppajs-core and their classification per the taxonomy defined in the root TEST_CLASSIFICATION.md.

## Currently Failing Tests (as of 2026-01-19)

| Test Name | File | Failure Message (Short) | Classification | Decision Notes |
|-----------|------|------------------------|----------------|---------------|
| handles Date objects | test/model.edge-cases.test.ts | Date reference not preserved | INTENDED_LIMITATION | Proxying complex objects breaks object identity. Workaround: use toEqual() or keep references outside model. |
| handles RegExp objects | test/model.edge-cases.test.ts | RegExp reference not preserved | INTENDED_LIMITATION | Proxying complex objects breaks object identity. Workaround: use toEqual() or keep references outside model. |
| handles nested arrays | test/model.edge-cases.test.ts | Deep mutations don't trigger | BUG | Nested arrays aren't proxied. Should either proxy nested arrays or document limitation clearly. |
| handles observer that throws error | test/model.edge-cases.test.ts | Observer error propagates | BUG | Observer errors crash application. Should implement try-catch around observer invocations for resilience. |
| handles rapid state changes | test/model.edge-cases.test.ts | Expected 100 calls, got 99 | DOCUMENTED_BEHAVIOR | Setting count from 0 to 0 on first iteration doesn't trigger due to same-value check. This is intentional. |
| handles watcher that throws error | test/model.edge-cases.test.ts | Watcher error propagates | BUG | Watcher errors crash during flushChanges. Should implement try-catch around watcher invocations for resilience. |
| handles watching array indices | test/model.edge-cases.test.ts | Expected items[0], got items.0 | DOCUMENTED_BEHAVIOR | Array indices normalized to dot notation internally for consistency. This is intentional design for simpler path matching. |
| handles empty array | test/template-processor.edge-cases.test.ts | 1 child remains for empty array | BUG | Should not render any children when items is empty. Indicates bug in loop cleanup logic. |
| handles null items array | test/template-processor.edge-cases.test.ts | 1 child remains for null array | BUG | Should not render any children when items is null. Indicates bug in loop cleanup logic. |
| handles undefined items array | test/template-processor.edge-cases.test.ts | 1 child remains for undefined array | BUG | Should not render any children when items is undefined. Indicates bug in loop cleanup logic. |
| handles loop with single item | test/template-processor.edge-cases.test.ts | Output is empty, should be 'only' | BUG | Should render one child with text 'only'. Indicates bug in loop rendering or text interpolation. |
| handles loop with index binding [item, index] | test/template-processor.edge-cases.test.ts | Output is ': ', should be '0: a' etc. | BUG | Should render index and item, e.g., '0: a'. Indicates bug in index binding or interpolation. |
| handles loop with complex objects | test/template-processor.edge-cases.test.ts | Output is ': ', should be 'Alice: 30' etc. | BUG | Should render user details, e.g., 'Alice: 30'. Indicates bug in object property interpolation inside loops. |
| handles nested loops | test/template-processor.edge-cases.test.ts | Output is empty, should contain all items | BUG | Nested loops should render all items. Indicates bug in nested loop processing or context propagation. |
| throws error for invalid loop binding with too many identifiers | test/template-processor.edge-cases.test.ts | Promise resolves, should reject | BUG | Invalid loop binding should throw, but promise resolves. Indicates missing validation for loop binding syntax. |
| throws error for malformed loop binding | test/template-processor.edge-cases.test.ts | Promise resolves, should reject | BUG | Malformed loop binding should throw, but promise resolves. Indicates missing validation for loop binding syntax. |
| handles ref with empty name | test/template-processor.edge-cases.test.ts | Ref with empty name is added | BUG | Ref with empty name should be ignored. Indicates bug in ref name validation. |
| handles ref on element that gets removed by if | test/template-processor.edge-cases.test.ts | Ref is present, should be undefined | BUG | Ref should not be added if element is removed by 'if'. Indicates bug in ref cleanup logic. |
| handles combination of if and loop | test/template-processor.edge-cases.test.ts | Output is empty, should contain all items | BUG | Combination of 'if' and 'loop' should render all items when 'showList' is true. Indicates bug in combined directive processing. |
| handles loop with conditional items | test/template-processor.edge-cases.test.ts | Output is empty, should contain only visible items | BUG | Loop with conditional items should render only visible items. Indicates bug in conditional rendering inside loops. |

## Previously Failing Tests - Now Passing

The following tests were previously failing but are now passing (as of 2026-01-19):
- All tests in `test/utils/helper.edge-cases.test.ts` (55 tests) - These tests now pass completely

## Path Semantics

- Empty path ("") returns the target object itself for getValueByPath.
- Whitespace-only path is trimmed and treated as empty, returning the target object itself for getValueByPath.
- setValueByPath does not throw for empty segments (e.g., "a..b"); empty segments are treated as valid path parts.
