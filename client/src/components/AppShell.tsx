import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface AppShellProps {
  children: ReactNode;
  /** Show a back arrow linking to this path */
  back?: string;
  /** Right-side header content */
  actions?: ReactNode;
  /** Whether to show the top logo nav bar (default true) */
  showNav?: boolean;
}

export default function AppShell({ children, back, actions, showNav = true }: AppShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {showNav && (
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
            {back ? (
              <button
                onClick={() => navigate(back)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 -ml-1 rounded-lg hover:bg-slate-100"
                aria-label="Go back"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : (
              <Link to="/" className="font-bold text-primary-600 text-lg tracking-tight">
                Movcha
              </Link>
            )}

            <div className="flex-1" />

            {actions ?? (
              <div className="flex items-center gap-3">
                {user?.is_admin && (
                  <Link to="/admin" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                    Admin
                  </Link>
                )}
                <span className="text-sm text-slate-400 hidden sm:block truncate max-w-[160px]">
                  {user?.email}
                </span>
                <button
                  onClick={logout}
                  className="text-sm text-slate-500 hover:text-red-500 transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>
      )}

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
