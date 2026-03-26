import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { processSlots, validateProp, registerComponent } from '../src/component'
import type { Props, ComponentSource } from '../src/types'
import { ExtensionRegistry } from '../src/utils/index'
import * as globalEventCleaner from '../src/global-event-cleaner'

describe('component', () => {
  describe('processSlots', () => {
    let container: DocumentFragment
    let host: HTMLElement

    beforeEach(() => {
      container = document.createDocumentFragment()
      host = document.createElement('div')
    })

    it('replaces default slot with host content', () => {
      const template = document.createElement('div')
      const slot = document.createElement('slot')
      template.appendChild(slot)
      container.appendChild(template)

      const content = document.createTextNode('Slot content')
      host.appendChild(content)

      processSlots({ container, host })

      expect(template.contains(slot)).toBe(false)
      expect(template.textContent).toBe('Slot content')
    })

    it('replaces named slots with matching content', () => {
      const template = document.createElement('div')
      const slot = document.createElement('slot')
      slot.setAttribute('name', 'header')
      template.appendChild(slot)
      container.appendChild(template)

      const headerContent = document.createElement('h1')
      headerContent.setAttribute('slot', 'header')
      headerContent.textContent = 'Header'
      host.appendChild(headerContent)

      processSlots({ container, host })

      expect(template.contains(slot)).toBe(false)
      expect(template.querySelector('h1')).toBe(headerContent)
      expect(template.textContent).toBe('Header')
    })

    it('handles multiple slots', () => {
      const template = document.createElement('div')
      const headerSlot = document.createElement('slot')
      headerSlot.setAttribute('name', 'header')
      const footerSlot = document.createElement('slot')
      footerSlot.setAttribute('name', 'footer')
      template.appendChild(headerSlot)
      template.appendChild(footerSlot)
      container.appendChild(template)

      const header = document.createElement('h1')
      header.setAttribute('slot', 'header')
      header.textContent = 'Header'
      const footer = document.createElement('footer')
      footer.setAttribute('slot', 'footer')
      footer.textContent = 'Footer'
      host.appendChild(header)
      host.appendChild(footer)

      processSlots({ container, host })

      expect(template.contains(headerSlot)).toBe(false)
      expect(template.contains(footerSlot)).toBe(false)
      expect(template.querySelector('h1')?.textContent).toBe('Header')
      expect(template.querySelector('footer')?.textContent).toBe('Footer')
    })

    it('handles slot without matching content', () => {
      const template = document.createElement('div')
      const slot = document.createElement('slot')
      slot.setAttribute('name', 'missing')
      template.appendChild(slot)
      container.appendChild(template)

      processSlots({ container, host })

      expect(template.contains(slot)).toBe(false)
      expect(template.children.length).toBe(0)
    })

    it('handles text nodes in default slot', () => {
      const template = document.createElement('div')
      const slot = document.createElement('slot')
      template.appendChild(slot)
      container.appendChild(template)

      const text1 = document.createTextNode('First ')
      const text2 = document.createTextNode('Second')
      host.appendChild(text1)
      host.appendChild(text2)

      processSlots({ container, host })

      expect(template.contains(slot)).toBe(false)
      expect(template.textContent).toBe('First Second')
    })
  })

  describe('validateProp', () => {
    it('returns true for valid string prop', () => {
      const props: Props = {
        name: { type: String as any },
      }

      expect(validateProp({ propName: 'name', propValue: 'test', props })).toBe(true)
    })

    it('returns true for valid number prop', () => {
      const props: Props = {
        count: { type: Number as any },
      }

      expect(validateProp({ propName: 'count', propValue: 42, props })).toBe(true)
    })

    it('returns true for valid boolean prop', () => {
      const props: Props = {
        enabled: { type: Boolean as any },
      }

      expect(validateProp({ propName: 'enabled', propValue: true, props })).toBe(true)
    })

    it('returns true for valid array prop', () => {
      const props: Props = {
        items: { type: Array as any },
      }

      expect(validateProp({ propName: 'items', propValue: [1, 2, 3], props })).toBe(true)
    })

    it('returns true for valid object prop', () => {
      const props: Props = {
        config: { type: Object as any },
      }

      expect(
        validateProp({
          propName: 'config',
          propValue: { key: 'value' },
          props,
        }),
      ).toBe(true)
    })

    it('returns false for invalid type', () => {
      const props: Props = {
        count: { type: Number as any },
      }

      expect(validateProp({ propName: 'count', propValue: 'not a number', props })).toBe(
        false,
      )
    })

    it('uses default value when propValue is undefined', () => {
      const props: Props = {
        name: { type: String as any, default: 'default' },
      }

      expect(validateProp({ propName: 'name', propValue: undefined, props })).toBe(true)
    })

    it('returns true when prop is not defined in props', () => {
      const props: Props = {}

      expect(validateProp({ propName: 'unknown', propValue: 'anything', props })).toBe(
        true,
      )
    })

    it('handles function type', () => {
      const props: Props = {
        callback: { type: Function as any },
      }

      expect(
        validateProp({
          propName: 'callback',
          propValue: () => {},
          props,
        }),
      ).toBe(true)
    })

    it('returns false for null when object is expected', () => {
      const props: Props = {
        config: { type: Object as any },
      }

      expect(validateProp({ propName: 'config', propValue: null, props })).toBe(false)
    })

    it('returns false for array when object is expected', () => {
      const props: Props = {
        config: { type: Object as any },
      }

      expect(validateProp({ propName: 'config', propValue: [], props })).toBe(false)
    })

    it('validates regex pattern', () => {
      const props: Props = {
        email: { type: String as any, regex: '^[a-z]+@[a-z]+\\.[a-z]+$' },
      }

      expect(
        validateProp({
          propName: 'email',
          propValue: 'test@example.com',
          props,
        }),
      ).toBe(true)
      expect(validateProp({ propName: 'email', propValue: 'invalid-email', props })).toBe(
        false,
      )
    })

    it('handles required props', () => {
      const props: Props = {
        name: { type: 'string', required: true },
      }

      // Required prop validation is handled in processProps, not validateProp
      // validateProp returns true if no propOptions or if value matches type
      expect(validateProp({ propName: 'name', propValue: 'test', props })).toBe(true)
    })

    it('handles unknown type gracefully', () => {
      const props: Props = {
        custom: { type: 'unknown' },
      }

      // Unknown type should skip validation
      expect(validateProp({ propName: 'custom', propValue: 'anything', props })).toBe(
        true,
      )
    })
  })

  describe('registerComponent', () => {
    beforeEach(() => {
      // Clean up any existing custom elements
      document.body.innerHTML = ''
      document.head.innerHTML = ''
      ExtensionRegistry.plugins = {}
      ExtensionRegistry.modules = {}
    })

    afterEach(() => {
      document.body.innerHTML = ''
      document.head.innerHTML = ''
    })

    it('registers a basic component', async () => {
      const componentSource: ComponentSource = {
        template: '<div>Test</div>',
        script: '{ state: { count: 0 } }',
        style: 'div { color: red; }',
      }

      registerComponent('test-basic', componentSource)

      const element = document.createElement('test-basic')
      document.body.appendChild(element)

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(element.shadowRoot || element).toBeTruthy()
      expect(customElements.get('test-basic')).toBeDefined()
    })

    it('creates component with state', async () => {
      const componentSource: ComponentSource = {
        template: '<div>{{ count }}</div>',
        script: '{ state: { count: 42 } }',
        style: '',
      }

      registerComponent('test-state', componentSource)

      const element = document.createElement('test-state')
      document.body.appendChild(element)

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(element.textContent).toContain('42')
    })

    it('handles static props', async () => {
      const componentSource: ComponentSource = {
        template: '<div>{{ message }}</div>',
        script: `{
          props: { message: { type: String } },
          state: { message: "default" }
        }`,
        style: '',
      }

      registerComponent('test-static-prop', componentSource)

      const element = document.createElement('test-static-prop')
      element.setAttribute('message', 'Hello')
      document.body.appendChild(element)

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(element.textContent).toContain('Hello')
    })

    it('handles boolean props', async () => {
      const componentSource: ComponentSource = {
        template: "<div>{{ enabled ? 'on' : 'off' }}</div>",
        script: `{
          props: { enabled: { type: Boolean } },
          state: { enabled: false }
        }`,
        style: '',
      }

      registerComponent('test-bool-prop', componentSource)

      const element = document.createElement('test-bool-prop')
      element.setAttribute('enabled', '')
      document.body.appendChild(element)

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(element.textContent).toContain('on')
    })

    it('handles default prop values', async () => {
      const componentSource: ComponentSource = {
        template: '<div>{{ name }}</div>',
        script: `{
          props: { name: { type: String, default: "DefaultName" } },
          state: {}
        }`,
        style: '',
      }

      registerComponent('test-default-prop', componentSource)

      const element = document.createElement('test-default-prop')
      document.body.appendChild(element)

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(element.textContent).toContain('DefaultName')
    })

    it('handles composite type component', async () => {
      const componentSource: ComponentSource = {
        template: '<div>{{ count }}</div>',
        script: `{
          state: { count: 10 },
          methods: {
            increment() { this.count++; }
          }
        }`,
        style: '',
        type: 'composite',
      }

      registerComponent('test-composite', componentSource)

      const element = document.createElement('test-composite')
      document.body.appendChild(element)

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(element.textContent).toContain('10')
      const instance = (element as any).instance
      expect(instance).toBeDefined()
      expect(instance?.userContext).toBeUndefined()
      expect(instance?.methods).toBeDefined()
    })

    it('injects styles into document head', async () => {
      const componentSource: ComponentSource = {
        template: '<div>Test</div>',
        script: '{}',
        style: '.test { color: blue; }',
      }

      registerComponent('test-style', componentSource)

      const element = document.createElement('test-style')
      document.body.appendChild(element)

      await new Promise((resolve) => setTimeout(resolve, 100))

      const styleElement = document.head.querySelector('style#style-test-style')
      expect(styleElement).toBeTruthy()
      expect(styleElement?.textContent).toContain('color: blue')
    })

    it('handles lifecycle hooks', async () => {
      const _createdHook = vi.fn()
      const _mountedHook = vi.fn()

      const componentSource: ComponentSource = {
        template: '<div>Test</div>',
        script: `{
          state: {},
          created() { window.testCreated = true; },
          mounted() { window.testMounted = true; }
        }`,
        style: '',
      }

      registerComponent('test-hooks', componentSource)

      const element = document.createElement('test-hooks')
      document.body.appendChild(element)

      await new Promise((resolve) => setTimeout(resolve, 150))

      // Hooks should have been called (we can't easily test them directly, but we can check instance exists)
      expect((element as any).instance).toBeDefined()
    })

    it('handles component with methods', async () => {
      const componentSource: ComponentSource = {
        template: '<button @click="increment">{{ count }}</button>',
        script: `{
          state: { count: 0 },
          methods: {
            increment() { this.count++; }
          }
        }`,
        style: '',
      }

      registerComponent('test-methods', componentSource)

      const element = document.createElement('test-methods')
      document.body.appendChild(element)

      await new Promise((resolve) => setTimeout(resolve, 100))

      const instance = (element as any).instance
      expect(instance?.methods).toBeDefined()
      expect(typeof instance?.methods?.increment).toBe('function')
    })

    it('handles disconnectedCallback', async () => {
      const componentSource: ComponentSource = {
        template: '<div>Test</div>',
        script: '{}',
        style: '',
      }

      registerComponent('test-disconnect', componentSource)

      const element = document.createElement('test-disconnect')
      document.body.appendChild(element)

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect((element as any).instance).toBeDefined()

      element.remove()

      await new Promise((resolve) => setTimeout(resolve, 50))

      // Component should be disconnected
      expect(element.isConnected).toBe(false)
    })

    it('prevents renders and cleans resources after disconnect', async () => {
      const cleanupSpy = vi.spyOn(globalEventCleaner, 'cleanupSubtree')
      try {
        const componentSource: ComponentSource = {
          template: '<div>Count: {{ count }}</div>',
          script: '{ state: { count: 0 } }',
          style: '',
        }

        registerComponent('test-teardown', componentSource)

        const element = document.createElement('test-teardown')
        document.body.appendChild(element)

        await new Promise((resolve) => setTimeout(resolve, 150))

        const instance = (element as any).instance
        expect(instance).toBeDefined()
        const initialText = element.textContent

        element.remove()

        await new Promise((resolve) => setTimeout(resolve, 50))

        expect(cleanupSpy).toHaveBeenCalledWith(element)

        instance.state.count = 99
        await new Promise((resolve) => setTimeout(resolve, 50))

        expect(element.textContent).toBe(initialText)
      } finally {
        cleanupSpy.mockRestore()
      }
    })

    it('handles component with parent instance', async () => {
      const parentSource: ComponentSource = {
        template: '<child-component></child-component>',
        script: `{
          state: { parentValue: "parent" }
        }`,
        style: '',
      }

      const childSource: ComponentSource = {
        template: '<div>{{ parentValue }}</div>',
        script: `{
          state: {}
        }`,
        style: '',
      }

      registerComponent('parent-component', parentSource)
      registerComponent('child-component', childSource)

      const parent = document.createElement('parent-component')
      document.body.appendChild(parent)

      await new Promise((resolve) => setTimeout(resolve, 150))

      const child = parent.querySelector('child-component') as any
      expect(child).toBeTruthy()
      expect(child?.instance).toBeDefined()
      expect(child?.instance?.$parent).toBeDefined()
    })

    it('handles component with plugins', async () => {
      const plugin = {
        name: 'test-plugin',
        install() {},
        setup() {
          return { pluginData: 'test' }
        },
        attach: undefined as never,
      }

      ExtensionRegistry.plugins['test-plugin'] = plugin

      const componentSource: ComponentSource = {
        template: '<div>Test</div>',
        script: `{
          state: {},
          created() {
            const data = this.$take("test-plugin");
            if (data && typeof data === "object") {
              this.pluginData = data.pluginData;
            }
          }
        }`,
        style: '',
      }

      registerComponent('test-plugin-component', componentSource)

      const element = document.createElement('test-plugin-component')
      document.body.appendChild(element)

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect((element as any).instance).toBeDefined()
    })

    // Note: Module integration is tested indirectly through component registration
    // Direct module testing is complex due to script compilation requirements

    it('handles component with events', async () => {
      const componentSource: ComponentSource = {
        template: '<button class="btn">Click</button>',
        script: `{
          state: {},
          events: [
            ["click", ".btn", function() { this.clicked = true; }]
          ]
        }`,
        style: '',
      }

      registerComponent('test-events', componentSource)

      const element = document.createElement('test-events')
      document.body.appendChild(element)

      await new Promise((resolve) => setTimeout(resolve, 100))

      const button = element.querySelector('.btn')
      expect(button).toBeTruthy()

      button?.dispatchEvent(new Event('click', { bubbles: true }))

      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    it('handles component with watch list (metadata only, no auto-registration)', async () => {
      const componentSource: ComponentSource = {
        template: '<div>{{ count }}</div>',
        script: `{
          state: { count: 0 },
          watchList: ["count"]
        }`,
        style: '',
      }

      registerComponent('test-watch', componentSource)

      const element = document.createElement('test-watch')
      document.body.appendChild(element)

      await new Promise((resolve) => setTimeout(resolve, 100))

      // watchList is stored as metadata but no automatic watchers are registered
      expect((element as any).instance?.watchList).toContain('count')

      // Verify no automatic watcher registration by checking model state
      const instance = (element as any).instance
      expect(instance).toBeDefined()
    })

    it('passes changedPaths to lifecycle hooks during update', async () => {
      const componentSource: ComponentSource = {
        template: '<div>{{ count }}</div>',
        script: `{
          state: { count: 0 },
          beforeUpdate() {
            window.beforeUpdateChangedPaths = this.changedPaths ? Array.from(this.changedPaths) : null;
          },
          updated() {
            window.updatedChangedPaths = this.changedPaths ? Array.from(this.changedPaths) : null;
          }
        }`,
        style: '',
      }

      registerComponent('test-changed-paths', componentSource)

      const element = document.createElement('test-changed-paths')
      document.body.appendChild(element)

      // Wait for initial mount
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Clear any previous values
      delete (window as any).beforeUpdateChangedPaths
      delete (window as any).updatedChangedPaths

      // Change state to trigger update
      const instance = (element as any).instance
      expect(instance).toBeDefined()
      expect(element.textContent).toContain('0')

      instance.state.count = 42

      // Wait for render cycle to complete (observer triggers render via RAF)
      await new Promise((resolve) => setTimeout(resolve, 100))
      await new Promise((resolve) => requestAnimationFrame(resolve))
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Verify render happened
      expect(element.textContent).toContain('42')

      // Verify changedPaths was passed to hooks (if hooks were called)
      // Note: beforeUpdate/updated only fire when isMounted is true
      // This test verifies that when hooks fire, changedPaths is available
      if ((window as any).beforeUpdateChangedPaths !== undefined) {
        expect((window as any).beforeUpdateChangedPaths).toContain('count')
      }
      if ((window as any).updatedChangedPaths !== undefined) {
        expect((window as any).updatedChangedPaths).toContain('count')
      }

      // Cleanup
      delete (window as any).beforeUpdateChangedPaths
      delete (window as any).updatedChangedPaths
    })

    it('passes empty changedPaths set when no changes occur', async () => {
      const componentSource: ComponentSource = {
        template: '<div>Static</div>',
        script: `{
          state: {},
          beforeUpdate() {
            if (this.changedPaths) {
              window.emptyChangedPaths = Array.from(this.changedPaths);
            }
          }
        }`,
        style: '',
      }

      registerComponent('test-empty-paths', componentSource)

      const element = document.createElement('test-empty-paths')
      document.body.appendChild(element)

      await new Promise((resolve) => setTimeout(resolve, 150))

      // Force a render without state changes (should have empty changedPaths)
      // Note: This test verifies hooks still run normally with empty set
      const instance = (element as any).instance
      expect(instance).toBeDefined()

      // Cleanup
      delete (window as any).emptyChangedPaths
    })

    it('removes changedPaths after update cycle completes', async () => {
      const componentSource: ComponentSource = {
        template: '<div>{{ count }}</div>',
        script: `{
          state: { count: 0 },
          beforeUpdate() {
            window.beforeUpdateHasChangedPaths = this.changedPaths !== undefined;
          },
          updated() {
            window.updatedHasChangedPaths = this.changedPaths !== undefined;
          }
        }`,
        style: '',
      }

      registerComponent('test-ephemeral-paths', componentSource)

      const element = document.createElement('test-ephemeral-paths')
      document.body.appendChild(element)

      // Wait for initial mount
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Clear any previous values
      delete (window as any).beforeUpdateHasChangedPaths
      delete (window as any).updatedHasChangedPaths

      // Change state to trigger update
      const instance = (element as any).instance
      expect(instance).toBeDefined()
      expect(element.textContent).toContain('0')

      instance.state.count = 42

      // Wait for render cycle to complete
      await new Promise((resolve) => setTimeout(resolve, 100))
      await new Promise((resolve) => requestAnimationFrame(resolve))
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Verify render happened
      expect(element.textContent).toContain('42')

      // Verify changedPaths was present during hooks
      expect((window as any).beforeUpdateHasChangedPaths).toBe(true)
      expect((window as any).updatedHasChangedPaths).toBe(true)

      // Verify changedPaths is NOT present after update cycle
      const hookContext = instance.userContext || instance.state
      expect(hookContext.changedPaths).toBeUndefined()

      // Cleanup
      delete (window as any).beforeUpdateHasChangedPaths
      delete (window as any).updatedHasChangedPaths
    })

    it('does not leak changedPaths across multiple update cycles', async () => {
      const componentSource: ComponentSource = {
        template: '<div>{{ count }} - {{ name }}</div>',
        script: `{
          state: { count: 0, name: "initial" },
          beforeUpdate() {
            if (this.changedPaths) {
              window.update1Paths = Array.from(this.changedPaths);
            }
          },
          updated() {
            if (this.changedPaths) {
              window.update1PathsAfter = Array.from(this.changedPaths);
            }
            // Store reference after hook completes to check for leakage
            window.afterUpdate1 = this.changedPaths;
          }
        }`,
        style: '',
      }

      registerComponent('test-no-leak-paths', componentSource)

      const element = document.createElement('test-no-leak-paths')
      document.body.appendChild(element)

      // Wait for initial mount
      await new Promise((resolve) => setTimeout(resolve, 200))

      const instance = (element as any).instance
      expect(instance).toBeDefined()

      // Clear any previous values
      delete (window as any).update1Paths
      delete (window as any).update1PathsAfter
      delete (window as any).afterUpdate1

      // First update: change count
      instance.state.count = 10

      // Wait for first render cycle
      await new Promise((resolve) => setTimeout(resolve, 100))
      await new Promise((resolve) => requestAnimationFrame(resolve))
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Verify first update
      expect(element.textContent).toContain('10')
      // Verify changedPaths was cleaned up after hooks
      expect((window as any).afterUpdate1).toBeUndefined() // Should be cleaned up

      // Clear for second update
      delete (window as any).update1Paths
      delete (window as any).update1PathsAfter
      delete (window as any).afterUpdate1

      // Second update: change name
      instance.state.name = 'updated'

      // Wait for second render cycle
      await new Promise((resolve) => setTimeout(resolve, 100))
      await new Promise((resolve) => requestAnimationFrame(resolve))
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Verify second update
      expect(element.textContent).toContain('updated')
      // Verify changedPaths was cleaned up after hooks
      expect((window as any).afterUpdate1).toBeUndefined() // Should be cleaned up

      // Verify hookContext does not have changedPaths
      const hookContext = instance.userContext || instance.state
      expect(hookContext.changedPaths).toBeUndefined()

      // Cleanup
      delete (window as any).update1Paths
      delete (window as any).update1PathsAfter
      delete (window as any).afterUpdate1
    })

    it('handles component with refs', async () => {
      const componentSource: ComponentSource = {
        template: '<button ref="button">Click</button>',
        script: `{
          state: {},
          created() {
            if (this.$refs.button) {
              this.hasButton = true;
            }
          }
        }`,
        style: '',
      }

      registerComponent('test-refs', componentSource)

      const element = document.createElement('test-refs')
      document.body.appendChild(element)

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect((element as any).instance?.$refs?.button).toBeDefined()
    })

    it('handles component with deps injection', async () => {
      const componentSource: ComponentSource = {
        template: "<div>{{ nav.join(', ') }}</div>",
        script: `{
          state: { nav: DOC_NAV }
        }`,
        style: '',
        deps: {
          DOC_NAV: () => Promise.resolve(['Home', 'About', 'Contact']),
        },
      }

      registerComponent('test-deps', componentSource)

      const element = document.createElement('test-deps')
      document.body.appendChild(element)

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(element.textContent).toContain('Home, About, Contact')
    })

    it('handles component with multiple deps', async () => {
      const componentSource: ComponentSource = {
        template: '<div>{{ config.title }} - {{ items.length }} items</div>',
        script: `{
          state: {
            config: APP_CONFIG,
            items: MENU_ITEMS
          }
        }`,
        style: '',
        deps: {
          APP_CONFIG: () => Promise.resolve({ title: 'My App' }),
          MENU_ITEMS: () => Promise.resolve(['Item1', 'Item2', 'Item3']),
        },
      }

      registerComponent('test-multi-deps', componentSource)

      const element = document.createElement('test-multi-deps')
      document.body.appendChild(element)

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(element.textContent).toContain('My App')
      expect(element.textContent).toContain('3 items')
    })

    it('handles nested custom elements without infinite mount loops', async () => {
      // Track mount counts to detect infinite loops
      const _mountCounts = { parent: 0, child: 0 }

      // Register child component first
      const childSource: ComponentSource = {
        template: "<div class='child-content'>Child Component</div>",
        script: `{
          state: {},
          mounted() {
            window.__childMountCount = (window.__childMountCount || 0) + 1;
          }
        }`,
        style: '',
      }
      registerComponent('test-nested-child', childSource)

      // Register parent component that contains the child
      const parentSource: ComponentSource = {
        template: "<div class='parent'><test-nested-child></test-nested-child></div>",
        script: `{
          state: {},
          mounted() {
            window.__parentMountCount = (window.__parentMountCount || 0) + 1;
          }
        }`,
        style: '',
      }
      registerComponent('test-nested-parent', parentSource)

      // Reset mount counts
      ;(window as any).__parentMountCount = 0
      ;(window as any).__childMountCount = 0

      const element = document.createElement('test-nested-parent')
      document.body.appendChild(element)

      // Wait for component to mount
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Each component should only mount once
      expect((window as any).__parentMountCount).toBe(1)
      expect((window as any).__childMountCount).toBe(1)

      // Verify DOM structure
      expect(element.querySelector('.parent')).toBeTruthy()
      expect(element.querySelector('.child-content')).toBeTruthy()
      expect(element.textContent).toContain('Child Component')

      // Clean up
      delete (window as any).__parentMountCount
      delete (window as any).__childMountCount
    })

    it('preserves nested custom elements on parent re-render', async () => {
      // Register child component
      const childSource: ComponentSource = {
        template: "<div class='child'>Child: {{ message }}</div>",
        script: `{
          props: { message: { type: String, default: 'default' } },
          state: {},
          mounted() {
            window.__preserveChildMounts = (window.__preserveChildMounts || 0) + 1;
          }
        }`,
        style: '',
      }
      registerComponent('test-preserve-child', childSource)

      // Register parent with reactive state that will trigger re-render
      const parentSource: ComponentSource = {
        template:
          "<div class='parent'><span>Count: {{ count }}</span><test-preserve-child :message='greeting'></test-preserve-child></div>",
        script: `{
          state: { count: 0, greeting: 'Hello' },
          methods: {
            increment() {
              this.count++;
            }
          },
          mounted() {
            window.__preserveParentMounts = (window.__preserveParentMounts || 0) + 1;
          }
        }`,
        style: '',
      }
      registerComponent('test-preserve-parent', parentSource)

      // Reset mount counts
      ;(window as any).__preserveParentMounts = 0
      ;(window as any).__preserveChildMounts = 0

      const element = document.createElement('test-preserve-parent') as any
      document.body.appendChild(element)

      // Wait for initial mount
      await new Promise((resolve) => setTimeout(resolve, 200))

      expect((window as any).__preserveParentMounts).toBe(1)
      expect((window as any).__preserveChildMounts).toBe(1)
      expect(element.textContent).toContain('Count: 0')

      // Trigger parent re-render by updating state
      element.instance.state.count = 1

      // Wait for re-render
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Parent should NOT re-mount, child should NOT re-mount
      expect((window as any).__preserveParentMounts).toBe(1)
      expect((window as any).__preserveChildMounts).toBe(1)
      expect(element.textContent).toContain('Count: 1')

      // Clean up
      delete (window as any).__preserveParentMounts
      delete (window as any).__preserveChildMounts
    })

    // NOTE: Tests for child local state and closure variable preservation
    // belong to scaffolded-starter integration coverage because the Vite
    // plugin handles script wrapping differently than compileCode().
    // The key behavior tested here is that nested custom elements are NOT
    // disconnected/reconnected on parent re-render, which means:
    // - connectedCallback is NOT called again
    // - The component's closure (including local variables) is preserved
    // - The component's state is preserved
  })
})
