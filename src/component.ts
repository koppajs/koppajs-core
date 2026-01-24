import {
  bindNativeEvents,
  bindNativeEventsForComposite,
  setupEvents,
  setupEventsForComposite,
} from "./event-handler";
import { cleanupSubtree } from "./global-event-cleaner";
import { createModel } from "./model";
import { processTemplate } from "./template-processor";
import {
  bindMethods,
  compileCode,
  createHookRegistry,
  ExtensionRegistry,
  evaluateExpression,
  getExpectedPropTypeName,
  getValueByPath,
  hasComponentInstance,
  hookEmit,
  hookOn,
  isSimplePathExpression,
  kebabToCamel,
  setValueByPath,
  bindOnce,
  logger,
  reconcileDOM,
} from "./utils";

import { Core } from ".";
import {
  lifecycleHooks,
  type AnyFn,
  type ComponentInstance,
  type ComponentSource,
  type State,
  type Events,
  type HTMLElementWithInstance,
  type Props,
  type Refs,
} from "./types";
import { composeBySource } from "./compose";

/**
 * Internal type extending ComponentInstance with runtime-only properties.
 * These properties are not part of the public API but are used internally
 * for rendering coordination and state tracking.
 */
interface ComponentInstanceInternal extends ComponentInstance {
  /** Flag indicating if the component is currently rendering */
  isRendering?: boolean;
  /** Last rendered state version for change detection */
  _lastRenderedStateVersion?: number;
}

/**
 * Internal type extending State with runtime metadata.
 * Used during lifecycle hooks to pass changed paths information.
 */
interface StateWithMetadata extends State {
  /** Paths that changed since last render, available in lifecycle hooks */
  changedPaths?: Set<string>;
}

/**
 * Gets the parent component instance for an element.
 * @param el - Element to find parent for
 * @returns Parent component instance or undefined
 */
function getParentInstance(el: Element): ComponentInstance | undefined {
  const rootNode = el.getRootNode();
  const parent =
    el.parentElement ??
    (rootNode instanceof ShadowRoot ? rootNode.host : undefined);

  if (hasComponentInstance(parent)) {
    return parent.instance;
  }

  return undefined;
}

/**
 * Processes slot elements in component template.
 * Replaces <slot> elements with content from host element.
 * @param container - Template fragment containing slot elements
 * @param host - Host element containing slot content
 */
export function processSlots({
  container,
  host,
}: {
  container: DocumentFragment;
  host: HTMLElement;
}): void {
  const slotContent = Array.from(host.childNodes).filter(
    (node) =>
      node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE,
  );

  const slotMap: Record<string, Node[]> = {};

  for (const node of slotContent) {
    const slotName =
      node instanceof HTMLElement && node.hasAttribute("slot")
        ? node.getAttribute("slot")!
        : "default";

    if (!slotMap[slotName]) {
      slotMap[slotName] = [];
    }

    slotMap[slotName].push(node);
  }

  container.querySelectorAll("slot").forEach((slotElement) => {
    const slotName = slotElement.getAttribute("name") || "default";
    const replacementNodes = slotMap[slotName];

    if (replacementNodes && replacementNodes.length > 0) {
      replacementNodes.forEach((node) => {
        slotElement.parentNode!.insertBefore(node, slotElement);
      });
    }

    slotElement.remove();
  });
}

/**
 * Validates a prop value against its definition.
 * @param propName - Name of the prop
 * @param propValue - Value to validate
 * @param props - Props definition object
 * @returns True if prop is valid, false otherwise
 */
