# paw-trends

Paw Trends is a private, local-first tracker for exploring associations between a Dog's moods and the Owner's recorded observations.

- [v1 specification](./docs/specs/paw-trends-v1.md)
- [domain glossary](./CONTEXT.md)
- [architecture decisions](./docs/adr/)

## Development

Install dependencies with `pnpm install`, then use:

- `pnpm dev` to run Paw Trends locally
- `pnpm check` to format, lint, and type-check the project
- `pnpm test` for the local persistence and backup checks
- `pnpm test:browser` for the phone-sized persistence and offline checks
- `pnpm build` to create the deployable Site in `dist/client`
