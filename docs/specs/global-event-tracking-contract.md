# Spec: Global Event Tracking Contract

- Status: Approved
- Owner: KoppaJS core maintainers

## Scope

`src/global-event-cleaner.ts` owns the single listener registry installed during Core
bootstrap. This contract applies to registrations made through the patched
`EventTarget.prototype` methods, including long-lived `document` and `window` targets.
It does not introduce another listener manager or change component lifecycle order.

## Behavior

- Listener identity is target, event type, original callback identity and normalized
  capture. Duplicate additions retain the first registration's once/passive/signal options.
- Record a listener only after native registration succeeds. Null callbacks, failed
  registrations and already-aborted signals must not create registry entries.
- Explicit removal matches capture as well as type and callback. Keep unrelated
  capture variants and event types intact.
- Native once removal clears the registry and internal abort observation before
  invoking user code, including object listeners and reentrant dispatch or re-registration.
- Native signal removal clears the registry synchronously by the return from `abort()`.
  No explicit `removeEventListener()` or DOM disconnection is required.
- Abort observation uses native methods, not the tracking wrapper. Where supported,
  observe a private `AbortSignal.any([signal])` so listeners on the source signal cannot
  suppress bookkeeping with `stopImmediatePropagation()`. Older engines without
  `AbortSignal.any` use a capture-phase observer on the original signal; deliberate
  suppression by an earlier capture-phase abort listener is not covered on those engines.
- Reentrant add/remove operations during an abort event discard already-aborted
  registrations before matching identity. A replacement registration remains active.
- Every removal path detaches the internal abort observer. Its callback uses weak
  references so a surviving signal does not introduce a strong path to the target or listener.
- Empty target sets are removed. Subtree cleanup uses the same normalized registration
  identity and remains independent of the caller's later mutations to the options object.

## Constraints

- Keep the existing WeakMap registry and browser-guarded, idempotent bootstrap.
- No new public exports, dependencies, polling, GC scheduling, or AbortController patches.
- Preserve native callback `this`, dynamic object `handleEvent` lookup, native exception
  reporting and passive/default-passive behavior. Omitted passive must remain omitted.
- Native methods remain responsible for callback/signal/receiver validation and dispatch.
- Registrations made before bootstrap are not discoverable or retroactively tracked.

## Edge Cases

- Duplicate additions with different signals or once values.
- Capture and bubble registrations sharing the same callback.
- Once callbacks re-registering themselves or recursively dispatching the same event.
- Multiple targets sharing a signal, and explicit removal before abort or once dispatch.
- Invalid signals, throwing options getters, and mutations to an options object.
- Manually dispatching an abort event on a signal that is not actually aborted.

## Acceptance Criteria

- Regression tests inspect registry membership, not just missing event callbacks.
- Abort, once, and pre-aborted registrations leave no stale callback entries.
- Explicit removal, duplicate identity, capture variants and subtree cleanup still work.
- Existing component event and reconciliation tests remain green.
- Documentation, typecheck, lint, formatting, coverage and packed-consumer gates pass.
