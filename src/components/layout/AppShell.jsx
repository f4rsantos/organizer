import { useTheme } from '@/hooks/useTheme'

export function AppShell({ children }) {
  useTheme()
  return (
    <div className="h-full w-full overflow-hidden bg-background text-foreground">
      {children}
    </div>
  )
}
