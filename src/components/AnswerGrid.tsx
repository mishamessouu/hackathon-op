import { useId, useRef, useState } from 'react'
import type { Option } from '../types/game'

type AnswerGridProps = {
  options: Option[]
  onAnswer: (countryName: string) => void
  disabled: boolean
}

const MAX_SUGGESTIONS = 8

export function AnswerGrid({ options, onAnswer, disabled }: AnswerGridProps) {
  const [inputValue, setInputValue] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listboxId = useId()

  const query = inputValue.trim().toLowerCase()
  const visibleOptions = (
    query ? options.filter((option) => option.label.toLowerCase().includes(query)) : options
  ).slice(0, MAX_SUGGESTIONS)

  const isListOpen = isOpen && visibleOptions.length > 0
  const activeOption = activeIndex >= 0 ? visibleOptions[activeIndex] : undefined

  function submit(value: string) {
    const selected = options.find(
      (option) => option.label.toLowerCase() === value.trim().toLowerCase(),
    )

    if (!selected) {
      setErrorMessage('Select a country from the list.')
      return
    }

    guess(selected.label)
  }

  // Picking from the list is the guess; it should not need a second confirm.
  function handleSelect(option: Option) {
    guess(option.label)
  }

  function guess(countryName: string) {
    setInputValue('')
    setErrorMessage('')
    setIsOpen(false)
    setActiveIndex(-1)
    inputRef.current?.focus()
    onAnswer(countryName)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isListOpen) {
        setIsOpen(true)
        setActiveIndex(0)
        return
      }
      const step = event.key === 'ArrowDown' ? 1 : -1
      const next = (activeIndex + step + visibleOptions.length) % visibleOptions.length
      setActiveIndex(activeIndex === -1 && step === -1 ? visibleOptions.length - 1 : next)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (activeOption) {
        handleSelect(activeOption)
      } else {
        submit(inputValue)
      }
      return
    }

    if (event.key === 'Escape' && isListOpen) {
      event.preventDefault()
      setIsOpen(false)
      setActiveIndex(-1)
    }
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
            role="combobox"
            aria-expanded={isListOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeOption ? `${listboxId}-${activeIndex}` : undefined}
            aria-describedby={errorMessage ? 'country-answer-error' : undefined}
            aria-invalid={errorMessage ? true : undefined}
            autoComplete="off"
            onFocus={() => setIsOpen(true)}
            onChange={(event) => {
              setInputValue(event.target.value)
              setIsOpen(true)
              setActiveIndex(-1)
              if (errorMessage) {
                setErrorMessage('')
              }
            }}
            onBlur={(event) => {
              // Closing only when focus actually leaves the widget avoids the
              // race a timeout-based close introduces.
              if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) {
                setIsOpen(false)
                setActiveIndex(-1)
              }
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />

          {isListOpen ? (
            <div className="answer-dropdown" role="listbox" id={listboxId} aria-label="Countries">
              {visibleOptions.map((option, index) => (
                <button
                  key={option.id}
                  id={`${listboxId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  data-active={index === activeIndex}
                  className="answer-dropdown__item"
                  tabIndex={-1}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    handleSelect(option)
                  }}
                >
                  {option.flag ? (
                    <span className="answer-dropdown__flag" aria-hidden="true">
                      {option.flag}
                    </span>
                  ) : null}
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="primary-button answer-submit"
          onClick={() => submit(inputValue)}
          disabled={disabled}
        >
          Submit
        </button>
      </div>

      {errorMessage ? (
        <p className="answer-input-error" id="country-answer-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
