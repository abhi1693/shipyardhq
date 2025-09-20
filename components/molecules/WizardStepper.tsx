"use client"

type Step = { id: number; label: string }

export default function WizardStepper({
  steps,
  step,
}: {
  steps: Step[]
  step: number
}) {
  const currentIndex = Math.max(
    steps.findIndex((s) => s.id === step),
    0,
  )
  const progress =
    steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 100

  return (
    <div className="mb-6 space-y-4">
      <div className="relative h-0.5 rounded bg-slate-200">
        <div
          className="absolute inset-y-0 left-0 h-0.5 rounded bg-[color:var(--brand-1)] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ol className="flex items-center justify-between gap-2">
        {steps.map((s, index) => {
          const isCurrent = index === currentIndex
          const isCompleted = index < currentIndex
          const circleClass = isCurrent
            ? "bg-[linear-gradient(135deg,var(--brand-1),var(--brand-2))] text-white border-[color:var(--brand-1)]"
            : isCompleted
              ? "bg-sky-100 text-sky-700 border-sky-200"
              : "bg-slate-100 text-slate-500 border-slate-200"

          return (
            <li
              key={s.id}
              className="flex flex-1 flex-col items-center gap-2 text-center"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium transition-colors ${circleClass}`}
              >
                {index + 1}
              </div>
              <span
                className={`text-xs uppercase tracking-[0.12em] ${
                  isCurrent ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
