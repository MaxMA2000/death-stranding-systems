'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { NextIntlClientProvider } from 'next-intl'

type Locale = 'en' | 'zh'

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  messages: any
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

interface LanguageProviderProps {
  children: React.ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [locale, setLocale] = useState<Locale>('en')
  const [messages, setMessages] = useState<any>(null)

  // Load messages when locale changes
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const messagesModule = await import(`../messages/${locale}.json`)
        setMessages(messagesModule.default)
      } catch (error) {
        console.error('Failed to load messages:', error)
        // Fallback to English
        const fallbackMessages = await import('../messages/en.json')
        setMessages(fallbackMessages.default)
      }
    }

    loadMessages()
  }, [locale])

  // Load initial locale from localStorage
  useEffect(() => {
    const savedLocale = localStorage.getItem('locale') as Locale
    if (savedLocale && (savedLocale === 'en' || savedLocale === 'zh')) {
      setLocale(savedLocale)
    }
  }, [])

  // Save locale to localStorage when it changes
  const handleSetLocale = (newLocale: Locale) => {
    setLocale(newLocale)
    localStorage.setItem('locale', newLocale)
  }

  if (!messages) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-blue-400 font-mono">Loading...</div>
      </div>
    )
  }

  return (
    <LanguageContext.Provider 
      value={{ 
        locale, 
        setLocale: handleSetLocale, 
        messages 
      }}
    >
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LanguageContext.Provider>
  )
} 