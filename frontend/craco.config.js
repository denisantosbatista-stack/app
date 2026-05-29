// craco.config.js
const path = require("path");
require("dotenv").config();

// Check if we're in development/preview mode (not production build)
// Craco sets NODE_ENV=development for start, NODE_ENV=production for build
const isDevServer = process.env.NODE_ENV !== "production";

// Environment variable overrides
const config = {
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
};

// Conditionally load health check modules only if enabled
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
  setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
  healthPluginInstance = new WebpackHealthPlugin();
}

let webpackConfig = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {

      // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
        ],
      };

      // Add health check plugin to webpack if enabled
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }
      return webpackConfig;
    },
  },
};

webpackConfig.devServer = (devServerConfig) => {
  // Add health check endpoints if enabled
  if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
    const originalSetupMiddlewares = devServerConfig.setupMiddlewares;

    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      // Call original setup if exists
      if (originalSetupMiddlewares) {
        middlewares = originalSetupMiddlewares(middlewares, devServer);
      }

      // Setup health endpoints
      setupHealthEndpoints(devServer, healthPluginInstance);

      return middlewares;
    };
  }

  return devServerConfig;
};

// Wrap with visual edits (automatically adds babel plugin, dev server, and overlay in dev mode)
if (isDevServer) {
  try {
    const { withVisualEdits } = require("@emergentbase/visual-edits/craco");
    webpackConfig = withVisualEdits(webpackConfig);

    // Patch visual-edits babel plugin to skip files containing react-three-fiber components.
    // R3F v9 strictly validates props and rejects the injected "x-line-number" / "x-source-info"
    // attributes on its lowercase Three.js intrinsics (<mesh>, <group>, <ambientLight>, etc.).
    // We wrap the original plugin so that when babel processes a 3D file, no meta-attributes
    // are injected on its JSX elements.
    const SKIP_PATTERN = /(Productions3D|MixerSwirl|Studio3D|R3F)/i;
    const babelCfg = webpackConfig.babel || {};
    const plugins = babelCfg.plugins || [];
    const lastIdx = plugins.length - 1;
    const orig = plugins[lastIdx];
    if (typeof orig === "function") {
      plugins[lastIdx] = function wrappedVisualEditsPlugin(babel, opts) {
        const built = orig(babel, opts);
        const origVisitor = built.visitor || {};
        const wrapVisitor = (fn) => {
          if (typeof fn !== "function") return fn;
          return function (path, state) {
            const filename =
              state.filename || state.file?.opts?.filename || "";
            if (SKIP_PATTERN.test(filename)) {
              return;
            }
            return fn.call(this, path, state);
          };
        };
        return {
          ...built,
          visitor: {
            ...origVisitor,
            JSXElement: wrapVisitor(origVisitor.JSXElement),
            JSXOpeningElement: wrapVisitor(origVisitor.JSXOpeningElement),
          },
        };
      };
    } else {
      // visual-edits plugin signature changed; skip wrap silently
    }
    webpackConfig.babel = { ...babelCfg, plugins };
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' && err.message.includes('@emergentbase/visual-edits/craco')) {
      console.warn(
        "[visual-edits] @emergentbase/visual-edits not installed — visual editing disabled."
      );
    } else {
      throw err;
    }
  }
}

module.exports = webpackConfig;
