import { useTheme } from '@/hooks/useTheme'

export function AppShell({ children }) {
  useTheme()
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {children}
    </div>
  )
}
