import { useEffect, useState } from "react";
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

export default function Portfolio() {
  const API_BASE = "http://localhost:8000";
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [history, setHistory] = useState<Record<string, any[]>>({});
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState<number>(0);

  const fetchData = async () => {
    for (let s of stocks) {
      try {
        const quoteRes = await axios.get(`${API_BASE}/quote/${s.symbol}`);
        setQuotes((prev) => ({ ...prev, [s.symbol]: quoteRes.data }));

        const histRes = await axios.get(`${API_BASE}/history/${s.symbol}`);
        setHistory((prev) => ({ ...prev, [s.symbol]: histRes.data }));
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    if (stocks.length > 0) {
      fetchData();
    }
  }, [stocks]);

  const addStock = () => {
    if (!symbol || shares <= 0) return;
    setStocks((prev) => [...prev, { symbol: symbol.toUpperCase(), shares }]);
    setSymbol("");
    setShares(0);
  };

  const removeStock = (sym: string) => {
    setStocks((prev) => prev.filter((s) => s.symbol !== sym));
    setQuotes((prev) => {
      const newQuotes = { ...prev };
      delete newQuotes[sym];
      return newQuotes;
    });
    setHistory((prev) => {
      const newHist = { ...prev };
      delete newHist[sym];
      return newHist;
    });
  };

  return (
    <div className="space-y-6">
      <Glass className="p-6">
        <h2 className="text-2xl font-bold mb-4">Portfolio</h2>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="px-3 py-2 rounded-md bg-white/60 dark:bg-white/20 border border-white/40 placeholder:text-gray-500 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <input
            type="number"
            placeholder="Shares"
            value={shares}
            onChange={(e) => setShares(Number(e.target.value))}
            className="px-3 py-2 rounded-md bg-white/60 dark:bg-white/20 border border-white/40 placeholder:text-gray-500 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            onClick={addStock}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Add
          </button>
        </div>
      </Glass>

      <div className="grid gap-4 md:grid-cols-2">
        {stocks.map((s) => {
          const q = quotes[s.symbol];
          const h = history[s.symbol] || [];

          return (
            <Glass
              key={s.symbol}
              className="p-6 transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div className="flex justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{s.symbol}</h3>
                  {q ? (
                    <p className={q.change >= 0 ? "text-green-600" : "text-red-600"}>
                      ${q.price.toFixed(2)} ({q.change.toFixed(2)}, {q.percent_change})
                    </p>
                  ) : (
                    <p className="text-gray-500">Loading...</p>
                  )}
                </div>
                <button
                  onClick={() => removeStock(s.symbol)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>

              {h.length > 0 && (
                <div className="mt-4">
                  <Line
                    data={{
                      labels: h.map((d) => d.date),
                      datasets: [
                        {
                          label: `${s.symbol} Close Price`,
                          data: h.map((d) => d.close),
                          borderColor: "rgb(75,192,192)",
                          fill: false
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false } },
                      scales: { x: { display: false } }
                    }}
                  />
                </div>
              )}
            </Glass>
          );
        })}
      </div>
    </div>
  );
}
