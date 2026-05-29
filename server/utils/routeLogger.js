function listRoutes(app) {
  const routes = [];

  function walk(stack, prefix = "") {
    if (!Array.isArray(stack)) {
      return;
    }

    stack.forEach((layer) => {
      if (layer.route?.path) {
        const methods = Object.keys(layer.route.methods || {})
          .filter(Boolean)
          .map((method) => method.toUpperCase())
          .join(", ");
        routes.push({
          methods,
          path: `${prefix}${layer.route.path}`,
        });
        return;
      }

      if (layer.name === "router" && layer.handle?.stack) {
        const match = layer.regexp?.toString().match(/\\\/(.*?)\\\/\?\(\?=\\\/\|\$\)/);
        const segment = match?.[1]
          ? `/${match[1].replace(/\\\//g, "/").replace(/\^\//g, "").replace(/\$$/g, "")}`
          : "";
        walk(layer.handle.stack, `${prefix}${segment}`);
      }
    });
  }

  const stack = app.router?.stack || app._router?.stack || [];
  walk(stack);

  return routes
    .map((route) => ({
      ...route,
      path: route.path.replace(/\/+/g, "/"),
    }))
    .sort((a, b) => a.path.localeCompare(b.path) || a.methods.localeCompare(b.methods));
}

function logRoutes(app) {
  const routes = listRoutes(app);

  console.log("Available routes:");
  routes.forEach((route) => {
    console.log(`  ${route.methods.padEnd(12)} ${route.path}`);
  });
}

module.exports = {
  listRoutes,
  logRoutes,
};
