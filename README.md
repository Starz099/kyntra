# Kyntra CLI

Kyntra helps you understand codebases faster by generating an interactive dependency graph using AI your repository.

## Install

```bash
npm i -g kyntra
# or
pnpm add -g kyntra
# or
yarn global add kyntra
```

## Requirements

- Node.js 20+
- A Gemini API key
- A Git repository to analyze

## Quick Start

```bash
kyntra api-key:set <your-gemini-api-key>
cd /path/to/your/repo
kyntra run
```

This starts a local server and opens the graph UI at `http://localhost:6767`.

## Commands

### `kyntra run`

Launch the local graph server and frontend.

### `kyntra commit`

Generate an AI commit message for staged changes and commit interactively.

### `kyntra cache:list`

List persisted graph cache entries.

### `kyntra cache:clear`

Clear all persisted graph cache entries.

### `kyntra cache:delete <key>`

Delete a single persisted cache entry by key.

### `kyntra api-key:set <key>`

Store your Gemini API key locally.

### `kyntra api-key:show`

Show stored API key in masked form.

### `kyntra api-key:clear`

Delete stored API key.

## How it Works

1. Kyntra collects repository context.
2. Gemini analyzes file summaries and dependencies.
3. Kyntra renders the result as an interactive graph.
4. The graph is cached for faster subsequent loads.
