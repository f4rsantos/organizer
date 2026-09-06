import { Sun, CloudSun, Cloud, CloudFog, CloudRain, CloudSnow, CloudLightning } from 'lucide-react'
import { weatherCategory } from '@/lib/weather'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'

const ICONS = {
  clear: Sun,
  'partly-cloudy': CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
}

export function WeatherIcon({ code, className = 'h-3 w-3' }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const category = weatherCategory(code)
  const Icon = ICONS[category] ?? Cloud
  return (
    <span title={t.weatherCategory[category]} className="inline-flex">
      <Icon className={className} />
    </span>
  )
}
