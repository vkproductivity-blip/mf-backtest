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
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const TRENDING_FUNDS = [
  { scheme_code: 120503, scheme_name: 'Parag Parikh Flexi Cap Fund - Direct Growth' },
  { scheme_code: 122639, scheme_name: 'Mirae Asset Large Cap Fund - Direct Growth' },
  { scheme_code: 120716, scheme_name: 'Quant Small Cap Fund - Direct Plan Growth' },
  { scheme_code: 118834, scheme_name: 'Nippon India Small Cap Fund - Direct Growth' },
  { scheme_code: 120828, scheme_name: 'SBI Contra Fund - Direct Growth' },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const formatPercent = (value) => `${(value * 100).toFixed(2)}%`;

function classifySchemeType(schemeName = '') {
  const name = schemeName.toLowerCase();
  if (name.includes('flexi cap')) return 'Flexi Cap';
  if (name.includes('large cap') || name.includes('bluechip')) return 'Large Cap';
  if (name.includes('mid cap')) return 'Mid Cap';
  if (name.includes('small cap')) return 'Small Cap';
  if (name.includes('elss') || name.includes('tax saver')) return 'ELSS / Tax Saver';
  if (name.includes('index') || name.includes('nifty') || name.includes('sensex')) return 'Index';
  if (name.includes('balanced advantage') || name.includes('dynamic asset allocation')) return 'Balanced Advantage';
  if (name.includes('hybrid') || name.includes('aggressive hybrid') || name.includes('conservative hybrid')) return 'Hybrid';
  if (name.includes('liquid') || name.includes('money market') || name.includes('ultra short')) return 'Liquid / Money Market';
  if (
    name.includes('debt') ||
    name.includes('bond') ||
    name.includes('gilt') ||
    name.includes('corporate') ||
    name.includes('credit risk') ||
    name.includes('income fund')
  ) {
    return 'Debt';
  }
  if (
    name.includes('thematic') ||
    name.includes('sector') ||
    name.includes('banking') ||
    name.includes('pharma') ||
    name.includes('technology') ||
    name.includes('infra')
  ) {
    return 'Sectoral / Thematic';
  }
  return 'Other';
}

function resolveFundGroupTitle(scheme) {
  if (scheme.scheme_category && scheme.scheme_category.trim()) {
    return scheme.scheme_category.trim();
  }
  if (scheme.scheme_type && scheme.scheme_type.trim()) {
    return scheme.scheme_type.trim();
  }
  return classifySchemeType(scheme.scheme_name);
}

const defaultStats = {
  schemeCode: '',
  schemeName: '',
  startDate: '',
  endDate: '',
  investmentType: 'lump-sum',
  investmentAmount: 100000,
  sipAmount: 5000,
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
  const [schemeUniverse, setSchemeUniverse] = useState([]);
  const [schemeUniverseLoading, setSchemeUniverseLoading] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [planner, setPlanner] = useState({
    targetCorpus: 2000000,
    expectedReturn: 12,
    horizonYears: 10,
  });
  const searchTimer = useRef(null);
  const alertTimer = useRef(null);
  const searchContainerRef = useRef(null);

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
    const savedTheme = typeof window !== 'undefined' ? window.localStorage.getItem('mf-theme') : null;
    const preferredTheme =
      savedTheme || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    setTheme(preferredTheme);
    document.documentElement.setAttribute('data-theme', preferredTheme);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    let active = true;
    const loadSchemes = async () => {
      setSchemeUniverseLoading(true);
      try {
        const response = await fetch(`${API_BASE}/schemes?limit=1200&offset=0`);
        if (!response.ok) {
          throw new Error('Unable to load scheme universe');
        }
        const data = await response.json();
        if (active) {
          setSchemeUniverse(Array.isArray(data?.items) ? data.items : []);
        }
      } catch (error) {
        console.error(error);
        if (active) {
          setSchemeUniverse([]);
        }
      } finally {
        if (active) {
          setSchemeUniverseLoading(false);
        }
      }
    };
    loadSchemes();
    return () => {
      active = false;
    };
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
        const response = await fetch(`${API_BASE}/api/schemes/search?q=${encodeURIComponent(schemeQuery)}`);
        if (!response.ok) {
          throw new Error('Unable to search schemes');
        }
        const results = await response.json();
        setSearchResults(results.slice(0, 10));
      } catch (error) {
        console.error(error);
      }
    }, 300);

    return () => clearTimeout(searchTimer.current);
  }, [schemeQuery]);

  const selectedScheme = (scheme_code, scheme_name) => {
    setForm((current) => ({
      ...current,
      schemeCode: scheme_code.toString(),
      schemeName: scheme_name,
    }));
    setSchemeQuery(`${scheme_code} - ${scheme_name}`);
    setSearchResults([]);
    setShowSearch(false);
  };

  const visibleSearchResults = useMemo(() => {
    if (schemeQuery.trim().length === 0) {
      return TRENDING_FUNDS;
    }
    return searchResults;
  }, [schemeQuery, searchResults]);

  const schemesByType = useMemo(() => {
    const grouped = {};
    for (const scheme of schemeUniverse) {
      const type = resolveFundGroupTitle(scheme);
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(scheme);
    }

    return Object.keys(grouped)
      .sort((a, b) => grouped[b].length - grouped[a].length || a.localeCompare(b))
      .map((title) => ({
        title,
        funds: grouped[title]
          .sort((a, b) => a.scheme_name.localeCompare(b.scheme_name))
          .slice(0, 12),
        count: grouped[title].length,
      }));
  }, [schemeUniverse]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    window.localStorage.setItem('mf-theme', nextTheme);
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
      const response = await fetch(`${API_BASE}/api/backtest`, {
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
    setForm(defaultStats);
    setSchemeQuery('');
    setSearchResults([]);
    setBacktest(null);
    clearAlerts();
  };

  const summaryCards = useMemo(() => {
    if (!backtest) return [];
    const invested = backtest.total_invested ?? 0;
    const profit = backtest.final_value - invested;
    return [
      { label: 'Final Portfolio Value', value: formatCurrency(backtest.final_value), tone: 'neutral' },
      { label: 'Total Invested', value: formatCurrency(invested), tone: 'subtle' },
      { label: 'Total Return', value: formatPercent(backtest.total_return), tone: backtest.total_return >= 0 ? 'positive' : 'negative' },
      { label: 'CAGR', value: formatPercent(backtest.cagr), tone: backtest.cagr >= 0 ? 'positive' : 'negative' },
    ];
  }, [backtest]);

  const chartData = useMemo(() => {
    if (!backtest) return null;
    return {
      labels: backtest.nav_dates.map((dateString) => new Date(dateString).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })),
      portfolio: backtest.portfolio_values,
      returns: backtest.daily_returns,
    };
  }, [backtest]);

  const statisticsRows = useMemo(() => {
    if (!backtest) return [];
    return [
      { label: 'Scheme', value: backtest.scheme_name },
      { label: 'Period', value: `${new Date(backtest.start_date).toLocaleDateString()} → ${new Date(backtest.end_date).toLocaleDateString()}` },
      { label: 'Investment Type', value: backtest.investment_type === 'sip' ? 'SIP' : 'Lump Sum' },
      { label: 'Total Days', value: `${Math.max(0, new Date(backtest.end_date) - new Date(backtest.start_date)) / 86400000 | 0}` },
      { label: 'Data points', value: backtest.nav_dates.length },
    ];
  }, [backtest]);

  const riskRows = useMemo(() => {
    if (!backtest) return [];
    return [
      { label: 'Max Drawdown', value: formatPercent(backtest.max_drawdown) },
      { label: 'Volatility', value: formatPercent(backtest.volatility) },
      { label: 'Sharpe Ratio', value: backtest.sharpe_ratio.toFixed(2) },
      { label: 'Positive Days', value: `${backtest.positive_days}/${backtest.total_trading_days}` },
    ];
  }, [backtest]);

  const performanceRows = useMemo(() => {
    if (!backtest) return [];
    return [
      { label: 'Average Daily Return', value: formatPercent(backtest.avg_daily_return) },
      { label: 'Best Day', value: formatPercent(backtest.best_day_return) },
      { label: 'Worst Day', value: formatPercent(backtest.worst_day_return) },
      { label: 'Final NAV', value: formatCurrency(backtest.final_value / (backtest.portfolio_values?.length || 1)) },
    ];
  }, [backtest]);

  const plannerValues = useMemo(() => {
    const target = Number(planner.targetCorpus) || 0;
    const annualReturn = Math.max(0, Number(planner.expectedReturn) || 0) / 100;
    const years = Math.max(1, Number(planner.horizonYears) || 1);
    const months = years * 12;
    const monthlyRate = annualReturn / 12;
    const requiredSip =
      monthlyRate > 0 ? (target * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1) : target / months;
    const requiredLumpsum = target / Math.pow(1 + annualReturn, years);

    return {
      requiredSip: Number.isFinite(requiredSip) ? requiredSip : 0,
      requiredLumpsum: Number.isFinite(requiredLumpsum) ? requiredLumpsum : 0,
    };
  }, [planner]);

  return (
    <>
      <Head>
        <title>MF Backtest | Next.js Mutual Fund Backtester</title>
        <meta name="description" content="Interactive mutual fund backtesting dashboard with matte Vanta black UI." />
      </Head>

      <div className="page-shell">
        <VantaBackground theme={theme} />
        <div className="page-frame">
          <PopularFundsSidebar />
          <header className="hero-panel">
            <div>
              <span className="eyebrow">Mutual Fund Backtester</span>
              <h1>MF Backtest</h1>
              <p className="hero-copy">
                Explore scheme performance, compare SIP and lump-sum scenarios, and visualize risk metrics in a refined matte-black dashboard.
              </p>
            </div>
            <div className="hero-actions">
              <button type="button" className="theme-toggle" onClick={toggleTheme}>
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>
              <div className="hero-badge">Powered by Next.js + Vanta</div>
            </div>
          </header>

          {message.text && (
            <div className={`toast ${message.type}`}>{message.text}</div>
          )}

          <section className="grid-2-up">
            <article className="glass-panel form-panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-title">Backtest Parameters</p>
                  <p className="panel-subtitle">Fast entry, intelligent results.</p>
                </div>
                <span className="chip">Interactive</span>
              </div>

              <div className="field-group" ref={searchContainerRef}>
                <label>Mutual Fund Scheme</label>
                <input
                  type="text"
                  value={schemeQuery}
                  onChange={(event) => handleInput('schemeCode', event.target.value)}
                  onFocus={() => setShowSearch(true)}
                  placeholder="Search by scheme code or name"
                  className="search-input"
                />
                {showSearch && visibleSearchResults.length > 0 && (
                  <div className="search-dropdown">
                    {schemeQuery.trim().length === 0 && (
                      <p className="search-hint">Trending funds</p>
                    )}
                    {visibleSearchResults.map((item) => (
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

              <div className="planner-box">
                <div className="planner-head">
                  <div>
                    <p className="panel-title">Goal Planner</p>
                    <p className="panel-subtitle">Estimate how much SIP or lump sum you need to reach a target corpus.</p>
                  </div>
                </div>
                <div className="row-grid">
                  <div className="field-group">
                    <label>Target Corpus (INR)</label>
                    <input
                      type="number"
                      min="100000"
                      step="50000"
                      value={planner.targetCorpus}
                      onChange={(event) => setPlanner((current) => ({ ...current, targetCorpus: event.target.value }))}
                    />
                  </div>
                  <div className="field-group">
                    <label>Expected Return (% p.a.)</label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      step="0.5"
                      value={planner.expectedReturn}
                      onChange={(event) => setPlanner((current) => ({ ...current, expectedReturn: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="field-group">
                  <label>Investment Horizon: {planner.horizonYears} years</label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={planner.horizonYears}
                    onChange={(event) => setPlanner((current) => ({ ...current, horizonYears: Number(event.target.value) }))}
                  />
                </div>
                <div className="planner-metrics">
                  <div className="planner-metric">
                    <p className="planner-label">Required SIP</p>
                    <p className="planner-value">{formatCurrency(plannerValues.requiredSip)}/month</p>
                    <button type="button" className="btn btn-tertiary" onClick={() => handleInput('sipAmount', Math.round(plannerValues.requiredSip))}>
                      Use SIP Value
                    </button>
                  </div>
                  <div className="planner-metric">
                    <p className="planner-label">Required Lump Sum</p>
                    <p className="planner-value">{formatCurrency(plannerValues.requiredLumpsum)}</p>
                    <button
                      type="button"
                      className="btn btn-tertiary"
                      onClick={() => handleInput('investmentAmount', Math.round(plannerValues.requiredLumpsum))}
                    >
                      Use Lump Sum
                    </button>
                  </div>
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
                <strong>Pro tip:</strong> Enter a scheme code and use the autocomplete results to avoid invalid codes.
              </div>
            </article>

            <article className="glass-panel summary-panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-title">Live Summary</p>
                  <p className="panel-subtitle">Results update after each run.</p>
                </div>
                <span className="badge">Matte</span>
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
                  <p>{`${new Date(backtest.start_date).toLocaleDateString()} → ${new Date(backtest.end_date).toLocaleDateString()}`}</p>
                </div>
              )}
            </article>
          </section>

          <section className="glass-panel fund-types-panel">
            <div className="panel-heading">
              <div>
                <p className="panel-title">Mutual Fund Types In Your Dataset</p>
                <p className="panel-subtitle">Grouped by official scheme category/type from your synced dataset for quick 1080p browsing.</p>
              </div>
              <span className="chip">Segregated</span>
            </div>

            {schemeUniverseLoading ? (
              <div className="empty-state">Loading your mutual fund universe...</div>
            ) : schemesByType.length === 0 ? (
              <div className="empty-state">No scheme data available yet. Sync more schemes to view type-wise segregation.</div>
            ) : (
              <div className="type-grid">
                {schemesByType.map((group) => (
                  <article key={group.title} className="type-card">
                    <div className="type-card-head">
                      <p className="type-title">{group.title}</p>
                      <span className="type-count">{group.count} funds</span>
                    </div>
                    <div className="type-fund-list">
                      {group.funds.map((fund) => (
                        <button
                          key={fund.scheme_code}
                          type="button"
                          className="type-fund-item"
                          onClick={() => selectedScheme(fund.scheme_code, fund.scheme_name)}
                        >
                          <span>{fund.scheme_code}</span>
                          <small>{fund.scheme_name}</small>
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {backtest && (
            <section className="chart-section">
              <div className="glass-panel chart-card">
                <div className="panel-heading split">
                  <div>
                    <p className="panel-title">Portfolio Growth</p>
                    <p className="panel-subtitle">Value evolution over time.</p>
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
                          backgroundColor: 'rgba(121, 192, 255, 0.18)',
                          fill: true,
                          tension: 0.35,
                          pointRadius: 4,
                          pointHoverRadius: 6,
                          pointBackgroundColor: '#79c0ff',
                          pointBorderColor: '#fff',
                          pointBorderWidth: 2,
                          borderWidth: 2,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      interaction: { mode: 'index', intersect: false },
                      plugins: {
                        legend: { labels: { color: '#cad6f0' } },
                        tooltip: {
                          enabled: true,
                          backgroundColor: 'rgba(17, 22, 31, 0.95)',
                          titleColor: '#79c0ff',
                          bodyColor: '#e1e8ff',
                          borderColor: 'rgba(121, 192, 255, 0.3)',
                          borderWidth: 1,
                          padding: 12,
                          displayColors: false,
                          callbacks: {
                            title: (context) => `Date: ${context[0].label}`,
                            label: (context) => `Value: ₹${(context.parsed.y).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                          },
                        },
                      },
                      scales: {
                        x: { ticks: { color: '#a5b3cc' }, grid: { color: 'rgba(121, 192, 255, 0.08)' } },
                        y: { ticks: { color: '#a5b3cc', callback: (value) => '₹' + (value / 100000).toFixed(1) + 'L' }, grid: { color: 'rgba(121, 192, 255, 0.08)' } },
                      },
                    }}
                  />
                </div>
              </div>

              <div className="glass-panel chart-card">
                <div className="panel-heading split">
                  <div>
                    <p className="panel-title">Daily Returns</p>
                    <p className="panel-subtitle">Visualize upside and downside days.</p>
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
                        tooltip: {
                          backgroundColor: '#11161f',
                          titleColor: '#79c0ff',
                          bodyColor: '#e1e8ff',
                          callbacks: {
                            label: (context) => `${context.parsed.y.toFixed(2)}%`,
                          },
                        },
                      },
                      scales: {
                        x: { ticks: { color: '#a5b3cc' }, grid: { color: 'rgba(121, 192, 255, 0.08)' } },
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
