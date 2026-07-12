"use client"

import { useState } from "react"
import { CheckCircle2, CircleAlert } from "lucide-react"

import { Input } from "@/components/atoms/input"
import { Textarea } from "@/components/atoms/textarea"
import { analyzeProductDescriptionPhrases } from "@/lib/tools/product-description-seo"

import {
  CopyTextButton,
  DownloadTextButton,
  ToolEmptyState,
  ToolField,
  ToolMetric,
  ToolPanel,
  ToolStatusBadge,
  ToolWorkspaceGrid,
} from "./ToolWorkspaceUi"

type SeoCheck = {
  label: string
  detail: string
  points: number
  maximum: number
  passed: boolean
}

function wordsIn(value: string) {
  return value.trim().match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []
}

function sentencesIn(value: string) {
  return value
    .trim()
    .split(/[.!?]+(?:\s|$)/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function analyzeDescription(description: string, focusKeyword: string) {
  const words = wordsIn(description)
  const sentences = sentencesIn(description)
  const wordCount = words.length
  const averageSentenceLength = sentences.length
    ? Math.round(wordCount / sentences.length)
    : 0
  const normalizedKeyword = focusKeyword.trim()
  const { keywordCount, topicStatedEarly, hasBenefit, hasAction } =
    analyzeProductDescriptionPhrases(description, focusKeyword)
  const hasSpecificity = /\b\d+(?:[.,]\d+)?%?\b/.test(description)
  const hasAudience = /\b(for|built for|designed for|made for)\b/i.test(
    description,
  )

  const checks: SeoCheck[] = [
    {
      label: "Useful depth",
      detail:
        wordCount >= 50 && wordCount <= 200
          ? "The description has enough detail without becoming unwieldy."
          : wordCount < 50
            ? "Explain the problem, audience, and outcome in at least 50 words."
            : "Consider moving supporting detail below the main description.",
      points:
        wordCount >= 50 && wordCount <= 200
          ? 20
          : wordCount >= 30 && wordCount <= 300
            ? 10
            : 0,
      maximum: 20,
      passed: wordCount >= 50 && wordCount <= 200,
    },
    {
      label: "Focus phrase usage",
      detail: !normalizedKeyword
        ? "Add a focus phrase to check topic alignment."
        : keywordCount >= 1 && keywordCount <= 3
          ? `“${focusKeyword.trim()}” appears ${keywordCount} ${keywordCount === 1 ? "time" : "times"}.`
          : keywordCount === 0
            ? "Use the focus phrase naturally at least once."
            : "The exact phrase appears often; replace repetitions with natural variants.",
      points:
        normalizedKeyword && keywordCount >= 1 && keywordCount <= 3
          ? 20
          : keywordCount > 3
            ? 8
            : 0,
      maximum: 20,
      passed: Boolean(
        normalizedKeyword && keywordCount >= 1 && keywordCount <= 3,
      ),
    },
    {
      label: "Topic stated early",
      detail: topicStatedEarly
        ? "The focus phrase appears within the opening 35 words."
        : "Introduce the product category or focus phrase near the beginning.",
      points: topicStatedEarly ? 15 : 0,
      maximum: 15,
      passed: topicStatedEarly,
    },
    {
      label: "Readable sentences",
      detail:
        averageSentenceLength > 0 && averageSentenceLength <= 22
          ? `Sentences average ${averageSentenceLength} words.`
          : averageSentenceLength
            ? `Sentences average ${averageSentenceLength} words; shorter sentences may scan more easily.`
            : "Add complete sentences so visitors can scan the description.",
      points:
        averageSentenceLength > 0 && averageSentenceLength <= 22
          ? 15
          : averageSentenceLength <= 30 && averageSentenceLength > 0
            ? 8
            : 0,
      maximum: 15,
      passed: averageSentenceLength > 0 && averageSentenceLength <= 22,
    },
    {
      label: "Benefit-led language",
      detail: hasBenefit
        ? "The copy describes an outcome or improvement."
        : "Add a concrete benefit such as saving time, reducing work, or growing reach.",
      points: hasBenefit ? 10 : 0,
      maximum: 10,
      passed: hasBenefit,
    },
    {
      label: "Audience clarity",
      detail: hasAudience
        ? "The description signals who the product is for."
        : "Name the audience explicitly, for example “built for indie founders.”",
      points: hasAudience ? 10 : 0,
      maximum: 10,
      passed: hasAudience,
    },
    {
      label: "Concrete detail",
      detail: hasSpecificity
        ? "A number adds a verifiable, concrete detail."
        : "If relevant, add a truthful number such as time saved, price, or supported integrations.",
      points: hasSpecificity ? 5 : 0,
      maximum: 5,
      passed: hasSpecificity,
    },
    {
      label: "Next action",
      detail: hasAction
        ? "The copy gives interested readers a next step."
        : "End with a clear next step such as try, launch, create, or get started.",
      points: hasAction ? 5 : 0,
      maximum: 5,
      passed: hasAction,
    },
  ]

  return {
    checks,
    score: checks.reduce((total, check) => total + check.points, 0),
    wordCount,
    sentenceCount: sentences.length,
    averageSentenceLength,
    keywordCount,
  }
}

function scoreLabel(score: number) {
  if (score >= 85) return { label: "Strong foundation", tone: "good" as const }
  if (score >= 65)
    return { label: "A few improvements", tone: "warning" as const }
  return { label: "Needs more detail", tone: "danger" as const }
}

export function ProductDescriptionSeoGraderTool() {
  const [description, setDescription] = useState(
    "Shipyard is a product launch platform built for startup founders and indie makers. Create a polished launch page, reach early users, and learn which channels drive attention without juggling multiple tools. Join makers launching SaaS, AI, app, and developer products, then get started with your first launch in under 10 minutes.",
  )
  const [focusKeyword, setFocusKeyword] = useState("product launch platform")

  const analysis = analyzeDescription(description, focusKeyword)
  const scoreState = scoreLabel(analysis.score)
  const report = [
    `Product description SEO checklist: ${analysis.score}/100`,
    `Words: ${analysis.wordCount}`,
    `Sentences: ${analysis.sentenceCount}`,
    `Average sentence length: ${analysis.averageSentenceLength} words`,
    `Focus phrase uses: ${analysis.keywordCount}`,
    "",
    ...analysis.checks.map(
      (check) =>
        `${check.passed ? "PASS" : "IMPROVE"} — ${check.label} (${check.points}/${check.maximum})\n${check.detail}`,
    ),
  ].join("\n")

  return (
    <ToolWorkspaceGrid>
      <ToolPanel
        id="description-input"
        title="Product copy"
        description="Paste the main description from your launch or landing page. Analysis stays in your browser."
      >
        <div className="space-y-5">
          <ToolField
            htmlFor="product-description"
            label="Product description"
            hint={`${analysis.wordCount} words`}
            required
            error={
              !description.trim() ? "Add a description to grade it." : undefined
            }
          >
            <Textarea
              id="product-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What does your product do, who is it for, and why is it useful?"
              className="min-h-64 resize-y"
              aria-invalid={!description.trim()}
              aria-describedby={
                !description.trim() ? "product-description-error" : undefined
              }
              maxLength={3000}
            />
          </ToolField>

          <ToolField
            htmlFor="description-keyword"
            label="Focus phrase"
            hint="One phrase"
            required
            error={
              !focusKeyword.trim()
                ? "Add the main phrase this page should answer."
                : undefined
            }
          >
            <Input
              id="description-keyword"
              value={focusKeyword}
              onChange={(event) => setFocusKeyword(event.target.value)}
              placeholder="product launch platform"
              aria-invalid={!focusKeyword.trim()}
              aria-describedby={
                !focusKeyword.trim() ? "description-keyword-error" : undefined
              }
              maxLength={100}
            />
          </ToolField>

          <div className="flex flex-wrap gap-2">
            <CopyTextButton
              text={description}
              label="Copy description"
              disabled={!description.trim()}
            />
            <DownloadTextButton
              content={report}
              filename="product-description-seo-report.txt"
              label="Download report"
              disabled={!description.trim()}
            />
          </div>

          <p className="text-pretty text-xs leading-5 text-slate-500">
            This is a transparent writing checklist, not a Google ranking score.
            Relevance, originality, links, technical SEO, and search intent also
            matter.
          </p>
        </div>
      </ToolPanel>

      <ToolPanel
        id="description-results"
        title="SEO writing checklist"
        description="Each check maps to a visible rule so you can decide which suggestions fit your product."
        action={
          description.trim() ? (
            <ToolStatusBadge tone={scoreState.tone}>
              {scoreState.label}
            </ToolStatusBadge>
          ) : null
        }
      >
        {!description.trim() ? (
          <ToolEmptyState
            title="Paste your product description"
            description="Your score, content metrics, and specific improvements will appear here."
          />
        ) : (
          <div aria-live="polite" className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ToolMetric
                label="Checklist score"
                value={`${analysis.score}/100`}
              />
              <ToolMetric label="Words" value={analysis.wordCount} />
              <ToolMetric label="Sentences" value={analysis.sentenceCount} />
              <ToolMetric
                label="Focus phrase"
                value={`${analysis.keywordCount}×`}
              />
            </div>

            <div className="space-y-3">
              {analysis.checks.map((check) => (
                <div
                  key={check.label}
                  className="flex gap-3 rounded-lg border border-slate-200 p-4"
                >
                  {check.passed ? (
                    <CheckCircle2
                      className="mt-0.5 size-5 shrink-0 text-emerald-600"
                      aria-hidden="true"
                    />
                  ) : (
                    <CircleAlert
                      className="mt-0.5 size-5 shrink-0 text-amber-600"
                      aria-hidden="true"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium text-slate-950">
                        {check.label}
                      </p>
                      <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                        {check.points}/{check.maximum}
                      </span>
                    </div>
                    <p className="mt-1 text-pretty text-sm leading-5 text-slate-600">
                      {check.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </ToolPanel>
    </ToolWorkspaceGrid>
  )
}
