'use client'

import { useState } from 'react'
import { ExpandableCategoryCard } from './ExpandableCategoryCard'

type Category = {
  id: string
  name: string
  max_nominees: number
  is_active: boolean
}

export function AdminCategoriesAccordion({
  categories,
  ceremonyYear,
  counts,
}: {
  categories: Category[]
  ceremonyYear: number
  counts: Record<string, number>
}) {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null)

  function handleToggle(id: string, nextExpanded: boolean) {
    setExpandedCategoryId(nextExpanded ? id : null)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <ExpandableCategoryCard
          key={category.id}
          category={category}
          ceremonyYear={ceremonyYear}
          nomineesCount={counts[category.id] ?? 0}
          expanded={expandedCategoryId === category.id}
          onToggle={handleToggle}
        />
      ))}
    </div>
  )
}
