import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  configureEmailSender,
  RateLimitedEmailSender,
  resetEmailSender,
  sendEmail,
  type EmailSender,
  type RateLimitConfig,
  type SendEmailOptions,
  type SendEmailResult,
} from "@/lib/email/resend"

describe("RateLimitedEmailSender", () => {
  const options: SendEmailOptions = {
    to: "user@example.com",
    subject: "Hello",
    text: "Body",
  }

  const rateLimit: RateLimitConfig = {
    maxRequests: 2,
    intervalMs: 1000,
  }

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("queues calls to respect the configured rate limit", async () => {
    const sendSpy = vi
      .fn<EmailSender["send"]>()
      .mockResolvedValue(null as SendEmailResult)
    const limiter = new RateLimitedEmailSender({ send: sendSpy }, rateLimit)

    const first = limiter.send(options)
    const second = limiter.send(options)
    const third = limiter.send(options)

    await Promise.all([first, second])
    expect(sendSpy).toHaveBeenCalledTimes(2)

    let thirdResolved = false
    void third.then(() => {
      thirdResolved = true
    })

    await vi.advanceTimersByTimeAsync(999)
    await Promise.resolve()

    expect(sendSpy).toHaveBeenCalledTimes(2)
    expect(thirdResolved).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    await third

    expect(sendSpy).toHaveBeenCalledTimes(3)
    expect(thirdResolved).toBe(true)
  })
})

describe("sendEmail", () => {
  afterEach(() => {
    resetEmailSender()
  })

  it("delegates to the configured sender", async () => {
    const fakeSender: EmailSender = {
      send: vi.fn().mockResolvedValue({ messageId: "123" } as never),
    }

    const email: SendEmailOptions = {
      to: "team@example.com",
      subject: "Test",
      text: "Testing",
    }

    configureEmailSender(fakeSender)
    await sendEmail(email)

    expect(fakeSender.send).toHaveBeenCalledWith(email)
  })
})
