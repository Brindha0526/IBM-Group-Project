'use client'

// app/(app)/grocery/page.tsx
// Reads ingredients saved from the meal plan page (via localStorage).
// Full ST-8 (DB-backed grocery list) is pending — this is the localStorage version.

import { useState, useEffect } from 'react'

interface GroceryItem {
  name: string
  servingG: number
  mealName: string
  dayLabel: string
}

const STORAGE_KEY = 'nutripath_grocery_items'

export default function GroceryPage() {
  const [items, setItems] = useState<GroceryItem[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch {
      // corrupted storage — ignore
    }
    setLoaded(true)
  }, [])

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function clearAll() {
    localStorage.removeItem(STORAGE_KEY)
    setItems([])
    setChecked(new Set())
  }

  // Group by dayLabel
  const grouped = items.reduce<Record<string, GroceryItem[]>>((acc, item) => {
    const key = item.dayLabel
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  if (!loaded) return null

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grocery List</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ingredients saved from your meal plan. Tick items off as you shop.
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="shrink-0 text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-3 py-1.5"
          >
            Clear list
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl px-6 py-12 text-center space-y-2">
          <p className="text-gray-700 font-medium">Your grocery list is empty</p>
          <p className="text-sm text-gray-500">
            Go to <a href="/plan" className="text-blue-600 underline">Meal Plan</a>, generate a plan, then click <strong>Save to Grocery List</strong> on any meal.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([day, dayItems]) => (
            <section key={day} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">{day}</h2>
              </div>
              <ul className="divide-y divide-gray-100">
                {dayItems.map((item) => {
                  const key = `${item.dayLabel}__${item.name}`
                  const done = checked.has(key)
                  return (
                    <li key={key} className="flex items-center gap-3 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => toggle(key)}
                        className="h-4 w-4 rounded border-gray-300 text-green-600"
                      />
                      <div className={`flex-1 min-w-0 ${done ? 'opacity-40 line-through' : ''}`}>
                        <p className="text-sm font-medium text-gray-900 capitalize">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.servingG} g · {item.mealName}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}

          <p className="text-xs text-gray-400 pt-2">
            {checked.size} of {items.length} item{items.length !== 1 ? 's' : ''} checked off.
          </p>
        </div>
      )}
    </div>
  )
}
