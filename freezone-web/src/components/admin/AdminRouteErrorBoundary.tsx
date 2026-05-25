"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class AdminRouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[admin-route]", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div dir="rtl" style={{ padding: 24, textAlign: "center" }}>
          <h2>حدث خطأ غير متوقع</h2>
          <p>تم تسجيل المشكلة. جرّب إعادة تحميل الصفحة.</p>
          <button type="button" onClick={() => this.setState({ error: null })}>
            إعادة المحاولة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
