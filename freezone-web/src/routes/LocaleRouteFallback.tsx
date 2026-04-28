/** Lightweight shell shown while storefront data loads. */
export function LocaleRouteFallback() {
  return (
    <div style={{ minHeight: "100dvh", background: "#fafafa", color: "#0f172a" }}>
      <div
        style={{
          height: 44,
          background: "linear-gradient(90deg, #0f172a 0%, #1e293b 100%)",
        }}
      />
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "16px clamp(12px, 4vw, 24px)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            height: 52,
            borderRadius: 10,
            background: "linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%)",
            backgroundSize: "200% 100%",
            animation: "fzShimmer 1.2s ease-in-out infinite",
          }}
        />
        <div
          style={{
            height: 220,
            borderRadius: 14,
            background: "linear-gradient(90deg, #fecaca33 0%, #fee2e2 50%, #fecaca33 100%)",
            backgroundSize: "200% 100%",
            animation: "fzShimmer 1.2s ease-in-out infinite",
          }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                height: 120,
                borderRadius: 12,
                background: "#e2e8f0",
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes fzShimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>
    </div>
  );
}
