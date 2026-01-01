// import { addMinutes } from "date-fns"
//
// import prisma from "@/lib/prisma"
// import { APP_EVENTS } from "@/lib/server/events/constants"
// import { registerEventHandler } from "@/lib/server/events"
// import type { EventQueueName } from "@/lib/server/events/queues"
//
// const HANDLER_ID = "claims.cleanup-attempts"
// const QUEUE: EventQueueName = "low"
// const RUN_INTERVAL_MINUTES = 30
//
// async function scheduleNextRun(notBefore: Date) {
//   const existing = await prisma.eventEnvelope.findFirst({
//     where: {
//       event: APP_EVENTS.CLAIM_ATTEMPTS_CLEANUP,
//       queue: QUEUE,
//       // If any envelope is still pending/processing/retrying (even overdue), don't enqueue another.
//       status: { in: ["pending", "processing", "retrying"] },
//     },
//   })
//   if (existing) return
//
//   await prisma.eventEnvelope.create({
//     data: {
//       event: APP_EVENTS.CLAIM_ATTEMPTS_CLEANUP,
//       payload: {},
//       asyncHandlers: [HANDLER_ID],
//       pendingHandlers: [HANDLER_ID],
//       queue: QUEUE,
//       nextRunAt: notBefore,
//     },
//   })
// }
//
// registerEventHandler({
//   event: APP_EVENTS.CLAIM_ATTEMPTS_CLEANUP,
//   id: HANDLER_ID,
//   mode: "async",
//   queue: QUEUE,
//   handler: async () => {
//     const now = new Date()
//     const cutoff = now
//
//     const result = await prisma.productClaimAttempt.deleteMany({
//       where: {
//         OR: [
//           { status: { in: ["expired", "fulfilled"] } },
//           { otpExpiresAt: { lt: cutoff } },
//         ],
//       },
//     })
//
//     console.info("[claims.cleanup] deleted claim attempts", {
//       count: result.count,
//     })
//
//     await scheduleNextRun(addMinutes(now, RUN_INTERVAL_MINUTES))
//   },
// })
//
// // Kick off the first scheduled run if none exists.
// void scheduleNextRun(new Date()).catch((error) => {
//   console.error("[claims.cleanup] failed to schedule initial run", { error })
// })
