# Paw Trends

> A hands-on product management learning project about using AI tools across the product development process.

I am building Paw Trends to learn where AI tools help a product manager, where they need direction, and where human judgment still matters. The repository documents my work from problem framing and scope decisions through specifications, implementation, testing, and deployment.

Paw Trends is a private, local-first web app for recording a dog's moods, activities, symptoms, and surrounding conditions. Its goal is to help one owner inspect possible associations in those observations without presenting correlation as causation or medical advice.

## What I am learning

This project is my practical test bed for AI-assisted product management. I use AI tools to help me:

- turn a personal problem into a defined product scope and versioned specification
- develop a consistent domain model and product language
- explore user flows and interface decisions for regular mobile use
- move from product requirements to working software
- write and run automated checks against expected behavior
- document tradeoffs and keep decisions traceable

AI speeds up parts of the work, but it does not own the product decisions. I set the problem, constraints, priorities, and acceptance criteria, then review and test the output. The repo is intended to show both the resulting product and the process behind it.

## Product decisions

A few choices shape the first version:

- Observation data stays in the browser. There are no accounts, analytics, ads, or application backend.
- The app reports associations, not diagnoses or causal claims.
- Results must be reproducible from the observations that contributed to them.
- The primary experience is designed for an owner logging observations on an iPhone.
- JSON backup and restore reduce the risk of keeping data on one device and browser.

The project is a work in progress. The [product document](./PRODUCT.md) describes the intended version 1 experience and its boundaries.

## Repository guide

- [Version 1 specification](./docs/specs/paw-trends-v1.md)
- [Product definition](./PRODUCT.md)
- [Domain glossary](./CONTEXT.md)
- [Architecture decisions](./docs/adr/)
- [Automated tests](./src/)

## Technology

Paw Trends uses React, TypeScript, TanStack Start in client-only SPA mode, Vite+, Tailwind CSS, Dexie, Zod, Vitest, and Playwright. It is packaged as an installable offline-capable web app and deployed with ChatGPT Sites.

## Run locally

Install dependencies with `pnpm install`, then use:

- `pnpm dev` to run Paw Trends locally
- `pnpm check` to format, lint, and type-check the project
- `pnpm test` to run the local persistence and backup checks
- `pnpm test:browser` to run the phone-sized persistence and offline checks
- `pnpm build` to create the deployable site in `dist/client`
