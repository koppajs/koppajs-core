/**
 * DOM Reconciliation Utility
 *
 * Provides efficient DOM diffing to update the DOM without destroying
 * and recreating custom element instances. This prevents infinite mount
 * loops when parent components re-render.
 */

import { getStructId, getSlotId, setStructId } from './index';

/**
 * Checks if an element is a custom element (has a hyphen in the tag name).
 * @param node - The node to check
 * @returns True if the node is a custom element
 */
function isCustomElement(node: Node): node is HTMLElement {
  return (
    node.nodeType === Node.ELEMENT_NODE &&
    (node as HTMLElement).tagName.includes("-")
  );
}

/**
 * Generates an identity key for a node based on its structural and slot identifiers.
 * For custom elements:
 * - non-loop: (tagName, structId)
 * - loop: (tagName, structId, slotId)
 * @param node - The node to generate an identity key for
 * @param structAttr - Optional attribute name to fallback to if structId is not set
 * @returns The identity key string, or null if the node doesn't have identity
 */
function getNodeIdentity(node: Node, structAttr?: string): string | null {
  if (!isCustomElement(node)) return null;
  
  const tagName = (node as HTMLElement).tagName;
  let structId = getStructId(node);
  const slotId = getSlotId(node);
  
  // Fallback: if no structId is set via runtime helper, read from attribute
  if (structId === undefined && structAttr) {
    const attrValue = (node as HTMLElement).getAttribute(structAttr);
    if (attrValue !== null) {
      setStructId(node, attrValue);
      structId = attrValue;
    }
  }
  
  // Node must have at least structId to have identity
  if (structId === undefined) return null;
  
  // Loop context: include slotId if present
  if (slotId !== undefined) {
    return `${tagName}:${String(structId)}:${String(slotId)}`;
  }
  
  // Non-loop context: just tagName and structId
  return `${tagName}:${String(structId)}`;
}

/**
 * Checks if two nodes are structurally equivalent for reconciliation purposes.
 * Custom elements match if they have the same tag name.
 * Regular elements match if they have the same tag name.
 * Text nodes match if they are both text nodes (content can differ).
 * @param nodeA - First node
 * @param nodeB - Second node
 * @returns True if the nodes are considered equivalent
 */
function isSameNodeType(nodeA: Node, nodeB: Node): boolean {
  // Different node types
  if (nodeA.nodeType !== nodeB.nodeType) return false;

  // Text nodes
  if (nodeA.nodeType === Node.TEXT_NODE) return true;

  // Comment nodes
  if (nodeA.nodeType === Node.COMMENT_NODE) return true;

  // Element nodes - compare tag names
  if (nodeA.nodeType === Node.ELEMENT_NODE) {
    return (
      (nodeA as HTMLElement).tagName === (nodeB as HTMLElement).tagName
    );
  }

  return false;
}

/**
 * Updates attributes on an existing element to match the new element.
 * Preserves event handlers and only updates changed attributes.
 * @param existing - The existing element to update
 * @param updated - The new element with desired attributes
 */
function reconcileAttributes(
  existing: HTMLElement,
  updated: HTMLElement,
): void {
  // Get all attribute names from both elements
  const existingAttrs = new Set(existing.getAttributeNames());
  const updatedAttrs = new Set(updated.getAttributeNames());

  // Remove attributes that no longer exist (except event handlers which start with @)
  for (const attr of existingAttrs) {
    if (!updatedAttrs.has(attr) && !attr.startsWith("@")) {
      existing.removeAttribute(attr);
    }
  }

  // Add or update attributes from the new element
  for (const attr of updatedAttrs) {
    const newValue = updated.getAttribute(attr);
    const existingValue = existing.getAttribute(attr);

    if (newValue !== existingValue) {
      if (newValue === null) {
        existing.removeAttribute(attr);
      } else {
        existing.setAttribute(attr, newValue);
      }
    }
  }
}

/**
 * Recursively reconciles the children of a container element.
 * This is the core diffing algorithm that preserves custom element instances.
 * Uses identity-based matching for custom elements to enable reordering without replacement.
 * @param existing - The existing container element
 * @param updated - The new container element (from template processing)
 * @param structAttr - Optional attribute name for structural identity fallback
 */
