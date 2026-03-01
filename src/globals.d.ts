export {}

declare global {
  interface HTMLElement {
    /**
     * Query and return the first matching descendant element.
     * If called on an <input> or <textarea>, selects its text instead.
     * @param selector - CSS selector string
     * @returns the first matching HTMLElement or null/void if none
     */
    select(selector: string): HTMLElement | null | void

    /**
     * Query and return all matching descendant nodes.
     * @param selector - CSS selector string
     * @returns a NodeList of matching elements
     */
    selectAll(selector: string): NodeList

    /**
     * Add one or more CSS classes to the element.
     * @param classes - space-delimited list of class names
     * @returns the element, for chaining
     */
    addClass(classes: string): HTMLElement

    /**
     * Remove one or more CSS classes from the element.
     * @param classes - space-delimited list of class names
     * @returns the element, for chaining
     */
    removeClass(classes: string): HTMLElement

    /**
     * Toggle one or more CSS classes on the element.
     * @param classes - space-delimited list of class names
     * @returns the element, for chaining
     */
    toggleClass(classes: string): HTMLElement

    /**
     * Check if the element has the given CSS class.
     * @param className - name of the class to test
     * @returns true if present, false otherwise
     */
    hasClass(className: string): boolean

    /**
     * Replace this element in the DOM with another element or raw HTML/text.
     * @param newNode - HTMLElement or HTML string to insert
     */
    replaceWith(newNode: HTMLElement | string): void

    /**
     * Get all sibling elements of this node.
     * Optionally, invoke a callback for each sibling.
     * @param callback - optional function to receive each sibling
     * @returns an array of sibling HTMLElements
     */
    siblings(callback?: (sibling: HTMLElement) => void): HTMLElement[]

    /**
     * Insert a new node or HTML string immediately before this element.
     * @param newNode - HTMLElement or HTML string to insert
     */
    before(newNode: HTMLElement | string): void

    /**
     * Insert a new node or HTML string immediately after this element.
     * @param newNode - HTMLElement or HTML string to insert
     */
    after(newNode: HTMLElement | string): void

    /**
     * Get or set an attribute on the element.
     * @param attrName - attribute name
     * @param attrValue - if provided, sets the attribute to this value
     * @returns the current value, or null/undefined if not set
     */
    attr(attrName: string, attrValue?: string): string | undefined
  }
}