export function validateProp({
  propName,
  propValue,
  props,
}: {
  propName: string;
  propValue: unknown;
  props: Props;
}): boolean {
  const propOptions = props[propName];
  const pValue = propValue ?? propOptions?.default;

  if (!propOptions) return true;

  const expectedType = getExpectedPropTypeName(propOptions.type);
  const actualType = Array.isArray(pValue) ? "array" : typeof pValue;

  const typeChecks: Record<string, boolean> = {
    string: actualType === "string",
    number: actualType === "number",
    boolean: actualType === "boolean",
    array: Array.isArray(pValue),
    object:
      actualType === "object" && pValue !== null && !Array.isArray(pValue),
    function: actualType === "function",
  };

  // If expected type is unknown, skip runtime type validation
  const typeMatches =
    expectedType === "unknown" ? true : (typeChecks[expectedType] ?? false);

  if (!typeMatches) {
    logger.error(
      `Prop "${propName}" should be of type "${expectedType}", but got "${actualType}".`,
      pValue,
    );
    return false;
  }

  if (
    propOptions.regex &&
    typeof pValue === "string" &&
    !new RegExp(propOptions.regex).test(pValue)
  ) {
    logger.error(
      `Prop "${propName}" does not match regex "${propOptions.regex}".`,
    );
    return false;
  }

  return true;
}

/**
 * Processes component props from element attributes.
 * Handles static props, dynamic props, and two-way bindings.
 * @param ele - Component element
 * @param parent - Parent component instance
 * @param props - Props definition
 * @param state - Component state to populate
 */
function processProps({
  ele,
  parent,
  props,
  state,
}: {
  ele: HTMLElement;
  parent: ComponentInstance | undefined;
  props: Props;
  state: State;
}) {
  const hasDefinedProps = Object.keys(props).length > 0;

  const defineBoundProp = (propName: string, parentPath: string) => {
    Object.defineProperty(state, propName, {
      enumerable: true,
      configurable: true,
      get() {
        if (!parent) return undefined;
        return getValueByPath(parent.state, parentPath);
      },
      set(next) {
        if (!parent || !parent.state) return;

        try {
          setValueByPath(parent.state, parentPath, next);
        } catch (error) {
          logger.errorWithContext(
            `Failed to set bound prop "${propName}" → "${parentPath}"`,
            { propName, parentPath },
            error,
          );
        }
      },
    });
  };

  for (const attr of ele.attributes) {
    const isDynamic = attr.name.startsWith(":");
    const propName = kebabToCamel(attr.name.substring(isDynamic ? 1 : 0));

    // ignore ":" without parent (SSR, standalone, etc.)
    if (isDynamic && !parent) continue;

    // If component declares props, validate against it (as far as possible)
    const isAllowed =
      !hasDefinedProps || (props[propName] && props[propName] !== undefined);

    if (!isAllowed) continue;

    // STATIC
    if (!isDynamic) {
      const value = attr.value !== "" ? attr.value : true;

      if (
        !hasDefinedProps ||
        validateProp({ propName, propValue: value, props })
      ) {
        state[propName] = value;
      }

      continue;
    }

    // DYNAMIC
    const expr = attr.value?.trim() ?? "";

    // If it's a simple path, create a true binding (two-way)
    if (expr && isSimplePathExpression(expr)) {
      // validate based on current value (read)
      const currentValue = getValueByPath(parent!.state, expr);

      if (
        !hasDefinedProps ||
        validateProp({ propName, propValue: currentValue, props })
      ) {
        defineBoundProp(propName, expr);
      }

      continue;
    }

    // Otherwise: evaluate expression one-way (read-only)
    const evaluated = expr
      ? evaluateExpression(expr, parent!.state)
      : undefined;

    if (
      !hasDefinedProps ||
      validateProp({ propName, propValue: evaluated, props })
    ) {
      state[propName] = evaluated;
    }
  }

  // Defaults / required
  for (const [propName, propOptions] of Object.entries(props)) {
    if (!(propName in state)) {
      if (propOptions.default !== undefined) {
        state[propName] = propOptions.default;
      } else if (propOptions.required) {
        logger.error(`Required prop "${propName}" is missing.`);
      }
    }
  }
}

/**
 * Registers a component with the custom elements registry.
 * @param componentName - Custom element tag name
 * @param source - Component source with template, script, and style
 */
