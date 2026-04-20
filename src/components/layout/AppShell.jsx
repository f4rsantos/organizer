import { useTheme } from '@/hooks/useTheme'

export function AppShell({ children }) {
  useTheme()
  return (
    <div className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  )
}
