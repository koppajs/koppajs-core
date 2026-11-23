export const metrics = {
  factories: 0,
  mounted: 0,
  destroyed: 0,
  clicks: 0,
  windowEvents: 0,
}

export function controller(context, deps) {
  if (typeof context.$emit !== 'function') throw new Error('Missing context')
  metrics.factories++
  return {
    state: { count: deps.initial },
    events: [
      [
        'click',
        'button',
        function () {
          metrics.clicks++
          this.count++
        },
      ],
      [
        'csp-probe',
        window,
        function () {
          metrics.windowEvents++
          this.count++
        },
      ],
    ],
    mounted() {
      if (!context.$refs.action?.isConnected)
        throw new Error('Mounted ref is not connected')
      context.$refs.action.dataset.mounted = 'true'
      metrics.mounted++
    },
    destroyed() {
      metrics.destroyed++
    },
  }
}
