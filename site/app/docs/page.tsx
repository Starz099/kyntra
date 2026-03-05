import Link from "next/link";
import CopyCommandBlock from "../components/CopyCommandBlock";

const installSteps = [
  "npm i -g kyntra",
  "kyntra api-key:set <your-gemini-api-key>",
  "cd /path/to/your/repo",
  "kyntra run",
];

const commands = [
  {
    name: "kyntra run",
    description: "Start the local web app and open the dependency graph view.",
  },
  {
    name: "kyntra commit",
    description:
      "Generate an AI-assisted commit message from staged changes, then commit.",
  },
  {
    name: "kyntra cache:list",
    description: "List persisted graph cache entries on your machine.",
  },
  {
    name: "kyntra cache:clear",
    description: "Delete all persisted graph cache entries.",
  },
  {
    name: "kyntra cache:delete <key>",
    description: "Delete one cache entry by key (usually the git root path).",
  },
  {
    name: "kyntra api-key:set <key>",
    description: "Persist your Gemini API key for local CLI usage.",
  },
  {
    name: "kyntra api-key:show",
    description: "Show the stored API key in masked form.",
  },
  {
    name: "kyntra api-key:clear",
    description: "Remove the persisted API key.",
  },
];

const troubleshooting = [
  {
    title: "No API key configured",
    detail: "Run 'kyntra api-key:set <key>' and retry the command.",
  },
  {
    title: "No Git repository found",
    detail: "Run Kyntra from inside a Git repository directory.",
  },
  {
    title: "Graph generation is slow",
    detail:
      "Use cache commands to inspect existing entries and avoid unnecessary refreshes.",
  },
];

export default function DocsPage() {
  return (
    <main className="kyntra-shell min-h-screen">
      <div className="kyntra-bg" aria-hidden="true" />
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold text-slate-950">Kyntra Docs</h1>
          <Link
            href="/"
            className="dotted-secondary border bg-white px-4 py-2 text-sm text-slate-900 hover:bg-slate-100"
          >
            Back to landing
          </Link>
        </div>

        <section className="dotted-primary mt-8 border bg-white/90 p-5 shadow-lg shadow-slate-200/50">
          <h2 className="text-xl font-semibold text-slate-900">Install</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Follow the setup sequence below. Click any command card to copy it
            directly to your clipboard.
          </p>
          <ol className="mt-4 space-y-3">
            {installSteps.map((step) => (
              <li key={step}>
                <CopyCommandBlock command={step} />
              </li>
            ))}
          </ol>
        </section>

        <section className="dotted-primary mt-6 border bg-white/90 p-5 shadow-lg shadow-slate-200/50">
          <h2 className="text-xl font-semibold text-slate-900">Commands</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Core commands for daily workflow. Click any command card to copy.
          </p>
          <div className="mt-4 space-y-3">
            {commands.map((command) => (
              <CopyCommandBlock
                key={command.name}
                command={command.name}
                description={command.description}
              />
            ))}
          </div>
        </section>

        <section className="dotted-secondary mt-6 border bg-white/90 p-5 shadow-lg shadow-slate-200/50">
          <h2 className="text-xl font-semibold text-slate-900">How It Works</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Kyntra scans your repository context, asks Gemini to infer file
            dependencies and summaries, then renders an interactive graph in a
            local browser app. Generated graphs are cached to keep repeat runs
            fast.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li className="dotted-secondary border bg-slate-50 px-3 py-2">
              Step 1: collect repository context and structure
            </li>
            <li className="dotted-secondary border bg-slate-50 px-3 py-2">
              Step 2: infer dependencies and file summaries
            </li>
            <li className="dotted-secondary border bg-slate-50 px-3 py-2">
              Step 3: render graph and persist cache for speed
            </li>
          </ul>
        </section>

        <section className="dotted-secondary mt-6 border bg-white/90 p-5 shadow-lg shadow-slate-200/50">
          <h2 className="text-xl font-semibold text-slate-900">
            Main command flow
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            This is the fastest path from zero setup to first useful output.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CopyCommandBlock
              command="npm i -g kyntra"
              description="Install Kyntra globally so the `kyntra` command is available."
            />
            <CopyCommandBlock
              command="kyntra api-key:set <your-gemini-api-key>"
              description="Persist API key locally once for AI-powered features."
            />
            <CopyCommandBlock
              command="kyntra run"
              description="Launch local frontend and explore dependency graph visually."
            />
            <CopyCommandBlock
              command="kyntra commit"
              description="Generate a suggested commit message from staged changes."
            />
          </div>
        </section>

        <section className="dotted-secondary mt-6 border bg-white/90 p-5 shadow-lg shadow-slate-200/50">
          <h2 className="text-xl font-semibold text-slate-900">
            Troubleshooting
          </h2>
          <div className="mt-4 space-y-3">
            {troubleshooting.map((item) => (
              <article
                key={item.title}
                className="dotted-secondary border bg-slate-50 p-3"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {item.title}
                </p>
                <p className="mt-1 text-sm text-slate-700">{item.detail}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
