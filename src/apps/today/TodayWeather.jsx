import { useWeatherForecast } from '@/hooks/useWeatherForecast'
import { WeatherIcon } from '@/components/calendar/WeatherIcon'

export function TodayWeather({ today }) {
  const forecast = useWeatherForecast()
  const day = forecast?.find(entry => entry.date === today)
  if (!day) return null
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <WeatherIcon code={day.code} className="h-5 w-5 text-foreground" />
      <span className="tabular-nums">
        <span className="font-medium text-foreground">{Math.round(day.max)}°</span> / {Math.round(day.min)}°
      </span>
    </div>
  )
}
