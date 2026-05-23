import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { admin as adminApi } from "../api/client";
import { ApiError } from "../api/client";
import type { UserStats } from "../api/types";
import AppShell from "../components/AppShell";

function fmt(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

function StatBadge({ value, color }: { value: number; color: string }) {
  return (
    <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-md text-xs font-semibold ${color}`}>
      {value}
    </span>
  );
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .users()
      .then(setStats)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 403) navigate("/");
        else setError(e instanceof ApiError ? e.message : "Failed to load");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <AppShell back="/">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-sm text-slate-400 mt-0.5">{stats.length} registered</p>
      </div>

      {loading && (
        <div className="card p-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      )}

      {error && <div className="card p-6 text-center text-red-500">{error}</div>}

      {!loading && !error && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">User</th>
                  <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide text-center">New</th>
                  <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide text-center">Learning</th>
                  <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide text-center">Mastered</th>
                  <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide text-center">Reviews</th>
                  <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide text-right">Time</th>
                  <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide text-right">Last active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats.map((u) => (
                  <tr key={u.user_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800">{u.email}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{u.total_cards} cards total</p>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <StatBadge value={u.new_cards} color="bg-blue-50 text-blue-600" />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <StatBadge value={u.learning_cards} color="bg-orange-50 text-orange-600" />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <StatBadge value={u.mastered_cards} color="bg-emerald-50 text-emerald-600" />
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-600">{u.total_reviews}</td>
                    <td className="px-5 py-3.5 text-right text-slate-600">{fmt(u.total_time_seconds)}</td>
                    <td className="px-5 py-3.5 text-right text-slate-400 text-xs">
                      {u.last_active ? new Date(u.last_active).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
                {stats.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-400">No users yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
