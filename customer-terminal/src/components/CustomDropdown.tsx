'use client'

import { useState, useRef, useEffect } from 'react'

interface Option {
  value: string
  label: string
}

interface CustomDropdownProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
  required?: boolean
  name: string
}

export default function CustomDropdown({
  options,
  value,
  onChange,
  placeholder,
  label,
  required = false,
  name
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(option => option.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-blue-200 font-mono text-sm mb-2">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-700 border border-blue-500/30 rounded px-4 py-2 text-blue-100 font-mono focus:outline-none focus:border-blue-400 flex justify-between items-center hover:border-blue-400/50 transition-colors"
      >
        <span className={selectedOption ? 'text-blue-100' : 'text-blue-400/60'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-gray-800 border border-blue-500/30 rounded-lg shadow-2xl max-h-60 overflow-y-auto">
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full text-left px-4 py-3 font-mono text-sm hover:bg-blue-600/20 focus:bg-blue-600/20 focus:outline-none transition-colors ${
                  option.value === value ? 'bg-blue-600/30 text-blue-300' : 'text-blue-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Hidden input for form submission */}
      <input
        type="hidden"
        name={name}
        value={value}
        required={required}
      />
    </div>
  )
} 