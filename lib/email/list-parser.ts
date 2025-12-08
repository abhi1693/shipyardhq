const EMAIL_VALIDATE_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

function isValidEmail(email: string): boolean {
  return EMAIL_VALIDATE_REGEX.test(email)
}

export function validateSingleEmail(email: string): boolean {
  return isValidEmail(email.trim())
}
