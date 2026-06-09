'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { type Locale, type Translations, translations } from '@/app/lib/i18n'

interface LocaleContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: Translations
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: translations.en,
})

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    const saved = localStorage.getItem('orchestra-locale') as Locale | null
    if (saved === 'en' || saved === 'id') setLocaleState(saved)
  }, [])

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    localStorage.setItem('orchestra-locale', l)
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LocaleContext.Provider>
  )
}

export const useLocale = () => useContext(LocaleContext)
