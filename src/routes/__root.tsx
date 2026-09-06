import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import pawTrendsStylesheet from "@/styles/paw-trends.css?url";

function PawTrendsDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function PawTrendsRoot() {
  return (
    <PawTrendsDocument>
      <Outlet />
    </PawTrendsDocument>
  );
}

export const Route = createRootRoute({
  component: PawTrendsRoot,
  head: () => ({
    links: [
      { href: pawTrendsStylesheet, rel: "stylesheet" },
      { href: "/favicon.svg", rel: "icon", type: "image/svg+xml" },
      { href: "/manifest.webmanifest", rel: "manifest" },
    ],
    meta: [
      { charSet: "utf-8" },
      {
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
        name: "viewport",
      },
      { content: "#22443a", name: "theme-color" },
      { title: "Paw Trends · Today" },
      {
        content:
          "A private dog trigger and wellness tracker stored on this device.",
        name: "description",
      },
    ],
  }),
});