export function registerComponent(
  componentName: string,
  source: ComponentSource,
): void {
  customElements.define(
    componentName,
    class extends HTMLElement {
      private template: HTMLTemplateElement;

      /**
       * Public instance property for type compatibility with HTMLElementWithInstance.
       */
      public instance?: ComponentInstance;

      // Cleanup state for deterministic teardown
      private _isDisconnected = false;
      private _isMounted = false; // Track if component has been mounted (persists across connectedCallback calls)
      private _model?: ReturnType<typeof createModel>;
      private _observerFn?: () => void;
      private _renderAborted = false;
      private _pendingRender: (() => Promise<void>) | null = null;

      constructor() {
        super();
        this.template = document.createElement("template");
        this.template.innerHTML = source.template;
      }

      async connectedCallback() {
        const host = this as HTMLElementWithInstance;

        // ============================================================
        // SCENARIO 1: RERENDER/RECONNECT - Reuse existing instance
        // ============================================================
        // Wenn bereits eine Instanz existiert (nach disconnect/connect),
        // wiederverwenden statt neu erstellen
        if (host.instance && this._model && this._observerFn) {
          const existingInstance = host.instance;
          const parent = getParentInstance(host);

          // Update parent reference (kann sich geändert haben)
          existingInstance.$parent = parent;

          // Reset disconnected state für Reconnect
          this._isDisconnected = false;
          this._renderAborted = false;
          this._pendingRender = null;

          // Props neu verarbeiten (können sich geändert haben)
          if (existingInstance.props && existingInstance.state) {
            processProps({
              ele: host,
              parent,
              props: existingInstance.props,
              state: existingInstance.state,
            });
          }

          // WICHTIG: mounted() Hook darf NICHT nochmal feuern beim Reconnect
          // mounted() geht nur einmal beim ersten Create/Render
          // Observer wird automatisch Renders triggern wenn nötig
          return;
        }

        // ============================================================
        // SCENARIO 2: CREATE - Neue Instanz erstellen
        // ============================================================
        // Nur wenn noch keine Instanz existiert

        // Component type bestimmen (default: "options")
        const componentType = source.type || "options";
        const useUserContext = componentType === "options";

        // Parent früh ermitteln (bevor replaceChildren Children aktiviert)
        const parent = getParentInstance(host);

        const clonedTemplate = this.template.cloneNode(
          true,
        ) as HTMLTemplateElement;

        // Resolve deps BEFORE compiling the controller script
        // This allows imports from [ts] block to be injected as local variables
        let resolvedDeps: Record<string, unknown> | undefined;
        if (source.deps) {
          resolvedDeps = {};
          const depEntries = Object.entries(source.deps);
          const resolvedValues = await Promise.all(
            depEntries.map(([, importFn]) => importFn()),
          );
          for (let i = 0; i < depEntries.length; i++) {
            resolvedDeps[depEntries[i][0]] = resolvedValues[i];
          }
        }

        const compiledScript = compileCode(source.script, resolvedDeps);

        const refs: Refs = {};
        let isRendering = false;
        let lastRenderedStateVersion = -1; // Track state version instead of serialized data

        // Reset disconnected state for new connection
        this._isDisconnected = false;
        this._renderAborted = false;
        this._pendingRender = null;

        const lifecycleRegistry = createHookRegistry();

        // Ready promise setup
        const ready: { promise: Promise<void>; resolve: () => void } = (() => {
          let resolve!: () => void;
          const promise = new Promise<void>((res) => {
            resolve = res;
          });
          return { promise, resolve };
        })();

        // Style injection
        if (!document.head.querySelector(`style#style-${componentName}`)) {
          const style = document.createElement("style");
          style.id = `style-${componentName}`;
          style.textContent = source.style;
          document.head.appendChild(style);
        }

        let state!: State;
        let userContext!: State;

        const take = (pluginName: string) => {
          const plugin = ExtensionRegistry.plugins[pluginName];

          if (!plugin || typeof plugin.setup !== "function") {
            logger.warnWithContext(
              `Plugin "${pluginName}" not found or has no setup method`,
              { pluginName },
            );
            return undefined;
          }

          try {
            // Use userContext if available and type is "options", otherwise use state
            const context = useUserContext && userContext ? userContext : state;
            return plugin.setup.call(context);
          } catch (error) {
            logger.errorWithContext(
              `Plugin "${pluginName}" setup failed`,
              { pluginName },
              error,
            );
            return undefined;
          }
        };

        // Modules attach
        const attachedModules: Record<string, unknown> = {};
        for (const [moduleName, module] of Object.entries(
          ExtensionRegistry.modules,
        )) {
          if (typeof module.attach === "function") {
            const attached = module.attach.call({
              element: host,
              parent,
              core: { take: Core.take },
            });

            if (attached) {
              attachedModules[`$${moduleName}`] = attached;
            }
          }
        }

        // $emit Funktion with caching
        const handlerNameCache = new Map<string, string>();
        const getHandlerName = (eventName: string): string => {
          let cached = handlerNameCache.get(eventName);
          if (!cached) {
            cached = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
            handlerNameCache.set(eventName, cached);
          }
          return cached;
        };

        const $emit = (eventName: string, ...args: unknown[]) => {
          const handlerName = getHandlerName(eventName);
          let current = parent;

          while (current) {
            // Only use userContext if it exists (options type)
            const cb = current.userContext;
            if (cb) {
              const handler = cb[handlerName];
              if (typeof handler === "function") {
                // Handler is already bound via bindMethods, use directly
                (handler as AnyFn)(...args);
              }
            } else if (current.methods) {
              // For composite type, use methods directly without binding
              const handler = current.methods[handlerName];
              if (typeof handler === "function") {
                handler(...args);
              }
            }

            current = current.$parent;
          }
        };

        // Build component context with all $*-prefixed variables
        const componentContext = {
          $refs: refs,
          $parent: parent,
          $emit,
          $take: take,
          ...attachedModules,
        };

        // Script ausführen
        const controller = compiledScript(componentContext);

        // Model setup
        const model = createModel(controller.state ?? {});
        state = model.state;

        // Controller Bits
        const methods = controller.methods || {};
        const props = controller.props || {};
        const events = (controller.events || []) satisfies Events;

        let watchList = controller.watchList || [];

        // Create userContext only for "options" type
        // IMPORTANT: Do NOT include $*-prefixed variables in userContext
        // They must only be available as closure variables
        if (useUserContext) {
          userContext = composeBySource([methods, state]);
        }

        processProps({
          ele: host,
          parent,
          props,
          state,
        });

        // Bind methods only if userContext exists
        if (useUserContext && userContext) {
          bindMethods(methods, userContext);
        }

        // Hooks registrieren
        for (const hook of lifecycleHooks) {
          const fn = controller[hook];
          if (typeof fn === "function") {
            // Bind hook only if userContext exists
            const boundFn =
              useUserContext && userContext ? bindOnce(fn, userContext) : fn;
            hookOn(lifecycleRegistry, hook, async () => {
              const result = boundFn();
              if (result instanceof Promise) await result;
            });
          }
        }

        // Store model reference for cleanup in disconnectedCallback
        this._model = model;

        /**
         * render zuerst definieren (sonst TDZ wenn Observer feuert)
         */
        const render = async () => {
          // Exit early if component has been disconnected
          if (this._isDisconnected) {
            return;
          }

          // RENDERING GUARD: Wenn bereits am Rendern, kein neuer Render-Prozess
          // Stattdessen neuen Render planen für nach dem aktuellen Render
          if (isRendering) {
            this._renderAborted = true;
            this._pendingRender = render;
            return;
          }

          // State-Version Check: Nur rendern wenn sich State geändert hat
          const currentStateVersion = model.getStateVersion();
          if (lastRenderedStateVersion === currentStateVersion) return;

          isRendering = true;
          this._renderAborted = false;
          // Set flag on instance so child components can check
          if (host.instance) {
            (host.instance as ComponentInstanceInternal).isRendering = true;
          }

          try {
            const container = clonedTemplate.content.cloneNode(
              true,
            ) as DocumentFragment;

            processSlots({ container, host });

            // Use userContext (which includes methods) for template processing
            // This allows template expressions to call component methods
            const templateContext =
              useUserContext && userContext ? userContext : state;
            await processTemplate(container, templateContext, refs);

            // Check if render was aborted during template processing
            if (this._renderAborted) {
              // Schedule new render with latest state
              this._pendingRender = render;
              return;
            }

            const hookContext =
              useUserContext && userContext ? userContext : state;
            await hookEmit("global", "processed", hookContext);
            await hookEmit(lifecycleRegistry, "processed");

            // Check again if render was aborted
            if (this._renderAborted) {
              this._pendingRender = render;
              return;
            }

            if (useUserContext && userContext) {
              bindNativeEvents(userContext, container);
              setupEvents(userContext, events, container, refs);
            } else {
              // For composite type, use methods directly without binding
              bindNativeEventsForComposite(methods, container);
              setupEventsForComposite(methods, state, events, container, refs);
            }

            // Flush changes and get changed paths for lifecycle hooks
            const changedPaths = model.flushChanges();

            // Extend hook context with changedPaths metadata
            // Assign changedPaths directly to the context object so it's available as this.changedPaths
            (hookContext as StateWithMetadata).changedPaths = changedPaths;

            // MOUNTED GUARD: mounted() Hook darf nur einmal feuern beim ersten Render
            // Wenn bereits gemountet (_isMounted = true), dann ist es ein Update, kein Mount
            const isFirstRender = !this._isMounted;

            await hookEmit(
              "global",
              isFirstRender ? "beforeMount" : "beforeUpdate",
              hookContext,
            );
            await hookEmit(
              lifecycleRegistry,
              isFirstRender ? "beforeMount" : "beforeUpdate",
              hookContext,
            );

            // Final check before DOM update
            if (this._renderAborted) {
              // Clean up ephemeral metadata before aborting
              delete (hookContext as StateWithMetadata).changedPaths;
              this._pendingRender = render;
              return;
            }

            // Use DOM reconciliation instead of replaceChildren to preserve
            // custom element instances and prevent infinite mount loops
            reconcileDOM(host, container, !this._isMounted, source.structAttr);

            // Update changedPaths for updated hook (same set from beforeUpdate)
            (hookContext as StateWithMetadata).changedPaths = changedPaths;

            // Update Hook: Nur wenn bereits gemountet (nicht beim ersten Render)
            if (this._isMounted) {
              await hookEmit("global", "updated", hookContext);
              await hookEmit(lifecycleRegistry, "updated", hookContext);
            }

            // Remove ephemeral metadata after hooks complete
            delete (hookContext as StateWithMetadata).changedPaths;

            // Update last rendered state version
            lastRenderedStateVersion = currentStateVersion;
            // Store in instance for reuse
            if (host.instance) {
              (
                host.instance as ComponentInstanceInternal
              )._lastRenderedStateVersion = lastRenderedStateVersion;
            }
          } catch (error) {
            logger.errorWithContext(
              "Error during render",
              { componentName },
              error,
            );
          } finally {
            // Ensure ephemeral metadata is cleaned up even on error
            const hookContext =
              useUserContext && userContext ? userContext : state;
            delete (hookContext as StateWithMetadata).changedPaths;

            isRendering = false;
            // Reset flag on instance
            if (host.instance) {
              (host.instance as ComponentInstanceInternal).isRendering = false;
            }

            // Execute pending render if one was scheduled (only if still connected)
            if (this._pendingRender && !this._isDisconnected) {
              const nextRender = this._pendingRender;
              this._pendingRender = null;
              // Use requestAnimationFrame to ensure DOM is ready
              requestAnimationFrame(() => {
                // Double-check disconnection state in RAF callback
                if (this._isDisconnected) return;
                void nextRender().catch((error) => {
                  logger.errorWithContext(
                    "Error during pending render",
                    { componentName },
                    error,
                  );
                });
              });
            }
          }
        };

        /**
         * Parent/Child Fix: instance VOR initial render setzen
         */
        host.instance = {
          element: host,
          template: clonedTemplate,
          state,
          userContext: useUserContext ? userContext : undefined,
          props,
          methods,
          events,
          watchList,
          $refs: refs,
          $parent: parent,
          $emit,
          $take: take,
          readyPromise: ready.promise,
          lifecycleRegistry,
          ...attachedModules,
          isRendering: false,
        } as ComponentInstanceInternal;

        // Observer function stored in variable for later removal
        this._observerFn = () => {
          // Exit early if component has been disconnected
          if (this._isDisconnected) return;

          // Prevent child self-rendering if any ancestor is currently rendering
          // Ancestor render will update child props automatically through processTemplate
          // Check entire parent chain to see if any ancestor is rendering
          let currentParent: ComponentInstance | undefined = parent;
          while (currentParent) {
            if ((currentParent as ComponentInstanceInternal).isRendering) {
              // An ancestor is rendering, so this child should not self-render
              // The ancestor's render will update this child's props automatically
              return;
            }
            currentParent = currentParent.$parent;
          }

          requestAnimationFrame(() => {
            // Double-check disconnection state in RAF callback
            if (this._isDisconnected) return;
            void render().catch((error) => {
              logger.errorWithContext(
                "Error during render (observer)",
                { componentName },
                error,
              );
            });
          });
        };

        // Register observer (render is already defined)
        model.addObserver(this._observerFn);

        // created
        const hookContext = useUserContext && userContext ? userContext : state;
        await hookEmit("global", "created", hookContext);
        await hookEmit(lifecycleRegistry, "created");

        // initial render
        await render();

        // MOUNTED HOOK: Nur einmal beim ersten Render, nie beim Reconnect
        // _isMounted wird nur beim ersten Render auf true gesetzt
        // Beim Reconnect wird diese Stelle nie erreicht (Early Return oben)
        if (!this._isMounted) {
          await hookEmit("global", "mounted", hookContext);
          await hookEmit(lifecycleRegistry, "mounted");
          this._isMounted = true; // Flag setzen - mounted() wird nie wieder feuern
        }

        ready.resolve();
      }

      async disconnectedCallback() {
        const host = this as HTMLElementWithInstance;
        if (!host.instance) return;

        // Reset mounted state when component is disconnected
        // This allows the component to be properly mounted again if reconnected
        this._isMounted = false;

        const instance = host.instance;

        // 1. Set disconnected flag to prevent pending/scheduled renders
        this._isDisconnected = true;
        this._renderAborted = true;
        this._pendingRender = null;

        // 2. Remove model observer to stop reactive updates
        if (this._model && this._observerFn) {
          this._model.removeObserver(this._observerFn);
        }

        // 3. Emit beforeDestroy hooks
        const destroyContext = instance.userContext || instance.state;
        await hookEmit("global", "beforeDestroy", destroyContext);
        await hookEmit(instance.lifecycleRegistry, "beforeDestroy");

        // 5. Cleanup DOM event listeners for this component subtree
        cleanupSubtree(this);

        // 6. Remove component style if no other instances exist
        if (!document.body.querySelector(this.tagName.toLowerCase())) {
          document.head
            .querySelector(`style#style-${this.tagName.toLowerCase()}`)
            ?.remove();
        }

        // 7. Emit destroyed hooks
        await hookEmit("global", "destroyed", destroyContext);
        await hookEmit(instance.lifecycleRegistry, "destroyed");

        // 8. Release strong references for GC
        this._model = undefined;
        this._observerFn = undefined;
        host.instance = undefined;
      }
    },
  );
}
