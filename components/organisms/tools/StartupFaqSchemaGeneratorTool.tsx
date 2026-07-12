"use client"

import { useMemo, useRef, useState } from "react"
import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/atoms/button"
import { Input } from "@/components/atoms/input"
import { Textarea } from "@/components/atoms/textarea"
import {
  CopyableCode,
  DownloadTextButton,
  ToolEmptyState,
  ToolPanel,
  ToolStatusBadge,
  ToolWorkspaceGrid,
} from "@/components/organisms/tools/ToolWorkspaceUi"
import {
  generateFaqSchema,
  type FaqEntry,
  wrapJsonLdInScriptTag,
} from "@/lib/tools/generators"

type EditableFaq = FaqEntry & { id: number }

const initialEntries: EditableFaq[] = [
  {
    id: 1,
    question: "What does your product help customers do?",
    answer:
      "Explain the main outcome in one clear sentence, using the language your customers use.",
  },
  {
    id: 2,
    question: "Who is your product for?",
    answer:
      "Describe the customer or team that gets the most value from your product.",
  },
]

export function StartupFaqSchemaGeneratorTool() {
  const [entries, setEntries] = useState(initialEntries)
  const nextId = useRef(3)

  const completeEntries = useMemo(
    () =>
      entries.filter(
        ({ question, answer }) => question.trim() && answer.trim(),
      ),
    [entries],
  )
  const json = useMemo(
    () => generateFaqSchema(completeEntries),
    [completeEntries],
  )
  const script = wrapJsonLdInScriptTag(json)

  function updateEntry(
    id: number,
    field: "question" | "answer",
    value: string,
  ) {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      ),
    )
  }

  function addEntry() {
    if (entries.length >= 10) return
    const id = nextId.current
    nextId.current += 1
    setEntries((current) => [...current, { id, question: "", answer: "" }])
  }

  function removeEntry(id: number) {
    setEntries((current) => current.filter((entry) => entry.id !== id))
  }

  return (
    <ToolWorkspaceGrid>
      <ToolPanel
        id="faq-inputs"
        title="Your startup FAQs"
        description="Add the questions people ask before trying, buying, or launching your product."
        action={
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addEntry}
            disabled={entries.length >= 10}
          >
            <Plus aria-hidden="true" />
            Add FAQ
          </Button>
        }
      >
        <div className="space-y-5">
          {entries.map((entry, index) => (
            <fieldset
              key={entry.id}
              className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <legend className="sr-only">FAQ {index + 1}</legend>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  FAQ {index + 1}
                </p>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeEntry(entry.id)}
                  aria-label={`Remove FAQ ${index + 1}`}
                  disabled={entries.length === 1}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              <label
                htmlFor={`faq-question-${entry.id}`}
                className="block text-sm font-medium text-slate-900"
              >
                Question
              </label>
              <Input
                id={`faq-question-${entry.id}`}
                value={entry.question}
                onChange={(event) =>
                  updateEntry(entry.id, "question", event.target.value)
                }
                className="h-10 border-slate-300 bg-white"
                placeholder="Does your product offer a free plan?"
              />
              <label
                htmlFor={`faq-answer-${entry.id}`}
                className="block text-sm font-medium text-slate-900"
              >
                Answer
              </label>
              <Textarea
                id={`faq-answer-${entry.id}`}
                value={entry.answer}
                onChange={(event) =>
                  updateEntry(entry.id, "answer", event.target.value)
                }
                className="min-h-24 border-slate-300 bg-white"
                placeholder="Yes. The free plan includes..."
              />
            </fieldset>
          ))}
          <p className="text-xs leading-5 text-slate-500">
            Only complete question-and-answer pairs are included. Add the same
            FAQs visibly to the page where you publish this markup.
          </p>
        </div>
      </ToolPanel>

      <div className="space-y-6" aria-live="polite">
        <ToolPanel
          id="faq-preview"
          title="FAQ preview"
          description="A quick check of the customer-facing content represented by your schema."
          action={
            <ToolStatusBadge tone={completeEntries.length ? "good" : "warning"}>
              {completeEntries.length} complete
            </ToolStatusBadge>
          }
        >
          {completeEntries.length ? (
            <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">
              {completeEntries.map((entry) => (
                <div key={entry.id} className="space-y-1.5 p-4">
                  <p className="font-semibold text-slate-950">
                    {entry.question.trim()}
                  </p>
                  <p className="text-sm leading-6 text-slate-600">
                    {entry.answer.trim()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <ToolEmptyState
              title="Complete one FAQ to generate a preview"
              description="Both the question and its answer are required."
            />
          )}
        </ToolPanel>

        <ToolPanel
          id="faq-code"
          title="FAQPage JSON-LD"
          description="Valid structured data does not guarantee a search rich result."
          action={
            <DownloadTextButton
              content={json}
              filename="faq-schema.json"
              label="Download JSON"
              mimeType="application/ld+json;charset=utf-8"
              disabled={!completeEntries.length}
            />
          }
        >
          <CopyableCode code={script} label="JSON-LD script" />
        </ToolPanel>
      </div>
    </ToolWorkspaceGrid>
  )
}
