"use client";

import * as React from "react";

import { mergePawTrendsClassNames } from "@/shared/paw-trends-class-names";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    // oxlint-disable-next-line jsx-a11y/label-has-associated-control -- callers provide htmlFor.
    <label
      data-slot="label"
      className={mergePawTrendsClassNames(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Label };
