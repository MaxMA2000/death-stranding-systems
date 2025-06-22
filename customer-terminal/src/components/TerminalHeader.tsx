'use client'

import { useTranslations } from 'next-intl'
import { useLanguage } from './LanguageProvider'

export default function TerminalHeader() {
  const t = useTranslations('header')
  const { locale, setLocale } = useLanguage()

  const toggleLanguage = () => {
    setLocale(locale === 'en' ? 'zh' : 'en')
  }

  return (
    <header className="bg-gray-800 border-b border-blue-500/30 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <div>
              <h1 className="text-2xl font-mono text-blue-300 tracking-wider">
                {t('title')}
              </h1>
              <p className="text-blue-400/80 font-mono text-sm">
                {t('subtitle')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleLanguage}
              className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded text-blue-300 font-mono text-sm transition-colors"
            >
              {t('switchLanguage')}
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-mono text-sm">{t('status')}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
} 