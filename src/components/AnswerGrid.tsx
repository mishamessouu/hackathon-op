import { useId, useState } from 'react'
import { Combobox } from '@base-ui/react/combobox'
import { ALIAS_LOOKUP } from '../countryAliases'
import type { Option } from '../types/game'

type AnswerGridProps = {
  options: Option[]
  onAnswer: (option: Option) => void
  onSkip: () => void
  disabled: boolean
}

const MAX_SUGGESTIONS = 8

export function AnswerGrid({ options, onAnswer, onSkip, disabled }: AnswerGridProps) {
  const [inputValue, setInputValue] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const inputId = useId()

  // Filtering is ours so the list stays capped and never renders 250 nodes.
  const query = inputValue.trim().toLowerCase()
  const matches = query
    ? options
        .filter((option) => {
          const label = option.label.toLowerCase()
          if (label.includes(query)) {
            return true
          }
          // "usa", "england" and "czechia" match nothing official.
          return Object.entries(ALIAS_LOOKUP).some(
            ([alias, target]) => target === option.label && alias.includes(query),
          )
        })
        .slice(0, MAX_SUGGESTIONS)
    : []

  function guess(option: Option) {
    setInputValue('')
    setErrorMessage('')
    onAnswer(option)
  }

  function submitTyped() {
    const exact = options.find(
      (option) => option.label.toLowerCase() === inputValue.trim().toLowerCase(),
    )
    if (!exact) {
      setErrorMessage('Pick a country from the list.')
      return
    }
    guess(exact)
  }

  return (
    <div className="answer-input-shell">
      <Combobox.Root
        items={matches}
        filter={null}
        value={null}
        inputValue={inputValue}
        onInputValueChange={(value: string) => {
          setInputValue(value)
          if (errorMessage) {
            setErrorMessage('')
          }
        }}
        onValueChange={(option: Option | null) => {
          if (option) {
            guess(option)
          }
        }}
        itemToStringLabel={(option: Option) => option.label}
        autoHighlight
        disabled={disabled}
      >
        <div className="answer-input-header">
          <label className="answer-input-label" htmlFor={inputId}>
            Type a country
          </label>
          {/* For when you have no clue. Costs the same rung as a wrong guess, so
              it is never the better option - only the honest one. */}
          <button
            type="button"
            className="secondary-button answer-skip"
            onClick={onSkip}
            disabled={disabled}
          >
            Skip clue
          </button>
        </div>

        <div className="answer-input-row">
          <Combobox.Input
            id={inputId}
            className="answer-input"
            placeholder="Start typing a country..."
            aria-describedby={errorMessage ? `${inputId}-error` : undefined}
            aria-invalid={errorMessage ? true : undefined}
          />
          <button
            type="button"
            className="primary-button answer-submit"
            onClick={submitTyped}
            disabled={disabled}
          >
            Submit
          </button>
        </div>

        <Combobox.Portal>
          <Combobox.Positioner className="country-positioner" sideOffset={8}>
            <Combobox.Popup className="country-popup">
              <Combobox.Empty className="country-empty">
                {query ? `No country matches "${inputValue.trim()}".` : 'Start typing to search.'}
              </Combobox.Empty>
              <Combobox.List>
                {(option: Option) => (
                  <Combobox.Item key={option.id} value={option} className="country-item">
                    {option.label}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>

      {errorMessage ? (
        <p className="answer-input-error" id={`${inputId}-error`} role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
