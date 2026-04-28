/** Instant UI while secure admin routes load (first compile or slow API). */
export default function AdminSecureLoading() {
  return (
    <div
      style={{
        minHeight: "60vh",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 960,
        margin: "0 auto",
      }}
      aria-busy
      aria-label="Loading"
    >
      <div
        style={{
          height: 28,
          width: "45%",
          borderRadius: 8,
          background: "linear-gradient(90deg, rgba(148,163,184,0.15) 0%, rgba(148,163,184,0.28) 50%, rgba(148,163,184,0.15) 100%)",
          backgroundSize: "200% 100%",
          animation: "adminLoadShimmer 1s ease-in-out infinite",
        }}
      />
      <div
        style={{
          height: 120,
          borderRadius: 12,
          background: "rgba(30, 41, 59, 0.35)",
        }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: 72, borderRadius: 10, background: "rgba(51, 65, 85, 0.4)" }} />
        ))}
      </div>
      <style>{`
        @keyframes adminLoadShimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>
    </div>
  );
}
