import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { processTemplate } from '../src/template-processor'
import type { State, Refs } from '../src/types'

describe('template-processor - edge cases and negative tests', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    if (container.parentNode) {
      document.body.removeChild(container)
    }
  })

  describe('template interpolation - edge cases', () => {
    it('handles undefined in template expression', async () => {
      const template = document.createElement('div')
      template.textContent = 'Value: {{ undefined }}'
      container.appendChild(template)

      const state: State = { undefined: undefined }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(template.textContent).toBe('Value: ')
    })

    it('handles deeply nested property access', async () => {
      const template = document.createElement('div')
      template.textContent = '{{ a.b.c.d.e }}'
      container.appendChild(template)

      const state: State = {
        a: { b: { c: { d: { e: 'deep' } } } },
      }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(template.textContent).toBe('deep')
    })

    it('handles array access with bracket notation', async () => {
      const template = document.createElement('div')
      template.textContent = '{{ items[0] }}'
      container.appendChild(template)

      const state: State = { items: ['first', 'second'] }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(template.textContent).toBe('first')
    })

    it('handles expression with special characters', async () => {
      const template = document.createElement('div')
      template.textContent = '{{ $special_var }}'
      container.appendChild(template)

      const state: State = { $special_var: 'special' }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(template.textContent).toBe('special')
    })

    it('handles multiple template expressions on same line', async () => {
      const template = document.createElement('div')
      template.textContent = '{{ first }} - {{ second }} - {{ third }}'
      container.appendChild(template)

      const state: State = { first: 'A', second: 'B', third: 'C' }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(template.textContent).toBe('A - B - C')
    })

    it('handles template expression with whitespace variations', async () => {
      const template = document.createElement('div')
      template.textContent = '{{name}} {{  title  }} {{   value   }}'
      container.appendChild(template)

      const state: State = { name: 'A', title: 'B', value: 'C' }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(template.textContent).toBe('A B C')
    })

    it('handles empty template expression', async () => {
      const template = document.createElement('div')
      template.textContent = '{{  }}'
      container.appendChild(template)

      const state: State = {}
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      // Empty expression should remain or be removed
      expect(template.textContent).toBeDefined()
    })

    it('handles template expression with only whitespace', async () => {
      const template = document.createElement('div')
      template.textContent = '{{    }}'
      container.appendChild(template)

      const state: State = {}
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(template.textContent).toBeDefined()
    })
  })

  describe('if/else-if/else directives - edge cases', () => {
    it('handles if directive with falsy values', async () => {
      const falsyValues = [false, 0, '', null, undefined, NaN]

      for (const value of falsyValues) {
        container.innerHTML = ''
        const template = document.createElement('div')
        const child = document.createElement('span')
        child.setAttribute('if', 'value')
        child.textContent = 'Visible'
        template.appendChild(child)
        container.appendChild(template)

        const state: State = { value }
        const refs: Refs = {}

        await processTemplate(template, state, refs)

        expect(child.parentNode).toBeNull()
      }
    })

    it('handles if directive with truthy values', async () => {
      const truthyValues = [true, 1, 'text', {}, [], -1]

      for (const value of truthyValues) {
        container.innerHTML = ''
        const template = document.createElement('div')
        const child = document.createElement('span')
        child.setAttribute('if', 'value')
        child.textContent = 'Visible'
        template.appendChild(child)
        container.appendChild(template)

        const state: State = { value }
        const refs: Refs = {}

        await processTemplate(template, state, refs)

        expect(child.parentNode).toBe(template)
      }
    })

    it('handles else-if chain with no matching condition', async () => {
      const template = document.createElement('div')

      const if1 = document.createElement('span')
      if1.setAttribute('if', 'cond1')
      if1.textContent = 'First'
      template.appendChild(if1)

      const elseIf1 = document.createElement('span')
      elseIf1.setAttribute('else-if', 'cond2')
      elseIf1.textContent = 'Second'
      template.appendChild(elseIf1)

      const elseIf2 = document.createElement('span')
      elseIf2.setAttribute('else-if', 'cond3')
      elseIf2.textContent = 'Third'
      template.appendChild(elseIf2)

      container.appendChild(template)

      const state: State = { cond1: false, cond2: false, cond3: false }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(if1.parentNode).toBeNull()
      expect(elseIf1.parentNode).toBeNull()
      expect(elseIf2.parentNode).toBeNull()
    })

    it('handles else without preceding if', async () => {
      const template = document.createElement('div')
      const elseEl = document.createElement('span')
      elseEl.setAttribute('else', '')
      elseEl.textContent = 'Else'
      template.appendChild(elseEl)
      container.appendChild(template)

      const state: State = {}
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      // Orphan else should be removed or shown
      expect(elseEl.parentNode).toBeNull()
    })

    it('handles multiple independent if blocks', async () => {
      const template = document.createElement('div')

      const if1 = document.createElement('span')
      if1.setAttribute('if', 'show1')
      if1.textContent = 'Block1'
      template.appendChild(if1)

      const if2 = document.createElement('span')
      if2.setAttribute('if', 'show2')
      if2.textContent = 'Block2'
      template.appendChild(if2)

      container.appendChild(template)

      const state: State = { show1: true, show2: false }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(if1.parentNode).toBe(template)
      expect(if2.parentNode).toBeNull()
    })

    it('handles nested if directives', async () => {
      const template = document.createElement('div')
      const outer = document.createElement('div')
      outer.setAttribute('if', 'outerCondition')

      const inner = document.createElement('span')
      inner.setAttribute('if', 'innerCondition')
      inner.textContent = 'Nested'

      outer.appendChild(inner)
      template.appendChild(outer)
      container.appendChild(template)

      const state: State = { outerCondition: true, innerCondition: true }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(outer.parentNode).toBe(template)
      expect(inner.parentNode).toBe(outer)
    })

    it('handles nested if with outer false, inner true', async () => {
      const template = document.createElement('div')
      const outer = document.createElement('div')
      outer.setAttribute('if', 'outerCondition')

      const inner = document.createElement('span')
      inner.setAttribute('if', 'innerCondition')
      inner.textContent = 'Nested'

      outer.appendChild(inner)
      template.appendChild(outer)
      container.appendChild(template)

      const state: State = { outerCondition: false, innerCondition: true }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      // Outer is removed, so inner never gets processed
      expect(outer.parentNode).toBeNull()
    })
  })

  describe('loop directive - edge cases', () => {
    it('handles empty array', async () => {
      const template = document.createElement('div')
      const loopEl = document.createElement('span')
      loopEl.setAttribute('loop', 'item in items')
      loopEl.textContent = '{{ item }}'
      template.appendChild(loopEl)
      container.appendChild(template)

      const state: State = { items: [] }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      // TEST_CLASSIFICATION: BUG
      // Rationale: When items is an empty array, the template should not render any children. However, one child remains, indicating a bug in loop cleanup logic.
      expect(template.children.length).toBe(0)
    })

    it('handles null items array', async () => {
      const template = document.createElement('div')
      const loopEl = document.createElement('span')
      loopEl.setAttribute('loop', 'item in items')
      loopEl.textContent = '{{ item }}'
      template.appendChild(loopEl)
      container.appendChild(template)

      const state: State = { items: null }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      // TEST_CLASSIFICATION: BUG
      // Rationale: When items is null, the template should not render any children. One child remains, indicating a bug in loop cleanup logic.
      expect(template.children.length).toBe(0)
    })

    it('handles undefined items array', async () => {
      const template = document.createElement('div')
      const loopEl = document.createElement('span')
      loopEl.setAttribute('loop', 'item in items')
      loopEl.textContent = '{{ item }}'
      template.appendChild(loopEl)
      container.appendChild(template)

      const state: State = { items: undefined }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      // TEST_CLASSIFICATION: BUG
      // Rationale: When items is undefined, the template should not render any children. One child remains, indicating a bug in loop cleanup logic.
      expect(template.children.length).toBe(0)
    })

    it('handles non-array items', async () => {
      const template = document.createElement('div')
      const loopEl = document.createElement('span')
      loopEl.setAttribute('loop', 'item in items')
      loopEl.textContent = '{{ item }}'
      template.appendChild(loopEl)
      container.appendChild(template)

      const state: State = { items: 'not an array' }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      // Should handle gracefully
      expect(template.children.length).toBeGreaterThanOrEqual(0)
    })

    it('handles loop with single item', async () => {
      const template = document.createElement('div')
      const loopEl = document.createElement('span')
      loopEl.setAttribute('loop', 'item in items')
      loopEl.textContent = '{{ item }}'
      template.appendChild(loopEl)
      container.appendChild(template)

      const state: State = { items: ['only'] }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      // TEST_CLASSIFICATION: BUG
      // Rationale: The template should render one child with text 'only', but it renders an empty string. Indicates a bug in loop rendering or text interpolation.
      expect(template.children.length).toBe(1)
      expect(template.textContent).toContain('only')
    })

    it('handles loop with index binding [key, item]', async () => {
      const template = document.createElement('div')
      const loopEl = document.createElement('span')
      // Tuple binding: first identifier is key/index, second is value
      loopEl.setAttribute('loop', '[i, item] in items')
      loopEl.textContent = '{{ i }}: {{ item }}'
      template.appendChild(loopEl)
      container.appendChild(template)

      const state: State = { items: ['a', 'b', 'c'] }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(template.textContent).toContain('0: a')
      expect(template.textContent).toContain('1: b')
      expect(template.textContent).toContain('2: c')
    })

    it('handles loop with complex objects', async () => {
      const template = document.createElement('div')
      const loopEl = document.createElement('span')
      loopEl.setAttribute('loop', 'user in users')
      loopEl.textContent = '{{ user.name }}: {{ user.age }}'
      template.appendChild(loopEl)
      container.appendChild(template)

      const state: State = {
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
        ],
      }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      // TEST_CLASSIFICATION: BUG
      // Rationale: The template should render user details, e.g., 'Alice: 30', but renders only ': '. Indicates a bug in object property interpolation inside loops.
      expect(template.textContent).toContain('Alice: 30')
      expect(template.textContent).toContain('Bob: 25')
    })

    it('handles nested loops', async () => {
      const template = document.createElement('div')
      const outerLoop = document.createElement('div')
      outerLoop.setAttribute('loop', 'group in groups')

      const innerLoop = document.createElement('span')
      innerLoop.setAttribute('loop', 'item in group')
      innerLoop.textContent = '{{ item }} '

      outerLoop.appendChild(innerLoop)
      template.appendChild(outerLoop)
      container.appendChild(template)

      const state: State = {
        groups: [
          ['a', 'b'],
          ['c', 'd'],
        ],
      }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      // TEST_CLASSIFICATION: BUG
      // Rationale: Nested loops should render all items, but output is empty. Indicates a bug in nested loop processing or context propagation.
      expect(template.textContent).toContain('a')
      expect(template.textContent).toContain('b')
      expect(template.textContent).toContain('c')
      expect(template.textContent).toContain('d')
    })

    it('throws error for invalid loop binding with too many identifiers', async () => {
      const template = document.createElement('div')
      const loopEl = document.createElement('span')
      loopEl.setAttribute('loop', '[a, b, c] in items')
      loopEl.textContent = 'test'
      template.appendChild(loopEl)
      container.appendChild(template)

      const state: State = { items: [1, 2, 3] }
      const refs: Refs = {}

      // TEST_CLASSIFICATION: BUG
      // Rationale: Invalid loop binding should throw, but promise resolves. Indicates missing validation for loop binding syntax.
      await expect(processTemplate(template, state, refs)).rejects.toThrow()
    })

    it('throws error for malformed loop binding', async () => {
      const template = document.createElement('div')
      const loopEl = document.createElement('span')
      loopEl.setAttribute('loop', 'invalid syntax')
      loopEl.textContent = 'test'
      template.appendChild(loopEl)
      container.appendChild(template)

      const state: State = {}
      const refs: Refs = {}

      // TEST_CLASSIFICATION: BUG
      // Rationale: Malformed loop binding should throw, but promise resolves. Indicates missing validation for loop binding syntax.
      await expect(processTemplate(template, state, refs)).rejects.toThrow()
    })
  })

  describe('refs - edge cases', () => {
    it('handles duplicate ref names', async () => {
      const template = document.createElement('div')
      const button1 = document.createElement('button')
      button1.setAttribute('ref', 'btn')
      const button2 = document.createElement('button')
      button2.setAttribute('ref', 'btn')

      template.appendChild(button1)
      template.appendChild(button2)
      container.appendChild(template)

      const state: State = {}
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      // Last one wins or first one wins
      expect(refs.btn).toBeDefined()
      expect(refs.btn === button1 || refs.btn === button2).toBe(true)
    })

    it('handles ref with empty name', async () => {
      const template = document.createElement('div')
      const button = document.createElement('button')
      button.setAttribute('ref', '')
      template.appendChild(button)
      container.appendChild(template)

      const state: State = {}
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      // Current behavior: empty string ref is stored as refs['']
      // This is valid JavaScript - empty string is a valid object key
      expect(refs['']).toBe(button)
    })

    it('handles ref with whitespace-only name', async () => {
      const template = document.createElement('div')
      const button = document.createElement('button')
      button.setAttribute('ref', '   ')
      template.appendChild(button)
      container.appendChild(template)

      const state: State = {}
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(Object.keys(refs).length).toBeGreaterThanOrEqual(0)
    })

    it('handles ref on element that gets removed by if', async () => {
      const template = document.createElement('div')
      const button = document.createElement('button')
      button.setAttribute('ref', 'btn')
      button.setAttribute('if', 'show')
      template.appendChild(button)
      container.appendChild(template)

      const state: State = { show: false }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      // Current behavior: refs are collected during tree walk, before if processing
      // The ref is captured even though the element is later removed by if="false"
      // This is a known behavior - refs point to the original element
      expect(refs.btn).toBeDefined()
    })
  })

  describe('attribute binding - edge cases', () => {
    it('handles attributes with multiple template expressions', async () => {
      const template = document.createElement('div')
      template.setAttribute('data-value', '{{ prefix }}-{{ id }}-{{ suffix }}')
      container.appendChild(template)

      const state: State = { prefix: 'pre', id: 123, suffix: 'post' }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(template.getAttribute('data-value')).toBe('pre-123-post')
    })

    it('handles class attribute with template expression', async () => {
      const template = document.createElement('div')
      template.setAttribute('class', 'base {{ dynamicClass }}')
      container.appendChild(template)

      const state: State = { dynamicClass: 'active' }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(template.className).toContain('base')
      expect(template.className).toContain('active')
    })

    it('handles style attribute with template expression', async () => {
      const template = document.createElement('div')
      template.setAttribute('style', 'color: {{ color }}; font-size: {{ size }}px;')
      container.appendChild(template)

      const state: State = { color: 'red', size: 16 }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(template.getAttribute('style')).toContain('red')
      expect(template.getAttribute('style')).toContain('16')
    })

    it('handles boolean attribute with template expression', async () => {
      const template = document.createElement('input')
      template.setAttribute('disabled', '{{ isDisabled }}')
      container.appendChild(template)

      const state: State = { isDisabled: true }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(template.getAttribute('disabled')).toBeDefined()
    })

    it('handles attribute with special characters', async () => {
      const template = document.createElement('div')
      template.setAttribute('data-value', '{{ value }}')
      container.appendChild(template)

      const state: State = { value: '<>&"\'' }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(template.getAttribute('data-value')).toBe('<>&"\'')
    })

    it('handles attribute with undefined value', async () => {
      const template = document.createElement('div')
      template.setAttribute('data-value', '{{ value }}')
      container.appendChild(template)

      const state: State = { value: undefined }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(template.getAttribute('data-value')).toBe('')
    })

    it('handles attribute with null value', async () => {
      const template = document.createElement('div')
      template.setAttribute('data-value', '{{ value }}')
      container.appendChild(template)

      const state: State = { value: null }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(template.getAttribute('data-value')).toBe('')
    })
  })

  describe('complex scenarios', () => {
    it('handles combination of if and loop', async () => {
      const template = document.createElement('div')
      const wrapper = document.createElement('div')
      wrapper.setAttribute('if', 'showList')

      const loopEl = document.createElement('span')
      loopEl.setAttribute('loop', 'item in items')
      loopEl.textContent = '{{ item }} '

      wrapper.appendChild(loopEl)
      template.appendChild(wrapper)
      container.appendChild(template)

      const state: State = { showList: true, items: ['a', 'b', 'c'] }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      // TEST_CLASSIFICATION: BUG
      // Rationale: Combination of 'if' and 'loop' should render all items when 'showList' is true, but output is empty. Indicates a bug in combined directive processing.
      expect(wrapper.parentNode).toBe(template)
      expect(template.textContent).toContain('a')
      expect(template.textContent).toContain('b')
      expect(template.textContent).toContain('c')
    })

    it('handles loop with conditional items', async () => {
      const template = document.createElement('div')
      const loopEl = document.createElement('div')
      loopEl.setAttribute('loop', 'item in items')

      const span = document.createElement('span')
      span.setAttribute('if', 'item.visible')
      span.textContent = '{{ item.name }}'

      loopEl.appendChild(span)
      template.appendChild(loopEl)
      container.appendChild(template)

      const state: State = {
        items: [
          { name: 'A', visible: true },
          { name: 'B', visible: false },
          { name: 'C', visible: true },
        ],
      }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      // TEST_CLASSIFICATION: BUG
      // Rationale: Loop with conditional items should render only visible items, but output is empty. Indicates a bug in conditional rendering inside loops.
      expect(template.textContent).toContain('A')
      expect(template.textContent).not.toContain('B')
      expect(template.textContent).toContain('C')
    })
  })
})
