import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import PopularFundsSidebar from '../components/PopularFundsSidebar';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

const VantaBackground = dynamic(() => import('../components/VantaBackground'), { ssr: false });
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatPercent = (value) => `${(Number(value || 0) * 100).toFixed(2)}%`;

const defaultStats = {
  schemeCode: '',
  schemeName: '',
  startDate: '',
  endDate: '',
  investmentType: 'lump-sum',
  investmentAmount: 100000,
  sipAmount: 5000,
};

const buildApiUrl = (path) => {
  if (!API_BASE) {
    return path;
  }
  return `${API_BASE}${path}`;
};

const buildInvestedSeries = (backtest) => {
  if (!backtest?.nav_dates?.length) {
    return [];
  }

  if (backtest.investment_type === 'lump-sum') {
    return backtest.nav_dates.map(() => Number(backtest.total_invested || 0));
  }

  let runningInvested = 0;
  const seenMonths = new Set();

  return backtest.nav_dates.map((dateString) => {
    const date = new Date(dateString);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    if (!seenMonths.has(monthKey)) {
      seenMonths.add(monthKey);
      runningInvested += Number(backtest.sip_amount || 0);
    }
    return runningInvested;
  });
};

export default function Home() {
  const [form, setForm] = useState(defaultStats);
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('statistics');
  const [backtest, setBacktest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [schemeQuery, setSchemeQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchTimer = useRef(null);
  const alertTimer = useRef(null);

  useEffect(() => {
    const today = new Date();
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    setForm((current) => ({
      ...current,
      startDate: oneYearAgo.toISOString().slice(0, 10),
      endDate: today.toISOString().slice(0, 10),
    }));
  }, []);

  useEffect(() => {
    if (!schemeQuery || schemeQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    searchTimer.current = setTimeout(async () => {
      try {
        const response = await fetch(buildApiUrl(`/api/schemes/search?q=${encodeURIComponent(schemeQuery)}`));
        if (!response.ok) {
          throw new Error('Unable to search schemes');
        }
        const results = await response.json();
        setSearchResults(results.slice(0, 10));
      } catch (error) {
        console.error(error);
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(searchTimer.current);
  }, [schemeQuery]);

  const selectedScheme = (schemeCode, schemeName) => {
    setForm((current) => ({
      ...current,
      schemeCode: schemeCode.toString(),
      schemeName,
    }));
    setSchemeQuery(`${schemeCode} - ${schemeName}`);
    setSearchResults([]);
    setShowSearch(false);
  };

  const handleInput = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    if (field === 'schemeCode') {
      setSchemeQuery(value);
      setShowSearch(true);
    }
  };

  const showAlert = (type, text) => {
    if (alertTimer.current) {
      window.clearTimeout(alertTimer.current);
    }
    setMessage({ type, text });
    alertTimer.current = window.setTimeout(() => setMessage({ type: '', text: '' }), 4500);
  };

  const clearAlerts = () => setMessage({ type: '', text: '' });

  const validateForm = () => {
    if (!form.schemeCode || !form.startDate || !form.endDate) {
      showAlert('warning', 'Complete all required fields.');
      return false;
    }
    if (new Date(form.startDate) >= new Date(form.endDate)) {
      showAlert('warning', 'Start date must be before end date.');
      return false;
    }
    if (form.investmentType === 'lump-sum' && Number(form.investmentAmount) <= 0) {
      showAlert('warning', 'Investment amount must be above zero.');
      return false;
    }
    if (form.investmentType === 'sip' && Number(form.sipAmount) <= 0) {
      showAlert('warning', 'SIP monthly amount must be above zero.');
      return false;
    }
    return true;
  };

  const runBacktest = async () => {
    if (!validateForm()) {
      return;
    }
    clearAlerts();
    setLoading(true);
    setBacktest(null);

    const payload = {
      scheme_code: parseInt(form.schemeCode, 10),
      start_date: form.startDate,
      end_date: form.endDate,
      investment_type: form.investmentType,
      lumpsum_amount: form.investmentType === 'lump-sum' ? Number(form.investmentAmount) : undefined,
      sip_amount: form.investmentType === 'sip' ? Number(form.sipAmount) : undefined,
    };

    try {
      const response = await fetch(buildApiUrl('/api/backtest'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Backtest failed');
      }
      setBacktest(data);
      showAlert('success', 'Backtest complete. Review the interactive dashboard below.');
    } catch (error) {
      console.error(error);
      showAlert('error', error.message || 'Request failed');
    } finally {
      setLoading(false);
      setShowSearch(false);
    }
  };

  const resetForm = () => {
    const today = new Date();
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    setForm({
      ...defaultStats,
      startDate: oneYearAgo.toISOString().slice(0, 10),
      endDate: today.toISOString().slice(0, 10),
    });
    setSchemeQuery('');
    setSearchResults([]);
    setBacktest(null);
    clearAlerts();
  };

  const summaryCards = useMemo(() => {
    if (!backtest) return [];
    return [
      { label: 'Final Portfolio Value', value: formatCurrency(backtest.final_value), tone: 'neutral' },
      { label: 'Total Invested', value: formatCurrency(backtest.total_invested), tone: 'subtle' },
      { label: 'Total Return', value: formatPercent(backtest.total_return), tone: backtest.total_return >= 0 ? 'positive' : 'negative' },
      { label: 'CAGR', value: formatPercent(backtest.cagr), tone: backtest.cagr >= 0 ? 'positive' : 'negative' },
    ];
  }, [backtest]);

  const chartData = useMemo(() => {
    if (!backtest) return null;
    return {
      labels: backtest.nav_dates.map((dateString) => new Date(dateString).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })),
      portfolio: backtest.portfolio_values,
      invested: buildInvestedSeries(backtest),
      returns: backtest.daily_returns,
    };
  }, [backtest]);

  const statisticsRows = useMemo(() => {
    if (!backtest) return [];
    return [
      { label: 'Scheme', value: backtest.scheme_name },
      { label: 'Period', value: `${new Date(backtest.start_date).toLocaleDateString()} -> ${new Date(backtest.end_date).toLocaleDateString()}` },
      { label: 'Investment Type', value: backtest.investment_type === 'sip' ? 'SIP' : 'Lump Sum' },
      { label: 'Data Points', value: backtest.nav_dates.length },
      { label: 'Trading Days', value: backtest.total_trading_days },
    ];
  }, [backtest]);

  const riskRows = useMemo(() => {
    if (!backtest) return [];
    return [
      { label: 'Max Drawdown', value: formatPercent(backtest.max_drawdown) },
      { label: 'Volatility', value: formatPercent(backtest.volatility) },
      { label: 'Sharpe Ratio', value: Number(backtest.sharpe_ratio || 0).toFixed(2) },
      { label: 'Positive Days', value: `${backtest.positive_days}/${backtest.total_trading_days}` },
    ];
  }, [backtest]);

  const performanceRows = useMemo(() => {
    if (!backtest) return [];
    return [
      { label: 'Average Daily Return', value: formatPercent(backtest.avg_daily_return) },
      { label: 'Best Day', value: formatPercent(backtest.best_day_return) },
      { label: 'Worst Day', value: formatPercent(backtest.worst_day_return) },
      { label: 'Final Value', value: formatCurrency(backtest.final_value) },
    ];
  }, [backtest]);

  return (
    <>
      <Head>
        <title>MF Backtest | Mutual Fund Backtester</title>
        <meta name="description" content="Interactive mutual fund backtesting dashboard for public deployment on Vercel and Railway." />
      </Head>

      <div className="page-shell">
        <VantaBackground />
        <div className="page-frame">
          <header className="hero-panel">
            <div>
              <span className="eyebrow">Mutual Fund Backtester</span>
              <h1>MF Backtest</h1>
              <p className="hero-copy">
                Explore scheme performance, compare SIP and lump-sum scenarios, and visualize risk metrics in a clean public dashboard.
              </p>
            </div>
            <div className="hero-badge">Vercel Frontend + Railway API</div>
          </header>

          {!API_BASE && (
            <div className="toast warning">
              NEXT_PUBLIC_API_BASE_URL is not set. Local same-origin calls will work only if the frontend is reverse-proxied with the backend.
            </div>
          )}

          {message.text && (
            <div className={`toast ${message.type}`}>{message.text}</div>
          )}

          <div className="dashboard-layout">
            <div className="dashboard-main">
              <section className="grid-2-up">
                <article className="glass-panel form-panel">
                  <div className="panel-heading">
                    <div>
                      <p className="panel-title">Backtest Parameters</p>
                      <p className="panel-subtitle">Search any scheme and run a backtest in seconds.</p>
                    </div>
                    <span className="chip">Interactive</span>
                  </div>

                  <div className="field-group">
                    <label>Mutual Fund Scheme</label>
                    <input
                      type="text"
                      value={schemeQuery}
                      onChange={(event) => handleInput('schemeCode', event.target.value)}
                      placeholder="Search by scheme code or name"
                      className="search-input"
                    />
                    {showSearch && searchResults.length > 0 && (
                      <div className="search-dropdown">
                        {searchResults.map((item) => (
                          <button
                            key={item.scheme_code}
                            type="button"
                            className="search-item"
                            onClick={() => selectedScheme(item.scheme_code, item.scheme_name)}
                          >
                            <span>{item.scheme_code}</span>
                            <small>{item.scheme_name}</small>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="row-grid">
                    <div className="field-group">
                      <label>Start Date</label>
                      <input type="date" value={form.startDate} onChange={(event) => handleInput('startDate', event.target.value)} />
                    </div>
                    <div className="field-group">
                      <label>End Date</label>
                      <input type="date" value={form.endDate} onChange={(event) => handleInput('endDate', event.target.value)} />
                    </div>
                  </div>

                  <div className="row-grid">
                    <div className="field-group">
                      <label>Investment Type</label>
                      <select value={form.investmentType} onChange={(event) => handleInput('investmentType', event.target.value)}>
                        <option value="lump-sum">Lump Sum</option>
                        <option value="sip">SIP</option>
                      </select>
                    </div>
                    <div className="field-group">
                      <label>{form.investmentType === 'sip' ? 'Monthly SIP Amount' : 'Lump Sum Amount'}</label>
                      <input
                        type="number"
                        value={form.investmentType === 'sip' ? form.sipAmount : form.investmentAmount}
                        onChange={(event) => handleInput(form.investmentType === 'sip' ? 'sipAmount' : 'investmentAmount', event.target.value)}
                        min="100"
                        step="100"
                      />
                    </div>
                  </div>

                  <div className="button-row">
                    <button className="btn btn-primary" onClick={runBacktest} disabled={loading}>
                      {loading ? 'Running...' : 'Run Backtest'}
                    </button>
                    <button className="btn btn-secondary" onClick={resetForm} disabled={loading}>
                      Reset
                    </button>
                  </div>

                  <div className="hint-box">
                    <strong>Tip:</strong> pick a scheme from autocomplete so the public deployment always sends a valid scheme code.
                  </div>
                </article>

                <article className="glass-panel summary-panel">
                  <div className="panel-heading">
                    <div>
                      <p className="panel-title">Live Summary</p>
                      <p className="panel-subtitle">Results update after each successful run.</p>
                    </div>
                    <span className="badge">Public Ready</span>
                  </div>

                  <div className="metrics-grid">
                    {summaryCards.length > 0 ? (
                      summaryCards.map((card) => (
                        <div key={card.label} className={`metric-card ${card.tone}`}>
                          <p className="metric-label">{card.label}</p>
                          <p className="metric-value">{card.value}</p>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">Run a backtest to see performance metrics instantly.</div>
                    )}
                  </div>

                  {backtest && (
                    <div className="info-block">
                      <p className="info-label">Scheme</p>
                      <p>{backtest.scheme_name}</p>
                      <p className="info-label">Period</p>
                      <p>{`${new Date(backtest.start_date).toLocaleDateString()} -> ${new Date(backtest.end_date).toLocaleDateString()}`}</p>
                    </div>
                  )}
                </article>
              </section>

              {backtest && (
                <section className="chart-section">
                  <div className="glass-panel chart-card">
                    <div className="panel-heading split">
                      <div>
                        <p className="panel-title">Portfolio Growth</p>
                        <p className="panel-subtitle">Compare invested capital with actual portfolio value over time.</p>
                      </div>
                    </div>
                    <div className="chart-frame">
                      <Line
                        data={{
                          labels: chartData.labels,
                          datasets: [
                            {
                              label: 'Portfolio Value',
                              data: chartData.portfolio,
                              borderColor: '#79c0ff',
                              backgroundColor: 'rgba(121, 192, 255, 0.12)',
                              fill: true,
                              tension: 0.35,
                              pointRadius: 0,
                              pointHoverRadius: 5,
                              borderWidth: 2,
                            },
                            {
                              label: 'Invested Amount',
                              data: chartData.invested,
                              borderColor: '#ffbf69',
                              borderDash: [8, 6],
                              fill: false,
                              tension: 0.2,
                              pointRadius: 0,
                              pointHoverRadius: 4,
                              borderWidth: 2,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          interaction: { mode: 'index', intersect: false },
                          plugins: {
                            legend: { labels: { color: '#cad6f0' } },
                          },
                          scales: {
                            x: { ticks: { color: '#a5b3cc', maxTicksLimit: 8 }, grid: { color: 'rgba(121, 192, 255, 0.08)' } },
                            y: { ticks: { color: '#a5b3cc' }, grid: { color: 'rgba(121, 192, 255, 0.08)' } },
                          },
                        }}
                      />
                    </div>
                  </div>

                  <div className="glass-panel chart-card">
                    <div className="panel-heading split">
                      <div>
                        <p className="panel-title">Daily Returns</p>
                        <p className="panel-subtitle">See up days and down days quickly.</p>
                      </div>
                    </div>
                    <div className="chart-frame">
                      <Bar
                        data={{
                          labels: chartData.labels.slice(1),
                          datasets: [
                            {
                              label: 'Daily Return',
                              data: chartData.returns.map((value) => value * 100),
                              backgroundColor: chartData.returns.map((value) => (value >= 0 ? '#78d9a4' : '#ff637d')),
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: { display: false },
                          },
                          scales: {
                            x: { ticks: { color: '#a5b3cc', maxTicksLimit: 8 }, grid: { color: 'rgba(121, 192, 255, 0.08)' } },
                            y: { ticks: { color: '#a5b3cc', callback: (value) => `${value}%` }, grid: { color: 'rgba(121, 192, 255, 0.08)' } },
                          },
                        }}
                      />
                    </div>
                  </div>
                </section>
              )}

              {backtest && (
                <section className="metric-tabs">
                  <div className="tab-bar">
                    {['statistics', 'risk', 'performance'].map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        className={tab === activeTab ? 'tab active' : 'tab'}
                        onClick={() => setActiveTab(tab)}
                      >
                        {tab.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <div className="tab-panel">
                    {activeTab === 'statistics' && <MetricTable rows={statisticsRows} />}
                    {activeTab === 'risk' && <MetricTable rows={riskRows} />}
                    {activeTab === 'performance' && <MetricTable rows={performanceRows} />}
                  </div>
                </section>
              )}
            </div>

            <PopularFundsSidebar />
          </div>
        </div>
      </div>
    </>
  );
}

function MetricTable({ rows }) {
  return (
    <div className="glass-panel table-panel">
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
