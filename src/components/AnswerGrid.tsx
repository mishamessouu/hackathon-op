import { useId, useState } from 'react'
import { Combobox } from '@base-ui/react/combobox'
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
  const inputId = useId()

  // Filtering is ours so the list stays capped and never renders 250 nodes.
  const query = inputValue.trim().toLowerCase()
  const matches = query
    ? options.filter((option) => option.label.toLowerCase().includes(query)).slice(0, MAX_SUGGESTIONS)
    : []

  function guess(countryName: string) {
    setInputValue('')
    setErrorMessage('')
    onAnswer(countryName)
  }

  function submitTyped() {
    const exact = options.find(
      (option) => option.label.toLowerCase() === inputValue.trim().toLowerCase(),
    )
    if (!exact) {
      setErrorMessage('Pick a country from the list.')
      return
    }
    guess(exact.label)
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
            guess(option.label)
          }
        }}
        itemToStringLabel={(option: Option) => option.label}
        autoHighlight
        disabled={disabled}
      >
        <label className="answer-input-label" htmlFor={inputId}>
          Type a country
        </label>

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
                    {option.flag ? (
                      <span className="country-item__flag" aria-hidden="true">
                        {option.flag}
                      </span>
                    ) : null}
                    <span>{option.label}</span>
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
