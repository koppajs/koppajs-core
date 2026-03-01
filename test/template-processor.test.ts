import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { processTemplate } from '../src/template-processor'
import type { State, Refs } from '../src/types'

describe('template-processor', () => {
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

  describe('processTemplate', () => {
    it('replaces template strings in text nodes', async () => {
      const template = document.createElement('div')
      template.textContent = 'Hello {{ name }}!'
      container.appendChild(template)

      const state: State = { name: 'World' }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(template.textContent).toBe('Hello World!')
    })

    it('handles multiple template strings', async () => {
      const template = document.createElement('div')
      template.textContent = '{{ firstName }} {{ lastName }}'
      container.appendChild(template)

      const state: State = { firstName: 'John', lastName: 'Doe' }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(template.textContent).toBe('John Doe')
    })

    it('handles null and undefined values', async () => {
      const template = document.createElement('div')
      template.textContent = 'Value: {{ value }}'
      container.appendChild(template)

      const state: State = { value: null }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(template.textContent).toBe('Value: ')
    })

    it('interpolates attributes', async () => {
      const template = document.createElement('div')
      template.setAttribute('data-id', '{{ id }}')
      template.setAttribute('class', 'item-{{ index }}')
      container.appendChild(template)

      const state: State = { id: 123, index: 0 }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(template.getAttribute('data-id')).toBe('123')
      expect(template.getAttribute('class')).toBe('item-0')
    })

    it('collects ref elements', async () => {
      const template = document.createElement('div')
      const child = document.createElement('button')
      child.setAttribute('ref', 'submitButton')
      template.appendChild(child)
      container.appendChild(template)

      const state: State = {}
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(refs.submitButton).toBe(child)
    })

    it('handles if directive - true condition', async () => {
      const template = document.createElement('div')
      const child = document.createElement('span')
      child.setAttribute('if', 'show')
      child.textContent = 'Visible'
      template.appendChild(child)
      container.appendChild(template)

      const state: State = { show: true }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(child.parentNode).toBe(template)
      expect(child.hasAttribute('if')).toBe(false)
      expect(child.textContent).toBe('Visible')
    })

    it('handles if directive - false condition', async () => {
      const template = document.createElement('div')
      const child = document.createElement('span')
      child.setAttribute('if', 'show')
      child.textContent = 'Hidden'
      template.appendChild(child)
      container.appendChild(template)

      const state: State = { show: false }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(child.parentNode).toBeNull()
    })

    it('handles else-if directive', async () => {
      const template = document.createElement('div')
      const ifEl = document.createElement('span')
      ifEl.setAttribute('if', 'condition1')
      ifEl.textContent = 'First'
      template.appendChild(ifEl)

      const elseIfEl = document.createElement('span')
      elseIfEl.setAttribute('else-if', 'condition2')
      elseIfEl.textContent = 'Second'
      template.appendChild(elseIfEl)

      container.appendChild(template)

      const state: State = { condition1: false, condition2: true }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(ifEl.parentNode).toBeNull()
      expect(elseIfEl.parentNode).toBe(template)
      expect(elseIfEl.hasAttribute('else-if')).toBe(false)
    })

    it('handles else directive', async () => {
      const template = document.createElement('div')
      const ifEl = document.createElement('span')
      ifEl.setAttribute('if', 'condition')
      ifEl.textContent = 'If'
      template.appendChild(ifEl)

      const elseEl = document.createElement('span')
      elseEl.setAttribute('else', '')
      elseEl.textContent = 'Else'
      template.appendChild(elseEl)

      container.appendChild(template)

      const state: State = { condition: false }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(ifEl.parentNode).toBeNull()
      expect(elseEl.parentNode).toBe(template)
      expect(elseEl.hasAttribute('else')).toBe(false)
    })

    it('handles loop directive with object', async () => {
      const template = document.createElement('div')
      const item = document.createElement('div')
      item.setAttribute('loop', 'item in items')
      item.textContent = '{{ item }} ({{ index }})'
      template.appendChild(item)
      container.appendChild(template)

      const state: State = {
        items: {
          a: 'First',
          b: 'Second',
          c: 'Third',
        },
      }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      // Original element should be replaced
      expect(item.parentNode).toBeNull()

      // Should have 3 children
      const children = Array.from(template.children)
      expect(children.length).toBe(3)
      expect(children[0].textContent).toContain('First')
      expect(children[1].textContent).toContain('Second')
      expect(children[2].textContent).toContain('Third')
    })

    it('handles loop with if condition', async () => {
      const template = document.createElement('div')
      const item = document.createElement('div')
      item.setAttribute('loop', 'item in items')
      item.setAttribute('if', 'item.visible')
      item.textContent = '{{ item.name }}'
      template.appendChild(item)
      container.appendChild(template)

      const state: State = {
        items: {
          a: { name: 'Visible', visible: true },
          b: { name: 'Hidden', visible: false },
          c: { name: 'Also Visible', visible: true },
        },
      }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      const children = Array.from(template.children)
      expect(children.length).toBe(2)
      expect(children[0].textContent).toBe('Visible')
      expect(children[1].textContent).toBe('Also Visible')
    })

    it('skips custom elements', async () => {
      const template = document.createElement('div')
      const customEl = document.createElement('my-custom-element')
      customEl.textContent = '{{ value }}'
      template.appendChild(customEl)
      container.appendChild(template)

      const state: State = { value: 'test' }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      // Custom element content should not be processed
      expect(customEl.textContent).toBe('{{ value }}')
    })

    it('handles HTML in template strings', async () => {
      const template = document.createElement('div')
      template.textContent = '{{ html }}'
      container.appendChild(template)

      const state: State = { html: '<strong>Bold</strong>' }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(template.querySelector('strong')).not.toBeNull()
      expect(template.textContent).toBe('Bold')
    })

    it('handles nested template strings', async () => {
      const template = document.createElement('div')
      template.innerHTML = '<span>{{ inner }}</span>'
      container.appendChild(template)

      const state: State = { inner: 'Nested' }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      expect(template.querySelector('span')?.textContent).toBe('Nested')
    })

    it('handles loop index variables', async () => {
      const template = document.createElement('div')
      const item = document.createElement('div')
      item.setAttribute('loop', 'item in items')
      // Use ternary expressions to test boolean loop variables (booleans render as empty string)
      item.textContent =
        "{{ item }}: first={{ isFirst ? 'yes' : 'no' }}, last={{ isLast ? 'yes' : 'no' }}, even={{ isEven ? 'yes' : 'no' }}, odd={{ isOdd ? 'yes' : 'no' }}"
      template.appendChild(item)
      container.appendChild(template)

      const state: State = {
        items: {
          a: 'A',
          b: 'B',
          c: 'C',
        },
      }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      const children = Array.from(template.children)
      expect(children[0].textContent).toContain('first=yes')
      expect(children[0].textContent).toContain('last=no')
      expect(children[0].textContent).toContain('even=yes')
      expect(children[0].textContent).toContain('odd=no')

      expect(children[2].textContent).toContain('first=no')
      expect(children[2].textContent).toContain('last=yes')
      expect(children[2].textContent).toContain('even=yes')
    })

    it('handles loop directive with array', async () => {
      const template = document.createElement('div')
      const item = document.createElement('div')
      item.setAttribute('loop', 'item in items')
      item.textContent = '{{ item }} ({{ index }})'
      template.appendChild(item)
      container.appendChild(template)

      const state: State = {
        items: ['First', 'Second', 'Third'],
      }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      // Original element should be replaced
      expect(item.parentNode).toBeNull()

      // Should have 3 children
      const children = Array.from(template.children)
      expect(children.length).toBe(3)
      expect(children[0].textContent).toBe('First (0)')
      expect(children[1].textContent).toBe('Second (1)')
      expect(children[2].textContent).toBe('Third (2)')
    })

    it('handles loop with array of objects', async () => {
      const template = document.createElement('div')
      const item = document.createElement('div')
      item.setAttribute('loop', 'user in users')
      item.textContent = '{{ user.name }}: {{ user.age }}'
      template.appendChild(item)
      container.appendChild(template)

      const state: State = {
        users: [
          { name: 'Alice', age: 25 },
          { name: 'Bob', age: 30 },
        ],
      }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      const children = Array.from(template.children)
      expect(children.length).toBe(2)
      expect(children[0].textContent).toBe('Alice: 25')
      expect(children[1].textContent).toBe('Bob: 30')
    })

    it('handles loop with dotted path expression', async () => {
      const template = document.createElement('div')
      const item = document.createElement('div')
      item.setAttribute('loop', 'item in group.items')
      item.textContent = '{{ item }}'
      template.appendChild(item)
      container.appendChild(template)

      const state: State = {
        group: {
          items: {
            a: 'First',
            b: 'Second',
          },
        },
      }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      const children = Array.from(template.children)
      expect(children.length).toBe(2)
      expect(children[0].textContent).toBe('First')
      expect(children[1].textContent).toBe('Second')
    })

    it('handles loop with nested dotted path and array', async () => {
      const template = document.createElement('div')
      const item = document.createElement('div')
      item.setAttribute('loop', 'child in item.children')
      item.textContent = '{{ child.name }}'
      template.appendChild(item)
      container.appendChild(template)

      const state: State = {
        item: {
          children: [{ name: 'Child A' }, { name: 'Child B' }, { name: 'Child C' }],
        },
      }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      const children = Array.from(template.children)
      expect(children.length).toBe(3)
      expect(children[0].textContent).toBe('Child A')
      expect(children[1].textContent).toBe('Child B')
      expect(children[2].textContent).toBe('Child C')
    })

    it('handles loop with array index variables', async () => {
      const template = document.createElement('div')
      const item = document.createElement('div')
      item.setAttribute('loop', 'item in items')
      // Use ternary expressions to test boolean loop variables (booleans render as empty string)
      item.textContent =
        "{{ item }}: key={{ key }}, first={{ isFirst ? 'yes' : 'no' }}, last={{ isLast ? 'yes' : 'no' }}"
      template.appendChild(item)
      container.appendChild(template)

      const state: State = {
        items: ['A', 'B', 'C'],
      }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      const children = Array.from(template.children)
      expect(children[0].textContent).toContain('key=0')
      expect(children[0].textContent).toContain('first=yes')
      expect(children[0].textContent).toContain('last=no')

      expect(children[2].textContent).toContain('key=2')
      expect(children[2].textContent).toContain('first=no')
      expect(children[2].textContent).toContain('last=yes')
    })

    it('handles tuple binding [key, item] in object', async () => {
      const template = document.createElement('div')
      const item = document.createElement('div')
      item.setAttribute('loop', '[k, v] in items')
      item.textContent = '{{ k }}={{ v }}'
      template.appendChild(item)
      container.appendChild(template)

      const state: State = {
        items: {
          name: 'Alice',
          age: '30',
          city: 'NYC',
        },
      }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      const children = Array.from(template.children)
      expect(children.length).toBe(3)
      expect(children[0].textContent).toBe('name=Alice')
      expect(children[1].textContent).toBe('age=30')
      expect(children[2].textContent).toBe('city=NYC')
    })

    it('handles tuple binding [i, item] in array', async () => {
      const template = document.createElement('div')
      const item = document.createElement('div')
      item.setAttribute('loop', '[i, val] in items')
      item.textContent = '{{ i }}: {{ val }}'
      template.appendChild(item)
      container.appendChild(template)

      const state: State = {
        items: ['First', 'Second', 'Third'],
      }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      const children = Array.from(template.children)
      expect(children.length).toBe(3)
      expect(children[0].textContent).toBe('0: First')
      expect(children[1].textContent).toBe('1: Second')
      expect(children[2].textContent).toBe('2: Third')
    })

    it('throws error for invalid tuple binding with 3 identifiers', async () => {
      const template = document.createElement('div')
      const item = document.createElement('div')
      item.setAttribute('loop', '[a, b, c] in items')
      item.textContent = '{{ a }}'
      template.appendChild(item)
      container.appendChild(template)

      const state: State = {
        items: ['A', 'B'],
      }
      const refs: Refs = {}

      await expect(processTemplate(template, state, refs)).rejects.toThrow(
        'Invalid loop binding: expected <id> or [<id>, <id>]',
      )
    })

    it('handles empty array without throwing', async () => {
      const template = document.createElement('div')
      const item = document.createElement('div')
      item.setAttribute('loop', '[key, val] in items')
      item.textContent = '{{ key }}={{ val }}'
      template.appendChild(item)
      container.appendChild(template)

      const state: State = {
        items: [],
      }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      // Template element should be removed and no children rendered
      expect(item.parentNode).toBeNull()
      expect(template.children.length).toBe(0)
    })

    it('handles empty object without throwing', async () => {
      const template = document.createElement('div')
      const item = document.createElement('div')
      item.setAttribute('loop', '[key, val] in items')
      item.textContent = '{{ key }}={{ val }}'
      template.appendChild(item)
      container.appendChild(template)

      const state: State = {
        items: {},
      }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      // Template element should be removed and no children rendered
      expect(item.parentNode).toBeNull()
      expect(template.children.length).toBe(0)
    })

    it('tuple binding preserves implicit loop variables', async () => {
      const template = document.createElement('div')
      const item = document.createElement('div')
      item.setAttribute('loop', '[k, v] in items')
      // Use ternary expression to test boolean loop variable (booleans render as empty string)
      item.textContent =
        "{{ k }}={{ v }}, index={{ index }}, isFirst={{ isFirst ? 'yes' : 'no' }}"
      template.appendChild(item)
      container.appendChild(template)

      const state: State = {
        items: { a: 'X', b: 'Y' },
      }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      const children = Array.from(template.children)
      expect(children.length).toBe(2)
      expect(children[0].textContent).toBe('a=X, index=0, isFirst=yes')
      expect(children[1].textContent).toBe('b=Y, index=1, isFirst=no')
    })

    it('processes dynamic attributes inside loops', async () => {
      const template = document.createElement('div')
      template.innerHTML = `
        <div loop="item in items">
          <a :href="item.path" :data-id="item.id">{{ item.title }}</a>
        </div>
      `
      container.appendChild(template)

      const state: State = {
        items: [
          { id: 1, path: '/home', title: 'Home' },
          { id: 2, path: '/about', title: 'About' },
        ],
      }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      const links = template.querySelectorAll('a')
      expect(links.length).toBe(2)

      expect(links[0].getAttribute('href')).toBe('/home')
      expect(links[0].getAttribute('data-id')).toBe('1')
      expect(links[0].textContent?.trim()).toBe('Home')
      // :href should be removed
      expect(links[0].hasAttribute(':href')).toBe(false)

      expect(links[1].getAttribute('href')).toBe('/about')
      expect(links[1].getAttribute('data-id')).toBe('2')
      expect(links[1].textContent?.trim()).toBe('About')
    })

    it('processes :class with object syntax inside loops', async () => {
      const template = document.createElement('div')
      template.innerHTML = `
        <div loop="item in items" :class="{ 'active': item.active, 'disabled': item.disabled }">
          {{ item.name }}
        </div>
      `
      container.appendChild(template)

      const state: State = {
        items: [
          { name: 'First', active: true, disabled: false },
          { name: 'Second', active: false, disabled: true },
        ],
      }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      const divs = template.querySelectorAll('div')
      expect(divs.length).toBe(2)

      expect(divs[0].classList.contains('active')).toBe(true)
      expect(divs[0].classList.contains('disabled')).toBe(false)
      expect(divs[0].hasAttribute(':class')).toBe(false)

      expect(divs[1].classList.contains('active')).toBe(false)
      expect(divs[1].classList.contains('disabled')).toBe(true)
    })

    it('processes dynamic attributes in nested loops', async () => {
      const template = document.createElement('div')
      template.innerHTML = `
        <div loop="group in navGroups">
          <span>{{ group.title }}</span>
          <ul>
            <li loop="item in group.items" :class="{ 'has-children': item.children && item.children.length > 0 }">
              <a :href="item.path">{{ item.title }}</a>
            </li>
          </ul>
        </div>
      `
      container.appendChild(template)

      const state: State = {
        navGroups: [
          {
            title: 'Group 1',
            items: [
              { title: 'Home', path: '/', children: [] },
              { title: 'About', path: '/about', children: [{ title: 'Team' }] },
            ],
          },
          {
            title: 'Group 2',
            items: [{ title: 'Contact', path: '/contact', children: [] }],
          },
        ],
      }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      // Should have 2 groups
      const groupDivs = template.querySelectorAll(':scope > div')
      expect(groupDivs.length).toBe(2)

      // First group should have 2 items
      const group1Items = groupDivs[0].querySelectorAll('li')
      expect(group1Items.length).toBe(2)

      // First item should NOT have has-children (empty array)
      expect(group1Items[0].classList.contains('has-children')).toBe(false)
      expect(group1Items[0].hasAttribute(':class')).toBe(false)

      // Second item SHOULD have has-children (has one child)
      expect(group1Items[1].classList.contains('has-children')).toBe(true)

      // Check href attributes
      const links = template.querySelectorAll('a')
      expect(links.length).toBe(3)
      expect(links[0].getAttribute('href')).toBe('/')
      expect(links[0].hasAttribute(':href')).toBe(false)
      expect(links[1].getAttribute('href')).toBe('/about')
      expect(links[2].getAttribute('href')).toBe('/contact')
    })

    it('processes mustache class expressions referencing loop variables', async () => {
      const template = document.createElement('div')
      template.innerHTML = `
        <ul>
          <li loop="item in items" class="{{ item.children && item.children.length > 0 ? 'nav-item-with-submenu' : '' }}">
            <span>{{ item.title }}</span>
          </li>
        </ul>
      `
      container.appendChild(template)

      const state: State = {
        items: [
          { title: 'Home', children: [] },
          {
            title: 'About',
            children: [{ title: 'Team' }, { title: 'History' }],
          },
          { title: 'Contact', children: [] },
        ],
      }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      const listItems = template.querySelectorAll('li')
      expect(listItems.length).toBe(3)

      // First item has no children - class should be empty, NOT "false"
      expect(listItems[0].getAttribute('class')).toBe('')
      expect(listItems[0].getAttribute('class')).not.toBe('false')

      // Second item has children - class should be "nav-item-with-submenu"
      expect(listItems[1].getAttribute('class')).toBe('nav-item-with-submenu')

      // Third item has no children - class should be empty, NOT "false"
      expect(listItems[2].getAttribute('class')).toBe('')

      // Regression: ensure no class="false" appears anywhere in the rendered output
      expect(template.innerHTML).not.toContain('class="false"')
      expect(template.innerHTML).not.toContain(' false')
    })

    it('processes mustache attribute expressions with ternary using loop variable properties', async () => {
      const template = document.createElement('div')
      template.innerHTML = `
        <div loop="user in users" data-status="{{ user.isActive ? 'online' : 'offline' }}">
          {{ user.name }}
        </div>
      `
      container.appendChild(template)

      const state: State = {
        users: [
          { name: 'Alice', isActive: true },
          { name: 'Bob', isActive: false },
        ],
      }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      const divs = template.querySelectorAll('div')
      expect(divs.length).toBe(2)

      // The attribute should be correctly evaluated with loop variable
      expect(divs[0].getAttribute('data-status')).toBe('online')
      expect(divs[1].getAttribute('data-status')).toBe('offline')
    })

    it('processes mustache class expressions in nested loops referencing outer loop variable', async () => {
      // This mimics the real-world scenario from app-sidebar.kpa
      // where inner loop uses outer loop's variable in group.items
      const template = document.createElement('div')
      template.innerHTML = `
        <div loop="group in navGroups">
          <span>{{ group.title }}</span>
          <ul>
            <li loop="item in group.items" class="{{ item.children && item.children.length > 0 ? 'nav-item-with-submenu' : '' }}">
              <span>{{ item.title }}</span>
            </li>
          </ul>
        </div>
      `
      container.appendChild(template)

      const state: State = {
        navGroups: [
          {
            title: 'Group 1',
            items: [
              { title: 'Home', children: [] },
              { title: 'About', children: [{ title: 'Team' }] },
            ],
          },
          {
            title: 'Group 2',
            items: [
              { title: 'Contact', children: [] },
              {
                title: 'Docs',
                children: [{ title: 'API' }, { title: 'Guide' }],
              },
            ],
          },
        ],
      }
      const refs: Refs = {}

      await processTemplate(template, state, refs)

      // Should have 2 groups
      const groupDivs = template.querySelectorAll(':scope > div')
      expect(groupDivs.length).toBe(2)

      // Collect all list items
      const listItems = template.querySelectorAll('li')
      expect(listItems.length).toBe(4)

      // Check classes - items with children should have 'nav-item-with-submenu'
      // Items without children should have empty class, NOT "false"

      // Group 1, Item 1: Home (no children)
      expect(listItems[0].getAttribute('class')).toBe('')
      expect(listItems[0].getAttribute('class')).not.toBe('false')
      expect(listItems[0].textContent?.trim()).toBe('Home')

      // Group 1, Item 2: About (has children)
      expect(listItems[1].getAttribute('class')).toBe('nav-item-with-submenu')
      expect(listItems[1].textContent?.trim()).toBe('About')

      // Group 2, Item 1: Contact (no children)
      expect(listItems[2].getAttribute('class')).toBe('')
      expect(listItems[2].getAttribute('class')).not.toBe('false')
      expect(listItems[2].textContent?.trim()).toBe('Contact')

      // Group 2, Item 2: Docs (has children)
      expect(listItems[3].getAttribute('class')).toBe('nav-item-with-submenu')
      expect(listItems[3].textContent?.trim()).toBe('Docs')
    })

    describe('Regression: false/true/0/whitespace handling', () => {
      it('Valid Case: class via && with true adds class correctly', async () => {
        const template = document.createElement('div')
        template.innerHTML = `<a class="nav-parent {{ isActive && 'active' }}">X</a>`
        container.appendChild(template)

        const state: State = { isActive: true }
        const refs: Refs = {}

        await processTemplate(template, state, refs)

        const anchor = template.querySelector('a')
        expect(anchor?.getAttribute('class')).toBe('nav-parent active')
      })

      it("Negative Case: class via && with false produces clean class without 'false' or trailing space", async () => {
        const template = document.createElement('div')
        template.innerHTML = `<a class="nav-parent {{ isActive && 'active' }}">X</a>`
        container.appendChild(template)

        const state: State = { isActive: false }
        const refs: Refs = {}

        await processTemplate(template, state, refs)

        const anchor = template.querySelector('a')
        expect(anchor?.getAttribute('class')).toBe('nav-parent')
      })

      it('Edge Case: 0 must be preserved in text output', async () => {
        const template = document.createElement('div')
        template.textContent = 'X{{ 0 }}Y'
        container.appendChild(template)

        const state: State = {}
        const refs: Refs = {}

        await processTemplate(template, state, refs)

        expect(template.textContent).toBe('X0Y')
      })

      it('Boolean true must not appear as text in output', async () => {
        const template = document.createElement('div')
        template.textContent = 'A{{ true }}B'
        container.appendChild(template)

        const state: State = {}
        const refs: Refs = {}

        await processTemplate(template, state, refs)

        expect(template.textContent).toBe('AB')
      })

      it('Boolean false must not appear as text in output', async () => {
        const template = document.createElement('div')
        template.textContent = 'A{{ false }}B'
        container.appendChild(template)

        const state: State = {}
        const refs: Refs = {}

        await processTemplate(template, state, refs)

        expect(template.textContent).toBe('AB')
      })

      it("Forbidden keyword (window) must not render 'false' in attribute", async () => {
        const template = document.createElement('div')
        template.innerHTML = `<div class="{{ window }}">X</div>`
        container.appendChild(template)

        const state: State = {}
        const refs: Refs = {}

        await processTemplate(template, state, refs)

        const div = template.querySelector('div')
        // evaluateExpression returns false for forbidden keywords,
        // but stringifyTemplateValue(false) should produce "" not "false"
        expect(div?.getAttribute('class')).toBe('')
        expect(div?.getAttribute('class')).not.toBe('false')
      })
    })
  })
})
