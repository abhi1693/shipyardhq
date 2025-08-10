"use client"

type Step = { id: number; label: string }

export default function WizardStepper({
  steps,
  step,
}: {
  steps: Step[]
  step: number
}) {
  return (
    <div className="mb-6">
      <ol className="flex items-center justify-between gap-2">
        {steps.map((s, idx) => {
          const isDone = step > s.id
          const isCurrent = step === s.id
          return (
            <li key={s.id} className="flex-1 flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={
                    `flex h-7 w-7 items-center justify-center rounded-full border text-xs ` +
                    (isCurrent
                      ? "bg-primary text-primary-foreground border-primary"
                      : isDone
                        ? "bg-primary/80 text-primary-foreground border-primary/80"
                        : "bg-muted text-muted-foreground border-muted-foreground/20")
                  }
                >
                  {s.id}
                </div>
                <span
                  className={
                    "text-sm " +
                    (isCurrent ? "font-medium" : "text-muted-foreground")
                  }
                >
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className="mx-2 hidden sm:block h-[2px] flex-1 rounded bg-muted">
                  <div
                    className={
                      "h-[2px] rounded bg-primary transition-all duration-300 " +
                      (step > s.id ? "w-full" : "w-0")
                    }
                  />
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
