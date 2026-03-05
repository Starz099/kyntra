import Link from "next/link";
import CyclingTerminal from "./components/CyclingTerminal";

const formatCount = (value: number) => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}m`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }

  return `${value}`;
};

const fetchGithubStars = async () => {
  try {
    const response = await fetch(
      "https://api.github.com/repos/Starz099/kyntra",
      {
        next: { revalidate: 3600 },
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { stargazers_count?: number };
    return typeof data.stargazers_count === "number"
      ? data.stargazers_count
      : null;
  } catch {
    return null;
  }
};

const fetchNpmDownloads = async () => {
  try {
    const response = await fetch(
      "https://api.npmjs.org/downloads/point/last-month/kyntra",
      {
        next: { revalidate: 3600 },
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { downloads?: number };
    return typeof data.downloads === "number" ? data.downloads : null;
  } catch {
    return null;
  }
};

export default async function HomePage() {
  const [githubStars, npmDownloads] = await Promise.all([
    fetchGithubStars(),
    fetchNpmDownloads(),
  ]);

  return (
    <main className="kyntra-shell flex h-screen flex-col overflow-hidden">
      <div className="kyntra-bg" aria-hidden="true" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <p className="text-3xl font-semibold tracking-tight text-slate-900">
          Kyntra
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <span className="dotted-secondary border bg-white/70 px-3 py-1.5 font-mono text-[13px] text-slate-800">
            npm downloads | {npmDownloads ? formatCount(npmDownloads) : "-"}
          </span>
          <span className="dotted-secondary border bg-white/70 px-3 py-1.5 font-mono text-[13px] text-slate-800">
            github stars | {githubStars ? formatCount(githubStars) : "-"}
          </span>
          <Link
            href="/docs"
            className="dotted-primary border bg-slate-900 px-4 py-2 font-semibold text-white shadow hover:bg-slate-800"
          >
            docs
          </Link>
        </div>
      </header>

      <section className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 gap-8 px-6 pb-4 pt-2 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div className="flex h-full flex-col justify-center">
          <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl lg:text-[56px]">
            Make development easier with an AI-first CLI.
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-slate-700 sm:text-lg">
            Kyntra helps developers map repositories, understand code context,
            and generate better commits using practical AI workflows from the
            terminal.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="https://www.npmjs.com/package/kyntra"
              className="dotted-primary border bg-slate-900 px-5 py-2.5 text-sm font-medium text-slate-50 shadow hover:bg-slate-800"
            >
              Install from npm
            </a>
            <Link
              href="/docs"
              className="dotted-secondary border bg-white px-5 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              Read documentation
            </Link>
          </div>
        </div>

        <div className="min-h-0 self-center lg:justify-self-end lg:w-full lg:max-w-140">
          <CyclingTerminal />
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4 text-sm text-slate-700">
        <p>
          made with love by{" "}
          <a
            href="https://starzz.dev"
            className="underline decoration-dotted underline-offset-4"
          >
            starz
          </a>
        </p>
        <div className="flex items-center gap-3">
          <a
            href="https://www.npmjs.com/package/kyntra"
            className="underline decoration-dotted underline-offset-4"
          >
            npm
          </a>
          <a
            href="https://github.com/Starz099/kyntra"
            className="underline decoration-dotted underline-offset-4"
          >
            github
          </a>
        </div>
      </footer>
    </main>
  );
}
