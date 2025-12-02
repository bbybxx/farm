# Craft Calculator (EXAMPLE README)

This example README removes direct references to the private GraphQL endpoint. Replace links and set `GRAPHQL_API_ENDPOINT` in your environment or `.env`.

... (content omitted) ...

## Automation & Data Sync

The project uses GitHub Actions to automatically sync game data from a private GraphQL API (configure the endpoint via `GRAPHQL_API_ENDPOINT`).

### Run Scripts Locally

```bash
# Sync recipes and items
node scripts/sync-recipes-node.mjs

# Sync drop rates
node scripts/sync-drop-rates.mjs

# Sync quests
node scripts/sync-quests.mjs

# Download missing images
node scripts/download-images.mjs
```

Note: These scripts call the GraphQL API specified by `GRAPHQL_API_ENDPOINT`. See `.env.example` for sample configuration.
