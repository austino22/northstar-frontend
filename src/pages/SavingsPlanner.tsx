// frontend/src/pages/SavingsPlanner.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

interface Goal {
  id: number;
  name: string;
  target_amount: number;
  target_date: string;     // "YYYY-MM-DD"
  current_amount: number;
}

interface GoalCreate {
  name: string;
  target_amount: number;
  target_date: string;
  current_amount: number;
}

interface GoalUpdate {
  name?: string;
  target_amount?: number;
  target_date?: string;
  current_amount?: number;
}

type Period = 'monthly' | 'biweekly' | 'weekly';

// ---------- helpers ----------
function monthsUntil(isoDate: string) {
  if (!isoDate) return 0;
  const now = new Date();
  const target = new Date(isoDate);
  return Math.max(
    0,
    (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
  );
}

function addMonths(date: Date, m: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + m);
  return d;
}
function yyyymm(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mm}`;
}
function monthsBetweenInclusive(start: Date, end: Date) {
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (months < 0) months = 0;
  return months + 1; // include end month
}
function generateMonthlyLabels(from: Date, to: Date): string[] {
  const n = monthsBetweenInclusive(from, to);
  return Array.from({ length: n }, (_, i) => yyyymm(addMonths(from, i)));
}

function calcRequiredMonthly(g: Goal) {
  const m = monthsUntil(g.target_date);
  const remaining = Math.max(0, g.target_amount - g.current_amount);
  return m > 0 ? remaining / m : remaining;
}

function toMonthly(amount: number, period: Period) {
  if (period === 'monthly') return amount;
  if (period === 'biweekly') return (amount * 26) / 12;
  return (amount * 52) / 12; // weekly
}

function seriesActual(g: Goal, labels: string[]) {
  // Simple linear line from current to target by deadline
  const n = labels.length;
  if (n <= 1) return [g.target_amount];
  const startVal = g.current_amount;
  const endVal = g.target_amount;
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return startVal + (endVal - startVal) * t;
  });
}

function seriesSimulated(g: Goal, labels: string[], monthlyContribution: number) {
  const data: number[] = [];
  let v = g.current_amount;
  labels.forEach((_lbl, i) => {
    if (i === 0) {
      data.push(v);
      return;
    }
    v = Math.min(g.target_amount, v + monthlyContribution);
    data.push(v);
  });
  return data;
}

function statusFromRatio(ratio: number): { label: string; className: string } {
  // ratio = monthlySim / requiredMonthly
  if (!isFinite(ratio) || ratio < 0.7)
    return { label: 'Behind', className: 'text-red-600' };
  if (ratio < 1.0) return { label: 'Tight', className: 'text-amber-600' };
  if (ratio <= 1.2) return { label: 'On track', className: 'text-green-600' };
  return { label: 'Ahead', className: 'text-green-700' };
}

// simple palette used for multiple selected goals on top chart
const palette = [
  '#2563EB', // blue-600
  '#16A34A', // green-600
  '#DC2626', // red-600
  '#9333EA', // purple-600
  '#F59E0B', // amber-500
  '#0EA5E9', // sky-500
  '#DB2777', // pink-600
];

export default function SavingsPlanner() {
  // data
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // create form (no id)
  const [form, setForm] = useState<GoalCreate>({
    name: '',
    target_amount: 0,
    target_date: '',
    current_amount: 0,
  });

  // edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Goal | null>(null);

  // top chart selections + simulation
  const [selectedGoals, setSelectedGoals] = useState<Set<number>>(new Set());
  const [simulationMode, setSimulationMode] = useState(false);
  const [period, setPeriod] = useState<Period>('monthly');
  // Store *per-period* simulated contribution when user types a number
  const [simContrib, setSimContrib] = useState<Record<number, number>>({}); // goalId -> amount per selected period
  // Store per-goal slider pct (0..200). 100% = required monthly
  const [simPct, setSimPct] = useState<Record<number, number>>({}); // goalId -> percent

  // -------- fetch goals --------
  const fetchGoals = async () => {
    try {
      setLoading(true);
      const res = await api.get<Goal[]>('/goals');
      setGoals(res.data);
      setError(null);

      // if nothing selected yet, select all and init sliders at 100%
      if (res.data.length) {
        if (selectedGoals.size === 0) {
          setSelectedGoals(new Set(res.data.map(g => g.id)));
        }
        setSimPct(prev => {
          const copy = { ...prev };
          res.data.forEach(g => {
            if (copy[g.id] === undefined) copy[g.id] = 100; // default 100%
          });
          return copy;
        });
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load goals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------- create --------
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError('Please enter a goal name.');
    if (!form.target_date) return setError('Please choose a target date.');
    if (form.target_amount <= 0) return setError('Target amount must be greater than 0.');
    if (form.current_amount < 0) return setError('Current amount cannot be negative.');

    try {
      await api.post('/goals', {
        name: form.name,
        target_amount: form.target_amount,
        target_date: form.target_date,
        current_amount: form.current_amount,
      });
      setForm({ name: '', target_amount: 0, target_date: '', current_amount: 0 });
      await fetchGoals();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to create goal.');
    }
  };

  // -------- edit --------
  const startEdit = (g: Goal) => {
    setEditingId(g.id);
    setEditDraft({ ...g });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };
  const saveEdit = async () => {
    if (!editDraft) return;
    const patch: GoalUpdate = {
      name: editDraft.name,
      target_amount: editDraft.target_amount,
      target_date: editDraft.target_date,
      current_amount: editDraft.current_amount,
    };
    try {
      await api.put(`/goals/${editDraft.id}`, patch);
      setEditingId(null);
      setEditDraft(null);
      await fetchGoals();
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to update goal.');
    }
  };

  // -------- delete --------
  const deleteGoal = async (id: number) => {
    try {
      await api.delete(`/goals/${id}`);
      // cleanup sim state
      setSimContrib(prev => {
        const cp = { ...prev };
        delete cp[id];
        return cp;
      });
      setSimPct(prev => {
        const cp = { ...prev };
        delete cp[id];
        return cp;
      });
      setSelectedGoals(prev => {
        const ns = new Set(prev);
        ns.delete(id);
        return ns;
      });
      await fetchGoals();
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to delete goal.');
    }
  };

  // -------- top chart data (memo) --------
  const topChart = useMemo(() => {
    if (!goals.length) return null;
    const selected = goals.filter(g => selectedGoals.has(g.id));
    if (!selected.length) return null;

    const now = new Date();
    const rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const maxDeadline = new Date(
      Math.max(...selected.map(g => new Date(g.target_date).getTime()))
    );
    const labels = generateMonthlyLabels(rangeStart, maxDeadline);

    const datasets: any[] = [];
    selected.forEach((g, i) => {
      const color = palette[i % palette.length];

      const actual = seriesActual(g, labels);
      datasets.push({
        label: `${g.name} (actual)`,
        data: actual,
        borderColor: color,
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.25,
      });

      if (simulationMode) {
        // derive sim monthly using slider% if present; else fall back to typed value or required
        const req = calcRequiredMonthly(g);
        const typedPerPeriod = simContrib[g.id]; // amount for selected period (if user typed)
        const pct = simPct[g.id] ?? 100;
        // priority: typed number overrides slider; slider overrides default
        const perPeriod = (typedPerPeriod !== undefined) ? typedPerPeriod : (req * (pct / 100));
        const monthly = toMonthly(perPeriod, period);
        const sim = seriesSimulated(g, labels, monthly);
        datasets.push({
          label: `${g.name} (sim)`,
          data: sim,
          borderColor: color,
          backgroundColor: 'transparent',
          borderDash: [6, 6],
          borderWidth: 2,
          tension: 0.25,
        });
      }
    });

    return { labels, datasets };
  }, [goals, selectedGoals, simulationMode, simContrib, simPct, period]);

  // -------- render --------
  if (loading) return <div className="p-6">Loading goals…</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Savings Planner</h1>

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Controls: simulation + selected goals */}
      <div className="mb-6 bg-white border border-gray-200 p-4 rounded">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Simulation Mode</span>
            <button
              onClick={() => setSimulationMode(s => !s)}
              className={`px-3 py-1 rounded border text-sm ${
                simulationMode
                  ? 'bg-blue-600 text-white border-blue-700'
                  : 'bg-white text-gray-800 border-gray-300'
              }`}
            >
              {simulationMode ? 'On' : 'Off'}
            </button>
          </div>

          {simulationMode && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Period</span>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as Period)}
                className="px-3 py-2 rounded border border-gray-300 text-sm"
              >
                <option value="monthly">Monthly</option>
                <option value="biweekly">Biweekly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-700">Show in chart:</span>
            {goals.map(g => (
              <label key={g.id} className="text-sm text-gray-700 flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={selectedGoals.has(g.id)}
                  onChange={(e) => {
                    setSelectedGoals(prev => {
                      const ns = new Set(prev);
                      if (e.target.checked) ns.add(g.id);
                      else ns.delete(g.id);
                      return ns;
                    });
                  }}
                />
                {g.name || `Goal ${g.id}`}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Top chart */}
      {topChart && (
        <div className="mb-8 bg-white border border-gray-200 p-4 rounded">
          <div className="h-72">
            <Line
              data={topChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' },
                  tooltip: { mode: 'index', intersect: false },
                },
                interaction: { mode: 'index', intersect: false },
                scales: {
                  y: {
                    ticks: {
                      callback: (v) => `$${Number(v).toLocaleString()}`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* Create goal form */}
      <form onSubmit={handleCreate} className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-3 bg-white border border-gray-200 p-4 rounded">
        <input
          type="text"
          placeholder="Goal name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border rounded px-3 py-2"
        />
        <input
          type="number"
          placeholder="Target amount"
          value={form.target_amount}
          onChange={(e) => setForm({ ...form, target_amount: parseFloat(e.target.value) || 0 })}
          className="border rounded px-3 py-2"
        />
        <input
          type="date"
          value={form.target_date}
          onChange={(e) => setForm({ ...form, target_date: e.target.value })}
          className="border rounded px-3 py-2"
        />
        <input
          type="number"
          placeholder="Current amount"
          value={form.current_amount}
          onChange={(e) => setForm({ ...form, current_amount: parseFloat(e.target.value) || 0 })}
          className="border rounded px-3 py-2"
        />
        <div className="md:col-span-4 flex justify-end">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Add Goal</button>
        </div>
      </form>

      {/* Goals list */}
      <div className="grid gap-4 md:grid-cols-2">
        {goals.length === 0 ? (
          <div className="text-gray-600">No goals yet. Create your first goal above.</div>
        ) : (
          goals.map((g, i) => {
            const isEditing = editingId === g.id;
            const reqMonthly = calcRequiredMonthly(g);

            // derive the simulated per-period number
            const pct = simPct[g.id] ?? 100;
            const typedPerPeriod = simContrib[g.id];
            const perPeriod = (typedPerPeriod !== undefined) ? typedPerPeriod : (reqMonthly * (pct / 100));
            const monthlySim = toMonthly(perPeriod, period);

            const monthsRem = monthsUntil(g.target_date);
            const projectedMonths = monthlySim > 0
              ? Math.ceil(Math.max(0, g.target_amount - g.current_amount) / monthlySim)
              : Infinity;
            const ratio = monthlySim / (reqMonthly || 1); // avoid div by zero
            const status = statusFromRatio(ratio);

            return (
              <div key={g.id} className="bg-white border border-gray-200 rounded p-4">
                {/* View / Edit fields */}
                {isEditing && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      value={editDraft?.name ?? ''}
                      onChange={(e) => setEditDraft(ed => ed ? { ...ed, name: e.target.value } : ed)}
                      className="border rounded px-3 py-2"
                    />
                    <input
                      type="number"
                      value={editDraft?.target_amount ?? 0}
                      onChange={(e) =>
                        setEditDraft(ed => ed ? { ...ed, target_amount: parseFloat(e.target.value) || 0 } : ed)
                      }
                      className="border rounded px-3 py-2"
                    />
                    <input
                      type="date"
                      value={editDraft?.target_date ?? ''}
                      onChange={(e) => setEditDraft(ed => ed ? { ...ed, target_date: e.target.value } : ed)}
                      className="border rounded px-3 py-2"
                    />
                    <input
                      type="number"
                      value={editDraft?.current_amount ?? 0}
                      onChange={(e) =>
                        setEditDraft(ed => ed ? { ...ed, current_amount: parseFloat(e.target.value) || 0 } : ed)
                      }
                      className="border rounded px-3 py-2"
                    />
                  </div>
                )}

                {!isEditing && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="font-medium">{g.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Target</p>
                      <p className="font-medium">${Number(g.target_amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Deadline</p>
                      <p className="font-medium">{g.target_date}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Current</p>
                      <p className="font-medium">${Number(g.current_amount).toLocaleString()}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mb-4">
                  {isEditing ? (
                    <>
                      <button
                        onClick={async () => {
                          if (!editDraft) return;
                          try {
                            await api.put(`/goals/${editDraft.id}`, {
                              name: editDraft.name,
                              target_amount: editDraft.target_amount,
                              target_date: editDraft.target_date,
                              current_amount: editDraft.current_amount,
                            });
                            setEditingId(null);
                            setEditDraft(null);
                            await fetchGoals();
                          } catch (e) {
                            setError('Failed to update goal.');
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditDraft(null); }}
                        className="border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setEditDraft(g); setEditingId(g.id); }}
                        className="border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteGoal(g.id)}
                        className="text-white bg-red-600 hover:bg-red-700 px-3 py-2 rounded"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>

                {/* Simulation controls per goal */}
                {simulationMode && (
                  <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 items-end">
                    <div>
                      <p className="text-xs text-gray-500">Required Monthly</p>
                      <p className="font-medium">
                        ${reqMonthly.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="lg:col-span-3">
                      <label className="text-xs text-gray-500">On‑track slider ({simPct[g.id] ?? 100}%)</label>
                      <input
                        type="range"
                        min={0}
                        max={200}
                        step={5}
                        value={simPct[g.id] ?? 100}
                        onChange={(e) => {
                          const pctVal = parseInt(e.target.value, 10);
                          setSimPct(prev => ({ ...prev, [g.id]: pctVal }));
                          // If user had manually typed a contribution, we clear it when using slider
                          setSimContrib(prev => {
                            const copy = { ...prev };
                            delete copy[g.id];
                            return copy;
                          });
                        }}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        Simulated {period} contribution: $
                        {(reqMonthly * ((simPct[g.id] ?? 100) / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs text-gray-500">Or type {period} amount</label>
                      <input
                        type="number"
                        className="border rounded px-3 py-2 w-full"
                        placeholder={`Amount per ${period}`}
                        value={simContrib[g.id] ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSimContrib(prev => ({ ...prev, [g.id]: v === '' ? undefined as any : parseFloat(v) || 0 }));
                        }}
                      />
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <p className={`font-medium ${status.className}`}>{status.label}</p>
                      <p className="text-xs text-gray-500 mt-1">Projected finish</p>
                      <p className={'font-medium ' + (projectedMonths < monthsRem ? 'text-green-600' : '')}>
                        {Number.isFinite(projectedMonths) ? `~${projectedMonths} months` : 'N/A'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
