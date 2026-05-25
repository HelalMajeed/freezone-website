export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse" role="status" aria-label="جاري التحميل">
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8, marginBottom: 8 }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} style={{ height: 14, background: "#334155", borderRadius: 4 }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 8,
            marginBottom: 6,
          }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} style={{ height: 32, background: "#1e293b", borderRadius: 6 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
