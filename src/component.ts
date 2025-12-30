import {
  bindNativeEvents,
  bindNativeEventsForComposite,
  setupEvents,
  setupEventsForComposite,
} from "./event-handler";
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
  extractWatchListFromTemplate,
  bindOnce,
  logger,
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
      node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE
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
  propValue: any;
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
      pValue
    );
    return false;
  }

  if (
    propOptions.regex &&
    typeof pValue === "string" &&
    !new RegExp(propOptions.regex).test(pValue)
  ) {
    logger.error(
      `Prop "${propName}" does not match regex "${propOptions.regex}".`
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
        if (!parent) return;

        try {
          setValueByPath(parent.state, parentPath, next);
        } catch (error) {
          logger.errorWithContext(
            `Failed to set bound prop "${propName}" → "${parentPath}"`,
            { propName, parentPath },
            error
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
  source: ComponentSource
): void {
  customElements.define(
    componentName,
    class extends HTMLElement {
      private template: HTMLTemplateElement;

      /**
       * Nicht private: wir wollen kompatibel bleiben und über HTMLElementWithInstance arbeiten.
       */
      public instance?: ComponentInstance;

      constructor() {
        super();
        this.template = document.createElement("template");
        this.template.innerHTML = source.template;
      }

      async connectedCallback() {
        const host = this as HTMLElementWithInstance;

        // Component type bestimmen (default: "options")
        const componentType = source.type || "options";
        const useUserContext = componentType === "options";

        // Parent früh ermitteln (bevor replaceChildren Children aktiviert)
        const parent = getParentInstance(host);

        const clonedTemplate = this.template.cloneNode(
          true
        ) as HTMLTemplateElement;

        const compiledScript = compileCode(source.script);

        const refs: Refs = {};
        let isMounted = false;
        let isRendering = false;
        let lastRenderedData = "";

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

        /**
         * TDZ-fix für state: Variable existiert sofort, wird später gesetzt.
         */
        let state!: State;
        let userContext!: State;

        const take = (pluginName: string) => {
          const plugin = ExtensionRegistry.plugins[pluginName];

          if (!plugin || typeof plugin.setup !== "function") {
            logger.warnWithContext(
              `Plugin "${pluginName}" not found or has no setup method`,
              { pluginName }
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
              error
            );
            return undefined;
          }
        };

        // Modules attach
        const attachedModules: Record<string, any> = {};
        for (const [moduleName, module] of Object.entries(
          ExtensionRegistry.modules
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

        const $emit = (eventName: string, ...args: any[]) => {
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

        // Script ausführen
        const controller = compiledScript({
          $refs: refs,
          $parent: parent,
          $emit,
          $take: take,
          ...attachedModules,
        });

        // Model setup
        const model = createModel(controller.state ?? {});
        state = model.data;

        // Controller Bits
        const methods = controller.methods || {};
        const props = controller.props || {};
        const events = (controller.events || []) satisfies Events;

        let watchList = controller.watchList || [];

        // Create userContext only for "options" type
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

        const autoWatch = extractWatchListFromTemplate(
          this.template.innerHTML
        ).filter((p) => {
          const root = p.split(".")[0]!;
          return Object.prototype.hasOwnProperty.call(state, root);
        });

        // Watch setup
        watchList = Array.from(
          new Set([...watchList, ...autoWatch, ...Object.keys(props)])
        );
        watchList.forEach((path) => model.watch(path));

        /**
         * render zuerst definieren (sonst TDZ wenn Observer feuert)
         */
        const render = async () => {
          if (isRendering) return;

          const currentState = JSON.stringify(state);
          if (lastRenderedData === currentState) return;

          isRendering = true;

          try {
            const container = clonedTemplate.content.cloneNode(
              true
            ) as DocumentFragment;

            processSlots({ container, host });

            await processTemplate(container, state, refs);
            const hookContext =
              useUserContext && userContext ? userContext : state;
            await hookEmit("global", "processed", hookContext);
            await hookEmit(lifecycleRegistry, "processed");

            if (useUserContext && userContext) {
              bindNativeEvents(userContext, container);
              setupEvents(userContext, events, container, refs);
            } else {
              // For composite type, use methods directly without binding
              bindNativeEventsForComposite(methods, container);
              setupEventsForComposite(methods, state, events, container, refs);
            }

            await hookEmit(
              "global",
              isMounted ? "beforeUpdate" : "beforeMount",
              hookContext
            );
            await hookEmit(
              lifecycleRegistry,
              isMounted ? "beforeUpdate" : "beforeMount"
            );

            host.replaceChildren(container);

            await hookEmit("global", "updated", hookContext);
            if (isMounted) {
              await hookEmit(lifecycleRegistry, "updated");
            }

            lastRenderedData = currentState;
          } catch (error) {
            logger.errorWithContext(
              "Error during render",
              { componentName },
              error
            );
          } finally {
            isRendering = false;
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
        } satisfies ComponentInstance;

        // Observer hinzufügen (jetzt render bereits definiert)
        model.addObserver(() => {
          requestAnimationFrame(() => {
            void render().catch((error) => {
              logger.errorWithContext(
                "Error during render (observer)",
                { componentName },
                error
              );
            });
          });
        });

        // created
        const hookContext = useUserContext && userContext ? userContext : state;
        await hookEmit("global", "created", hookContext);
        await hookEmit(lifecycleRegistry, "created");

        // initial render
        await render();

        // mounted
        if (!isMounted) {
          await hookEmit("global", "mounted", hookContext);
          await hookEmit(lifecycleRegistry, "mounted");
          isMounted = true;
        }

        ready.resolve();
      }

      async disconnectedCallback() {
        const host = this as HTMLElementWithInstance;
        if (!host.instance) return;

        const instance = host.instance;

        const destroyContext = instance.userContext || instance.state;
        await hookEmit("global", "beforeDestroy", destroyContext);
        await hookEmit(instance.lifecycleRegistry, "beforeDestroy");

        if (!document.body.querySelector(this.tagName.toLowerCase())) {
          document.head
            .querySelector(`style#style-${this.tagName.toLowerCase()}`)
            ?.remove();
        }

        await hookEmit("global", "destroyed", destroyContext);
        await hookEmit(instance.lifecycleRegistry, "destroyed");
      }
    }
  );
}
