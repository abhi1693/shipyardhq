import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Badge } from "@/components/atoms/badge"
import { OnboardingAnswersAnalytics } from "@/components/pages/OnboardingAnswersAnalytics"
import {
  getHeardFromLabel,
  getOnboardingAnswersSummary,
  getPendingOnboardingUsers,
  getRecentOnboardingCompletions,
  getRoleIntentLabel,
} from "@/lib/server/analytics/onboardingSummary"
import { formatDistanceToNow } from "date-fns"

function formatName(user: {
  firstName: string | null
  lastName: string | null
  email: string | null
}) {
  const parts = [user.firstName, user.lastName].filter(Boolean)
  if (parts.length) return parts.join(" ")
  return user.email ?? "Unknown member"
}

function formatRelative(date?: Date | null) {
  if (!date) return "Unknown"
  return formatDistanceToNow(date, { addSuffix: true })
}

export const revalidate = 3600

export default async function OnboardingAnalyticsPage() {
  const [summary, pending, recent] = await Promise.all([
    getOnboardingAnswersSummary(),
    getPendingOnboardingUsers(8),
    getRecentOnboardingCompletions(8),
  ])

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Onboarding analytics
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Track completion trends, understand member intent, and spot pending
          onboarding journeys that may need a nudge.
        </p>
      </div>

      <OnboardingAnswersAnalytics summary={summary} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending onboarding</CardTitle>
            <CardDescription>
              Active accounts without a completed questionnaire.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Everyone has completed onboarding. 🎉
              </p>
            ) : (
              <ul className="space-y-4">
                {pending.map((user) => (
                  <li key={user.id} className="space-y-1 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-foreground">
                        {formatName(user)}
                      </span>
                      <Badge variant="outline" className="shrink-0">
                        Joined {formatRelative(user.createdAt)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent completions</CardTitle>
            <CardDescription>
              Latest members to finish the onboarding flow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No completions yet — check back soon.
              </p>
            ) : (
              <ul className="space-y-4">
                {recent.map((user) => (
                  <li key={user.id} className="space-y-1 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-foreground">
                        {formatName(user)}
                      </span>
                      <Badge variant="outline" className="shrink-0">
                        {formatRelative(user.updatedAt)}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{user.email}</span>
                      {user.roleIntent && (
                        <Badge variant="outline" className="bg-transparent">
                          {getRoleIntentLabel(user.roleIntent)}
                        </Badge>
                      )}
                      {user.heardFrom && (
                        <Badge variant="outline" className="bg-transparent">
                          {getHeardFromLabel(user.heardFrom)}
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
