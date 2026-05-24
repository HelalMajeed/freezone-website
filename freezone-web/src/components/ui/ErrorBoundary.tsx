import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Optional custom fallback renderer. Receives the error + a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * App-level error boundary. Catches render/lifecycle errors (including a failed
 * lazy-chunk import) and shows a recoverable fallback instead of a white screen.
 * React error boundaries must be class components.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    /** Structured log; a real Sentry hook can be added here later (Sprint 5). */
    console.error("[error-boundary]", error.message, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return <DefaultErrorFallback error={error} reset={this.reset} />;
  }
}

function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  /** Locale is inferred from the URL so the fallback matches the active language
   *  even though the boundary sits above the i18n provider. */
  const isArabic = typeof window !== "undefined" && window.location.pathname.startsWith("/ar");
  const t = isArabic
    ? {
        title: "حدث خطأ غير متوقع",
        body: "نعتذر، صادفنا مشكلة أثناء عرض هذه الصفحة. حاول مرة أخرى.",
        retry: "إعادة المحاولة",
        home: "العودة للرئيسية",
      }
    : {
        title: "Something went wrong",
        body: "Sorry, we hit a problem rendering this page. Please try again.",
        retry: "Try again",
        home: "Back to home",
      };
  const dir = isArabic ? "rtl" : "ltr";
  return (
    <div
      dir={dir}
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 32,
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", margin: 0 }}>{t.title}</h1>
      <p style={{ maxWidth: 480, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{t.body}</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          type="button"
          onClick={reset}
          style={{ padding: "10px 20px", borderRadius: 8, background: "#0f172a", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}
        >
          {t.retry}
        </button>
        <a
          href={isArabic ? "/ar" : "/en"}
          style={{ padding: "10px 20px", borderRadius: 8, background: "#f1f5f9", color: "#0f172a", border: "1px solid #e2e8f0", textDecoration: "none", fontWeight: 600 }}
        >
          {t.home}
        </a>
      </div>
      {import.meta.env.DEV && (
        <pre style={{ marginTop: 16, maxWidth: "90vw", overflow: "auto", fontSize: 12, color: "#b91c1c", textAlign: "left" }}>
          {error.stack ?? error.message}
        </pre>
      )}
    </div>
  );
}
