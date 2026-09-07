import { useRef, useState } from 'react'
import type { Option } from '../types/game'

type AnswerGridProps = {
  options: Option[]
  countryOptions?: Option[]
  onAnswer: (optionId: string) => void
  disabled: boolean
}

export function AnswerGrid({ options, countryOptions, onAnswer, disabled }: AnswerGridProps) {
  const [inputValue, setInputValue] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const allCountries = countryOptions ?? options

  const visibleOptions = inputValue.trim()
    ? allCountries.filter((option) => option.label.toLowerCase().includes(inputValue.trim().toLowerCase()))
    : allCountries

  function handleSubmit() {
    const trimmedValue = inputValue.trim()
    const selected = allCountries.find(
      (option) => option.label.toLowerCase() === trimmedValue.toLowerCase(),
    )

    if (!selected) {
      setErrorMessage('Select a country from the list.')
      return
    }

    setErrorMessage('')
    onAnswer(selected.id)
  }

  function handleSelect(option: Option) {
    setInputValue(option.label)
    setErrorMessage('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div className="answer-input-shell">
      <label className="answer-input-label" htmlFor="country-answer">
        Type a country
      </label>
      <div className="answer-input-row">
        <div className="answer-input-wrap">
          <input
            ref={inputRef}
            id="country-answer"
            className="answer-input"
            type="text"
            placeholder="Start typing a country..."
            value={inputValue}
            onFocus={() => setIsOpen(true)}
            onChange={(event) => {
              setInputValue(event.target.value)
              if (errorMessage) {
                setErrorMessage('')
              }
            }}
            onBlur={() => {
              window.setTimeout(() => setIsOpen(false), 120)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleSubmit()
              }
            }}
            disabled={disabled}
            aria-label="Country answer input"
          />

          {isOpen ? (
            <div className="answer-dropdown" role="listbox" aria-label="Available countries">
              {visibleOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="answer-dropdown__item"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    handleSelect(option)
                  }}
                >
                  {option.flag ? <span className="answer-dropdown__flag">{option.flag}</span> : null}
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button type="button" className="primary-button answer-submit" onClick={handleSubmit} disabled={disabled}>
          Submit
        </button>
      </div>

      {errorMessage ? <p className="answer-input-error">{errorMessage}</p> : null}
    </div>
  )
}
