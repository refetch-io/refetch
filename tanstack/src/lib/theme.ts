export type ThemePreference = 'light' | 'dark' | 'system'

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}
