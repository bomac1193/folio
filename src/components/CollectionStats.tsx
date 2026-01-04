interface StatsProps {
  stats: {
    totalItems: number
    avgPerformance: number
    platforms: number
  }
}

export default function CollectionStats({ stats }: StatsProps) {
  return (
    <div className="flex gap-8">
      <div className="text-right">
        <div className="text-xs uppercase tracking-widest text-[var(--folio-text-muted)] mb-1">
          Items
        </div>
        <div className="font-data text-lg">{stats.totalItems}</div>
      </div>
      <div className="text-right">
        <div className="text-xs uppercase tracking-widest text-[var(--folio-text-muted)] mb-1">
          Avg Performance
        </div>
        <div className="font-data text-lg">{stats.avgPerformance.toFixed(0)}</div>
      </div>
      <div className="text-right">
        <div className="text-xs uppercase tracking-widest text-[var(--folio-text-muted)] mb-1">
          Platforms
        </div>
        <div className="font-data text-lg">{stats.platforms}</div>
      </div>
    </div>
  )
}
