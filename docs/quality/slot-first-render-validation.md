# Slot First-Presentation Validation

## Scope and exact runtime

Validated on 2026-10-16 against Core commit `4e87971` plus this local fix (manifest
3.0.9), using the freshly built `dist/index.es.js`. SHA-256:

`01d76a6b382122cb1b31fde5abadc713327589d597c49f1ea70c425d662b33c1`

The control uses Cleanodino's installed Core 3.0.8. Both control and fix use its
installed Router 0.1.7, not the locally modified router repository. The router writes
`outlet.innerHTML` directly. No waitForRouteReady adapter, artificial delay, or
route-preparation transformation is present. Website and router working trees were
checked before and after; their existing changes were preserved unchanged.

An isolated Vite configuration under `/tmp/core-slot-validation-current` uses the
website's KPA plugin 1.0.4 with an absolute tsconfig path. It aliases only Core to
the fresh bundle, stores caches and production output in that temporary directory,
and uses ports 5392 (fixed dev), 5393 (control dev), and 4392 (fixed preview).
The actual delivered dev main imports `/@fs/.../koppajs-core/dist/index.es.js`.
The production build emits an origin manifest confirming that same bundle and the
installed router. Neither a package.json version alone nor an old server is used as proof.

## Method

Playwright 1.59.1 / Chromium uses 1440×1000 and 390×844 viewports, normal/reduced
motion and CPU throttling at 1×/4×. External requests are blocked; optional services
and form submissions are not activated. Each scenario starts at /kontakt, performs
12 alternating link-handler navigations to /ueber-uns and /kontakt, then four rapid
consecutive link-handler navigation requests. The final observed route is /kontakt
with its completed hero in every scenario.

A requestAnimationFrame sampler and a MutationObserver record DOM structure,
computed presentation along the heading ancestry, host identity and style availability.
A raw slot means hero-copy exists outside site-hero\_\_slot. It counts as visible raw
only when its heading and ancestors have nonzero opacity, visible display/visibility,
and a nonempty rectangle. CSS checks include sheet availability and computed
position: relative on the final hero root. These are diagnostic samples, not every
painted frame and not general error rates.

CDP screencasts capture actual JPEG raster frames independently of DOM samples.
Chronological contact sheets (first 24 images each) are inspected for the control,
fixed production reduced motion, fixed production normal motion, and mobile reduced
motion at 4× CPU. The control visibly draws left-aligned/clipped heading content
before the template. Fixed sequences show a local blank hero area followed by the
correct layout; no misplaced raw heading appears in those inspected images.
Other captured frames are not individually visually inspected.

## Results

Each row includes initial load, the 12 navigations, and the rapid sequence.
“Empty/pending” means the page host has no element children or the hero has no final
root yet. It is not a duration or an assertion that every such sample is fully blank.

| Runtime    | Width | Motion        | CPU | RAF samples | Raw DOM | Visible raw | Empty/pending | Raster frames |
| ---------- | ----- | ------------- | --- | ----------- | ------- | ----------- | ------------- | ------------- |
| baseline   | 1440  | reduce        | 4×  | 178         | 13      | 13          | 43            | 69            |
| dev        | 1440  | no-preference | 1×  | 137         | 3       | 0           | 11            | 113           |
| dev        | 1440  | no-preference | 4×  | 153         | 15      | 0           | 35            | 137           |
| dev        | 1440  | reduce        | 1×  | 134         | 1       | 0           | 8             | 48            |
| dev        | 1440  | reduce        | 4×  | 167         | 13      | 0           | 28            | 67            |
| production | 1440  | no-preference | 1×  | 131         | 2       | 0           | 8             | 111           |
| production | 1440  | no-preference | 4×  | 152         | 12      | 0           | 32            | 126           |
| production | 1440  | reduce        | 1×  | 135         | 3       | 0           | 6             | 43            |
| production | 1440  | reduce        | 4×  | 162         | 11      | 0           | 25            | 62            |
| dev        | 390   | reduce        | 4×  | 171         | 19      | 0           | 38            | 50            |
| production | 390   | reduce        | 4×  | 175         | 11      | 0           | 28            | 58            |

No scenario reports missing hero sheets, incorrect final root positioning, uncaught
page errors or console errors. The fixed matrix covers 120 ordinary navigations and
40 rapid navigation requests. Protected raw DOM can still exist; it is intentionally
connected and measurable, but not painted outside its final structure.

The old route is not retained until the new hero is ready. For example, sampled
host-replacement and hero-completion times differ in the 4× CPU sequences; the
new page host is present while its hero is still protected. These timings are
observations, not performance thresholds or a guarantee of zero loading latency.

### Router-free synthetic check

A registered component has default and named original slots plus 80 interpolations,
with a controlled dependency/mount gate. Five browser-frame samples show connected
original slots with opacity 1 in the control and opacity 0 in the fix. After release,
the original heading and input identities survive and the edited input value remains
`kept`. An external click listener fires once in the fix; in the old runtime it is
removed by the global cleanup observer (zero invocations). The synthetic component
is mounted directly, without a router navigation.

### Automated checks

- Initial regression: two intended failures in the existing first-render suite,
  for dependency loading and frame-sized template processing; green after the fix.
- Additional red/green cases cover late-arriving slot children and mounted hooks
  awaiting a reactive DOM update. The global-cleanup slot-listener test also fails
  before the removal-observer correction.
- First-render integration suite: 23 tests covering protection, identity, default/named
  slots, refs, input values/selection, listeners, nested elements, slow children,
  abort/retry, disconnect/reconnect, failure cleanup and mount readiness.
- `pnpm run check`: documentation, source/test types, lint, formatting and coverage suite.
- `pnpm run test:package`: fresh build and native ESM/CommonJS/legacy-main consumers.

## Retained raster examples

- [Control: raw text before the hero template](assets/slot-first-render-before.jpg)
- [Fixed: local protected preparation](assets/slot-first-render-protected.jpg)
- [Fixed: completed local template](assets/slot-first-render-committed.jpg)

## Limits and separate observations

- Local blank regions and later background-image appearance remain visible. They are
  asynchronous preparation/image-loading states, not missing slot wrappers being painted.
- The opacity guard requires a host box. `display: contents` hosts are outside this
  guarantee. Initialization code must not overwrite the temporary host opacity.
- Terminal errors release temporary declarations and log the failure; original fallback
  content may then be exposed. Failed rendering is not reported as mounted/ready.
- Inline component CSS is covered; external stylesheets remain consumer-owned.
- This is a local Vite production bundle/preview check, not a deployed-site test or
  the website's full image-optimization/prerender/deployment pipeline.
- Chromium only; no new Firefox/WebKit, accessibility or cross-browser claim is made.
- FASE2 source and dirty working trees were inspected, but its historical browser
  comparison was not rerun; the fresh control is Cleanodino with installed Core 3.0.8.

Temporary reproduction artifacts include `vite.config.mjs`, `measure.cjs`,
`synthetic.cjs`, per-scenario `data.json`, JPEGs and `results.json` under
`/tmp/core-slot-validation-current`. They may be removed by the operating system.
The checked-in aggregate JSON and the retained raster examples preserve the evidence.

## Manual recheck

1. Serve Cleanodino with a fresh Vite cache and alias only Core to the newly built bundle.
2. Open /kontakt, reject optional cookies, and alternate Über uns/Kontakt links.
3. Repeat with reduced motion, 4× CPU, the production preview, and rapid repeated links.
4. Confirm that headings appear only inside the finished hero layout; distinguish local
   blank preparation areas and image loading from raw text. Check the console separately.
