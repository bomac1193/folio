'use client'

import CollectionCard from './CollectionCard'
import type { Collection } from '@prisma/client'

interface CollectionGridProps {
  collections: Collection[]
}

export default function CollectionGrid({ collections }: CollectionGridProps) {
  return (
    <div className="p-8">
      <div className="collection-grid border border-[var(--folio-border)]">
        {collections.map((collection) => (
          <CollectionCard key={collection.id} collection={collection} />
        ))}
      </div>
    </div>
  )
}
