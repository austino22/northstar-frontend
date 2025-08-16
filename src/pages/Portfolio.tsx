import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
} from "chart.js";
import Glass from "../components/Glass";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

interface Stock {
  symbol: string;
  shares: number;
}

interface Quote {
  symbol: string;
  price: number;
  change: number;
  percent_change: string;
}

type Holding = { id: number; symbol: string; shares: number; avgCost: number };

export default function Portfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [form, setForm] = useState<{ symbol: string; shares: string; avgCost: string }>({
    symbol: '',
    shares: '',
    avgCost: '',
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalInvested = useMemo(
    () => holdings.reduce((sum, h) => sum + h.shares * h.avgCost, 0),
    [holdings]
  );

  const addHolding = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const symbol = form.symbol.trim().toUpperCase();
    const shares = parseFloat(form.shares);
    const avgCost = parseFloat(form.avgCost);
    if (!symbol) return setError('Please enter a symbol.');
    if (!Number.isFinite(shares) || shares <= 0) return setError('Enter valid shares.');
    if (!Number.isFinite(avgCost) || avgCost <= 0) return setError('Enter valid average cost.');

    // merge if same symbol exists
    const existing = holdings.find(h => h.symbol === symbol);
    if (existing) {
      setHoldings(hs =>
        hs.map(h =>
          h.symbol === symbol
            ? { ...h, shares: h.shares + shares, avgCost: ((h.shares * h.avgCost) + (shares * avgCost)) / (h.shares + shares) }
            : h
        )
      );
    } else {
      setHoldings(hs => [
        ...hs,
        { id: Date.now(), symbol, shares, avgCost }
      ]);
    }
    setForm({ symbol: '', shares: '', avgCost: '' });
  };

  const removeHolding = (id: number) => {
    setHoldings(hs => hs.filter(h => h.id !== id));
  };

  return (
    <div className="p-2">
      <h1 className="text-2xl font-bold mb-4">Portfolio</h1>

      {error && (
        <div className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      )}

      {/* Add / Edit form */}
      <form onSubmit={addHolding} className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3 bg-white border border-gray-200 p-4 rounded">
        <input
          type="text"
          placeholder="Symbol (e.g., AAPL)"
          value={form.symbol}
          onChange={(e) => setForm({ ...form, symbol: e.target.value })}
          className="border rounded px-3 py-2"
        />
        <input
          type="number"
          step="any"
          placeholder="Shares"
          value={form.shares}
          onChange={(e) => setForm({ ...form, shares: e.target.value })}
          className="border rounded px-3 py-2"
        />
        <input
          type="number"
          step="any"
          placeholder="Avg cost"
          value={form.avgCost}
          onChange={(e) => setForm({ ...form, avgCost: e.target.value })}
          className="border rounded px-3 py-2"
        />
        <div className="md:col-span-1 flex items-center">
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            {editingId ? 'Save' : 'Add'}
          </button>
        </div>
      </form>

      {/* Summary */}
      <div className="mb-4 bg-white border border-gray-200 p-4 rounded">
        <p className="text-sm text-gray-600">Holdings: <span className="font-medium">{holdings.length}</span></p>
        <p className="text-sm text-gray-600">Total invested: <span className="font-medium">${totalInvested.toLocaleString(undefined,{maximumFractionDigits:2})}</span></p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white border border-gray-200 rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left px-3 py-2">Symbol</th>
              <th className="text-right px-3 py-2">Shares</th>
              <th className="text-right px-3 py-2">Avg Cost</th>
              <th className="text-right px-3 py-2">Invested</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {holdings.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-4 text-gray-500">No holdings yet. Add one above.</td></tr>
            ) : holdings.map(h => (
              <tr key={h.id} className="border-t">
                <td className="px-3 py-2 font-medium">{h.symbol}</td>
                <td className="px-3 py-2 text-right">{h.shares.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">${h.avgCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td className="px-3 py-2 text-right">
                  ${(h.shares * h.avgCost).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => removeHolding(h.id)}
                    className="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
