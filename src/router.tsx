import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

/** Creates the Paw Trends browser router. */
export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
  });
}
