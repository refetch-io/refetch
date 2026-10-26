/** Translate Appwrite auth errors (server or web SDK) into copy we can show to people. */
export function describeAuthError(error: unknown): string {
  const type = error && typeof error === 'object' && 'type' in error ? String(error.type) : ''
  const message = error instanceof Error ? error.message : ''
  switch (type) {
    case 'user_invalid_credentials':
      return 'Incorrect email or password.'
    case 'user_already_exists':
    case 'user_email_already_exists':
      return 'An account with this email already exists. Try signing in instead.'
    case 'user_blocked':
      return 'This account has been blocked.'
    case 'general_rate_limit_exceeded':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'project_provider_disabled':
      return 'Sign in with Appwrite is not enabled for this project yet.'
    case 'user_invalid_token':
      return 'This sign-in link has expired. Please try again.'
    case 'user_password_mismatch':
    case 'password_recently_used':
    case 'password_personal_data':
      return message || 'Please choose a different password.'
    default:
      return message || 'Something went wrong. Please try again.'
  }
}
