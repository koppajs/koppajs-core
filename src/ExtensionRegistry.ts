// 📁 src/ExtensionRegistry.ts

export default {
  modules: {} as Record<string, IModule>,
  plugins: {} as Record<string, IPlugin>,
  components: {} as Record<string, Component>,
  instances: {} as Record<string, Instance>,
};