function reconcileChildren(existing: HTMLElement, updated: HTMLElement, structAttr?: string): void {
  const existingChildren = Array.from(existing.childNodes);
  const updatedChildren = Array.from(updated.childNodes);

  // Build identity map for existing custom elements
  const existingByIdentity = new Map<string, Node>();
  const existingUsed = new Set<Node>();
  
  for (const child of existingChildren) {
    const identity = getNodeIdentity(child, structAttr);
    if (identity !== null && !existingByIdentity.has(identity)) {
      existingByIdentity.set(identity, child);
    }
  }

  // Process each position in the updated children
  for (let i = 0; i < updatedChildren.length; i++) {
    const updatedChild = updatedChildren[i];
    const existingChild = existingChildren[i];
    const updatedIdentity = getNodeIdentity(updatedChild, structAttr);

    // Try to find a matching existing node by identity (for custom elements)
    let matchedNode: Node | null = null;
    
    if (updatedIdentity !== null && existingByIdentity.has(updatedIdentity)) {
      matchedNode = existingByIdentity.get(updatedIdentity)!;
      existingUsed.add(matchedNode);
    }

    // If we found a matching custom element by identity
    if (matchedNode && isCustomElement(matchedNode)) {
      // Move or keep the matched element at the correct position
      if (existingChild !== matchedNode) {
        // Need to move the element to the correct position
        if (i < existing.childNodes.length) {
          existing.insertBefore(matchedNode, existing.childNodes[i]);
        } else {
          existing.appendChild(matchedNode);
        }
      }
      
      // Update attributes on the preserved custom element
      reconcileAttributes(matchedNode as HTMLElement, updatedChild as HTMLElement);
      // Do NOT update children or textContent - custom elements manage their own content
      continue;
    }

    // No identity match found
    // For custom elements with identity, check if we should use positional or replace
    if (isCustomElement(updatedChild) && updatedIdentity !== null) {
      // This is a custom element with identity but no match found
      // We need to replace whatever is at this position
      if (existingChild) {
        existing.replaceChild(updatedChild.cloneNode(true), existingChild);
      } else {
        existing.appendChild(updatedChild.cloneNode(true));
      }
      continue;
    }

    // Non-identity nodes - fall back to positional matching
    // New node to add
    if (!existingChild) {
      existing.appendChild(updatedChild.cloneNode(true));
      continue;
    }

    // Check if they're the same type (positional match)
    if (!isSameNodeType(existingChild, updatedChild)) {
      // Different types - replace entirely
      existing.replaceChild(updatedChild.cloneNode(true), existingChild);
      continue;
    }

    // Same type - reconcile based on node type
    if (existingChild.nodeType === Node.TEXT_NODE) {
      // Text node - just update content if different
      if (existingChild.textContent !== updatedChild.textContent) {
        existingChild.textContent = updatedChild.textContent;
      }
      continue;
    }

    if (existingChild.nodeType === Node.COMMENT_NODE) {
      // Comment node - update if different
      if (existingChild.textContent !== updatedChild.textContent) {
        existingChild.textContent = updatedChild.textContent;
      }
      continue;
    }

    if (existingChild.nodeType === Node.ELEMENT_NODE) {
      const existingEl = existingChild as HTMLElement;
      const updatedEl = updatedChild as HTMLElement;

      // Custom elements need special handling
      if (isCustomElement(existingEl)) {
        // For custom elements without identity (positional match), only update attributes
        // Do NOT update children or textContent - custom elements manage their own content
        reconcileAttributes(existingEl, updatedEl);
        continue;
      }

      // Regular HTML elements - update attributes and recurse into children
      reconcileAttributes(existingEl, updatedEl);
      reconcileChildren(existingEl, updatedEl, structAttr);
    }
  }

  // Remove any extra children that weren't matched or needed
  while (existing.childNodes.length > updatedChildren.length) {
    const lastChild = existing.lastChild;
    if (lastChild) {
      existing.removeChild(lastChild);
    }
  }
}

/**
 * Reconciles the DOM content of a host element with new content.
 * This is the main entry point for DOM reconciliation.
 *
 * The algorithm:
 * 1. For the first render (host has no children), simply append the new content
 * 2. For subsequent renders, diff the existing children against new content
 * 3. Preserve custom element instances where possible
 * 4. Only update what has changed
 *
 * @param host - The host element to update
 * @param newContent - The new DocumentFragment with desired content
 * @param isFirstRender - Whether this is the initial render
 * @param structAttr - Optional attribute name for structural identity fallback
 */
export function reconcileDOM(
  host: HTMLElement,
  newContent: DocumentFragment,
  isFirstRender: boolean,
  structAttr?: string,
): void {
  // First render - just append everything (no existing content to preserve)
  if (isFirstRender || host.childNodes.length === 0) {
    host.replaceChildren(newContent);
    return;
  }

  // Create a temporary container to work with the new content
  const tempContainer = document.createElement("div");
  tempContainer.appendChild(newContent);

  // Reconcile the children
  reconcileChildren(host as HTMLElement, tempContainer, structAttr);
}
