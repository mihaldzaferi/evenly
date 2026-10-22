const SUGGESTED = ['✈️', '🏖️', '🏔️', '🏠', '🍕', '🎉', '🚗', '⛺', '🎿', '💼', '🎓', '💸']

/** The last character someone typed, kept whole even for flags and skin tones. */
function lastGrapheme(text: string): string {
  const parts = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text.trim())]
  return parts.at(-1)?.segment ?? ''
}

export function EmojiField({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {SUGGESTED.map((e) => (
        <button
          key={e}
          type="button"
          aria-label={`Use ${e}`}
          aria-pressed={value === e}
          onClick={() => onChange(e)}
          className={`grid size-10 place-items-center rounded-xl border text-xl transition-colors ${
            value === e ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:bg-surface-2'
          }`}
        >
          {e}
        </button>
      ))}
      <input
        aria-label="Or type any emoji"
        value={SUGGESTED.includes(value) ? '' : value}
        onChange={(e) => onChange(lastGrapheme(e.target.value) || '💸')}
        placeholder="Other"
        className="field w-20 text-center"
      />
    </div>
  )
}
