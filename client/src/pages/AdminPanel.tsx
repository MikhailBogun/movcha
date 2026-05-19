import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { admin as adminApi } from "../api/client";
import { ApiError } from "../api/client";
import type { UserStats } from "../api/types";

function fmt(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="text-gray-400 hover:text-gray-600 text-lg">
          ←
        </button>
        <h1 className="font-bold text-gray-900">Admin — Users</h1>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading && <p className="text-center text-gray-400 py-16">Loading…</p>}
        {error && <p className="text-center text-red-500 py-16">{error}</p>}

        {!loading && !error && (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Cards</th>
                  <th className="px-4 py-3 font-medium">New</th>
                  <th className="px-4 py-3 font-medium">Learning</th>
                  <th className="px-4 py-3 font-medium">Mastered</th>
                  <th className="px-4 py-3 font-medium">Reviews</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Last active</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((u) => (
                  <tr key={u.user_id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.email}</td>
                    <td className="px-4 py-3 text-gray-600">{u.total_cards}</td>
                    <td className="px-4 py-3 text-blue-600">{u.new_cards}</td>
                    <td className="px-4 py-3 text-orange-600">{u.learning_cards}</td>
                    <td className="px-4 py-3 text-green-600">{u.mastered_cards}</td>
                    <td className="px-4 py-3 text-gray-600">{u.total_reviews}</td>
                    <td className="px-4 py-3 text-gray-600">{fmt(u.total_time_seconds)}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {u.last_active
                        ? new Date(u.last_active).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
                {stats.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      No users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
