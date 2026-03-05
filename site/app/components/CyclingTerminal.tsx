"use client";

import { useEffect, useState } from "react";

type DemoStep = {
  command: string;
  output: string[];
};

type CyclingTerminalProps = {
  className?: string;
};

const demoSteps: DemoStep[] = [
  {
    command: "npm i -g kyntra",
    output: ["added 48 packages in 5s", "kyntra installed globally"],
  },
  {
    command: "kyntra api-key:set <your-gemini-api-key>",
    output: [
      "Saving API key...",
      "API key saved.",
      "Stored in: ~/.kyntra/api-key.json",
    ],
  },
  {
    command: "kyntra run",
    output: [
      "Launching Kyntra ...",
      "Kyntra running at http://localhost:6767",
      "Graph built: 252 nodes, 611 edges.",
    ],
  },
  {
    command: "kyntra commit",
    output: [
      "Generating commit message suggestion...",
      "Commit message suggestion ready.",
      "Suggested: feat: add command palette",
    ],
  },
];

export default function CyclingTerminal({ className }: CyclingTerminalProps) {
  const [activeStep, setActiveStep] = useState<DemoStep>(demoSteps[0]);
  const [typedCommand, setTypedCommand] = useState("");
  const [visibleOutputCount, setVisibleOutputCount] = useState(0);
  const [history, setHistory] = useState<DemoStep[]>([]);

  useEffect(() => {
    let cancelled = false;

    const sleep = async (ms: number) => {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
      });
    };

    const runDemoLoop = async () => {
      while (!cancelled) {
        for (let index = 0; index < demoSteps.length; index += 1) {
          if (cancelled) {
            return;
          }

          const step = demoSteps[index];
          setActiveStep(step);
          setTypedCommand("");
          setVisibleOutputCount(0);
          await sleep(80);

          for (
            let charIndex = 0;
            charIndex <= step.command.length;
            charIndex += 1
          ) {
            if (cancelled) {
              return;
            }

            setTypedCommand(step.command.slice(0, charIndex));
            await sleep(24);
          }

          for (
            let lineCount = 1;
            lineCount <= step.output.length;
            lineCount += 1
          ) {
            if (cancelled) {
              return;
            }

            setVisibleOutputCount(lineCount);
            await sleep(300);
          }

          setHistory((prev) => [...prev, step].slice(-8));
          setTypedCommand("");
          setVisibleOutputCount(0);
          await sleep(260);
        }

        if (cancelled) {
          return;
        }

        await sleep(1000);
        if (cancelled) {
          return;
        }

        setHistory([]);
        setTypedCommand("");
        setVisibleOutputCount(0);
        setActiveStep(demoSteps[0]);
      }
    };

    void runDemoLoop();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!activeStep) {
    return null;
  }

  const containerClassName = [
    "dotted-primary border bg-[#fff8ee]/95 p-4 text-slate-800 shadow-xl shadow-amber-300/25",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClassName}>
      <div className="h-full min-h-90 overflow-hidden border border-amber-500/55 bg-[#fffdf8] p-3 font-mono text-xs sm:text-sm">
        {history.map((step, index) => (
          <div key={`${step.command}-${index}`} className="mb-3">
            <p>
              <span className="text-amber-600">$</span> {step.command}
            </p>
            {step.output.map((line, lineIndex) => (
              <p key={`${line}-${lineIndex}`} className="text-slate-700">
                {line}
              </p>
            ))}
          </div>
        ))}

        <div>
          <p>
            <span className="text-amber-600">$</span> {typedCommand}
            <span className="terminal-cursor" aria-hidden="true">
              |
            </span>
          </p>
          {activeStep.output.slice(0, visibleOutputCount).map((line, index) => (
            <p key={`${line}-${index}`} className="text-slate-700">
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
