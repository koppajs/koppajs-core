// 📁 `src/utils/dom.ts`

const domExtensions: { [key: string]: PropertyDescriptor } = {
  select: {
    get(this: HTMLElement): (s: string) => HTMLElement | null {
      return (s: string) =>
        this instanceof HTMLInputElement || this instanceof HTMLTextAreaElement
          ? (this.select(), null)
          : this.querySelector(s);
    },
  },

  selectAll: {
    get(this: HTMLElement): (s: string) => NodeList {
      return (s: string) => this.querySelectorAll(s);
    },
  },

  addClass: {
    get(this: HTMLElement): (classes: string) => HTMLElement {
      return (classes: string) => {
        classes.split(/\s+/).forEach((c) => this.classList.add(c.trim()));
        return this;
      };
    },
  },

  removeClass: {
    get(this: HTMLElement): (classes: string) => HTMLElement {
      return (classes: string) => {
        classes.split(/\s+/).forEach((c) => this.classList.remove(c.trim()));
        return this;
      };
    },
  },

  toggleClass: {
    get(this: HTMLElement): (classes: string) => HTMLElement {
      return (classes: string) => {
        classes.split(/\s+/).forEach((c) => this.classList.toggle(c.trim()));
        return this;
      };
    },
  },

  hasClass: {
    get(this: HTMLElement): (c: string) => boolean {
      return (c: string) => this.classList.contains(c.trim());
    },
  },

  replaceWith: {
    get(this: HTMLElement): (newNode: HTMLElement | string) => void {
      return (newNode: HTMLElement | string) => {
        if (!this.parentNode) return;
        if (newNode instanceof HTMLElement) {
          this.parentNode.replaceChild(newNode, this);
        } else if (typeof newNode === 'string') {
          this.insertAdjacentText('beforebegin', newNode);
          this.remove();
        }
      };
    },
  },

  siblings: {
    get(this: HTMLElement): (callback?: (sibling: HTMLElement) => void) => HTMLElement[] {
      return (callback) => {
        if (!this.parentNode) return [];
        const siblings: HTMLElement[] = [];
        let sibling: ChildNode | null = this.parentNode.firstChild;
        while (sibling) {
          if (sibling.nodeType === 1 && sibling !== this) {
            callback?.(sibling as HTMLElement);
            siblings.push(sibling as HTMLElement);
          }
          sibling = sibling.nextSibling;
        }
        return siblings;
      };
    },
  },

  before: {
    get(this: HTMLElement): (newNode: HTMLElement | string) => void {
      return (newNode: HTMLElement | string) => {
        if (!this.parentNode) return;
        if (newNode instanceof HTMLElement) this.parentNode.insertBefore(newNode, this);
        else this.insertAdjacentHTML('beforebegin', newNode.toString());
      };
    },
  },

  after: {
    get(this: HTMLElement): (newNode: HTMLElement | string) => void {
      return (newNode: HTMLElement | string) => {
        if (!this.parentNode) return;
        if (newNode instanceof HTMLElement) this.parentNode.insertBefore(newNode, this.nextSibling);
        else this.insertAdjacentHTML('afterend', newNode.toString());
      };
    },
  },

  attr: {
    get(this: HTMLElement): (attrName: string, attrValue?: string) => string | null {
      return (attrName: string, attrValue?: string) => {
        if (attrValue !== undefined) this.setAttribute(attrName, attrValue || 'true');
        return this.getAttribute(attrName);
      };
    },
  },
};

export default domExtensions;
