import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Global React Error Boundary — a runtime error in any component shows a
 * friendly recovery screen instead of a blank white page.
 */
export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  declare props: { children: React.ReactNode };
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface for ops/log collection; never crashes the app.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FCFCFC] px-6">
          <div className="max-w-md w-full text-center bg-white border border-slate-100 rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.06)] p-10">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center">
              <span className="text-3xl" aria-hidden="true">⚠️</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mb-2">
              Kutilmagan xatolik yuz berdi
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              Sahifani yangilab qayta urinib ko'ring. Muammo davom etsa, biz bilan bog'laning.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors cursor-pointer"
            >
              Sahifani yangilash
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
