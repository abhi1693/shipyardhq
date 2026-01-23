export {}

// Create a type for the roles
export type Role = "admin" | "member" | (string & {})

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Role
      onboardingComplete?: boolean
    }
  }
}
