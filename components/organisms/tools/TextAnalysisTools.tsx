"use client"

import { useMemo, useState } from "react"

import { Textarea } from "@/components/atoms/textarea"

import {
  ToolField,
  ToolMetric,
  ToolPanel,
  ToolStatusBadge,
  ToolWorkspaceGrid,
} from "./ToolWorkspaceUi"

const SAMPLE =
  "Clear product pages explain who a product is for, what problem it solves, and why the solution is credible. Useful details help readers decide whether the product fits their workflow."

const STOP_WORDS = new Set(
  "a an and are as at be been but by for from had has have he her hers him his i if in into is it its me my nor not of on or our ours she so than that the their theirs them they this those to too us was we were what when where which who will with you your yours".split(
    " ",
  ),
)

function wordsFrom(text: string) {
  return (
    text.toLocaleLowerCase().match(/[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu) ??
    []
  )
}

function textStats(text: string) {
  const words = wordsFrom(text)
  const characters = text.length
  const charactersWithoutSpaces = text.replace(/\s/g, "").length
  const sentences = text.trim()
    ? (text.match(/[^.!?]+(?:[.!?]+|$)/g) ?? []).filter((item) => item.trim())
        .length
    : 0
  const paragraphs = text.trim()
    ? text
        .trim()
        .split(/\n\s*\n/)
        .filter(Boolean).length
    : 0
  const totalLetters = words.reduce((sum, word) => sum + word.length, 0)

  return {
    words,
    characters,
    charactersWithoutSpaces,
    sentences,
    paragraphs,
    averageWordLength: words.length ? totalLetters / words.length : 0,
    readingMinutes: words.length / 200,
    speakingMinutes: words.length / 130,
  }
}

function formatDuration(minutes: number) {
  if (!minutes) return "0 min"
  if (minutes < 1) return `${Math.max(1, Math.round(minutes * 60))} sec`
  return `${Math.ceil(minutes)} min`
}

function frequencyRows(words: string[], size: number, hideStopWords: boolean) {
  const filtered = hideStopWords
    ? words.filter((word) => !STOP_WORDS.has(word))
    : words
  const counts = new Map<string, number>()
  for (let index = 0; index <= filtered.length - size; index += 1) {
    const phrase = filtered.slice(index, index + size).join(" ")
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([phrase, count]) => ({
      phrase,
      count,
      density: words.length ? (count / words.length) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase))
    .slice(0, 15)
}

function FrequencyTable({ rows }: { rows: ReturnType<typeof frequencyRows> }) {
  if (!rows.length) {
    return <p className="text-sm text-slate-500">Add more text to see terms.</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[28rem] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Term</th>
            <th className="px-4 py-3 text-right font-semibold">Count</th>
            <th className="px-4 py-3 text-right font-semibold">Density</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((row) => (
            <tr key={row.phrase}>
              <td className="px-4 py-3 font-medium text-slate-900">
                {row.phrase}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                {row.count}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                {row.density.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function WordCounterTool() {
  const [text, setText] = useState(SAMPLE)
  const stats = useMemo(() => textStats(text), [text])
  const terms = useMemo(
    () => frequencyRows(stats.words, 1, true).slice(0, 10),
    [stats.words],
  )

  return (
    <div className="space-y-6">
      <ToolPanel
        id="word-counter-input"
        title="Your text"
        description="Everything is counted locally in this browser as you type."
        action={
          <ToolStatusBadge tone="good">Private by design</ToolStatusBadge>
        }
      >
        <ToolField htmlFor="word-counter-text" label="Content">
          <Textarea
            id="word-counter-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="min-h-72 resize-y border-slate-300 bg-white leading-7"
            placeholder="Paste or write your content…"
          />
        </ToolField>
      </ToolPanel>

      <ToolPanel id="word-counter-summary" title="Live summary">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <ToolMetric
            label="Words"
            value={stats.words.length.toLocaleString()}
          />
          <ToolMetric
            label="Characters"
            value={stats.characters.toLocaleString()}
          />
          <ToolMetric
            label="Without spaces"
            value={stats.charactersWithoutSpaces.toLocaleString()}
          />
          <ToolMetric
            label="Sentences"
            value={stats.sentences.toLocaleString()}
          />
          <ToolMetric
            label="Paragraphs"
            value={stats.paragraphs.toLocaleString()}
          />
          <ToolMetric
            label="Average word"
            value={`${stats.averageWordLength.toFixed(1)} chars`}
          />
          <ToolMetric
            label="Reading time"
            value={formatDuration(stats.readingMinutes)}
          />
          <ToolMetric
            label="Speaking time"
            value={formatDuration(stats.speakingMinutes)}
          />
        </div>
      </ToolPanel>

      <ToolPanel
        id="word-counter-terms"
        title="Most frequent meaningful words"
        description="Common stop words are hidden from this table."
      >
        <FrequencyTable rows={terms} />
      </ToolPanel>
    </div>
  )
}

export function KeywordDensityTool() {
  const [text, setText] = useState(SAMPLE)
  const [phraseSize, setPhraseSize] = useState(1)
  const [hideStopWords, setHideStopWords] = useState(true)
  const stats = useMemo(() => textStats(text), [text])
  const rows = useMemo(
    () => frequencyRows(stats.words, phraseSize, hideStopWords),
    [hideStopWords, phraseSize, stats.words],
  )
  const highest = rows[0]?.density ?? 0

  return (
    <ToolWorkspaceGrid>
      <ToolPanel
        id="density-input"
        title="Content to analyze"
        description="Paste the visible copy from one page. The text stays in your browser."
      >
        <div className="space-y-5">
          <ToolField htmlFor="density-text" label="Page copy">
            <Textarea
              id="density-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="min-h-80 resize-y border-slate-300 bg-white leading-7"
              placeholder="Paste page content…"
            />
          </ToolField>
          <div className="grid gap-4 sm:grid-cols-2">
            <ToolField htmlFor="density-phrase-size" label="Phrase length">
              <select
                id="density-phrase-size"
                value={phraseSize}
                onChange={(event) => setPhraseSize(Number(event.target.value))}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                <option value={1}>Single words</option>
                <option value={2}>Two-word phrases</option>
                <option value={3}>Three-word phrases</option>
              </select>
            </ToolField>
            <label className="flex min-h-10 items-center gap-3 self-end rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={hideStopWords}
                onChange={(event) => setHideStopWords(event.target.checked)}
                className="size-4 accent-[#0051d5]"
              />
              Hide common stop words
            </label>
          </div>
        </div>
      </ToolPanel>

      <div className="space-y-6" aria-live="polite">
        <ToolPanel
          id="density-summary"
          title="Content summary"
          action={
            <ToolStatusBadge tone={highest > 5 ? "warning" : "good"}>
              {highest > 5 ? "Review repetition" : "No obvious stuffing"}
            </ToolStatusBadge>
          }
        >
          <div className="grid grid-cols-3 gap-3">
            <ToolMetric label="Words" value={stats.words.length} />
            <ToolMetric
              label="Unique terms"
              value={new Set(stats.words).size}
            />
            <ToolMetric label="Top density" value={`${highest.toFixed(2)}%`} />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Density has no ideal target. Use the table to find wording that
            sounds repetitive, then edit for clarity and completeness.
          </p>
        </ToolPanel>
        <ToolPanel id="density-terms" title="Frequent terms and phrases">
          <FrequencyTable rows={rows} />
        </ToolPanel>
      </div>
    </ToolWorkspaceGrid>
  )
}
