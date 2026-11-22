'use client'

interface TagInputProps {
  label: string
  hint?: string
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export default function TagInput({
  label,
  hint,
  tags,
  onChange,
  placeholder,
}: TagInputProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(e.currentTarget.value)
      e.currentTarget.value = ''
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (e.currentTarget.value.trim()) {
      addTag(e.currentTarget.value)
      e.currentTarget.value = ''
    }
  }

  function addTag(raw: string) {
    const trimmed = raw.replace(/,/g, '').trim()
    if (!trimmed) return
    if (tags.includes(trimmed)) return
    onChange([...tags, trimmed])
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      <input
        type="text"
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm text-green-800"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 text-green-600 hover:text-green-900 focus:outline-none"
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
