import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'

const LANG_MAP = { en: 'en-US', pt: 'pt-PT', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', af: 'af-ZA', pirate: 'en-US' }

function getSpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function useSpeechInput({ lang, onResult } = {}) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef(null)
  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  const enabled = useStore(s => s.settings?.speechInputEnabled === true)
  const isSupported = enabled && typeof window !== 'undefined' && Boolean(getSpeechRecognitionCtor())

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const start = useCallback(() => {
    if (!enabled) return
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return

    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    const recognition = new Ctor()
    recognition.lang = LANG_MAP[lang] ?? undefined
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onstart = () => setIsListening(true)
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    // The API resends the full results list (interim + final) on every event
    // rather than a delta, so we must rebuild the whole transcript each time.
    recognition.onresult = event => {
      let text = ''
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript
      }
      setTranscript(text)
      onResultRef.current?.(text)
    }

    recognitionRef.current = recognition
    setTranscript('')
    recognition.start()
  }, [lang, enabled])

  useEffect(() => () => { recognitionRef.current?.stop() }, [])

  return { isSupported, isListening, transcript, start, stop, startListening: start, stopListening: stop }
}
