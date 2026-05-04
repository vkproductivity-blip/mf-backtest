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

function BacktestResult({ result }) {
  const [activeTab, setActiveTab] = useState('statistics');
  const chartData = useMemo(() => {
    if (!result) return null;
    return {
      labels: result.nav_dates.map(
        (dateString) => new Date(dateString).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
      ),
      portfolio: result.portfolio_values,
      invested: buildInvestedSeries(result),
      returns: result.daily_returns,
    };
  }, [result]);

  const statisticsRows = useMemo(() => {
    if (!result) return [];
    return [
      { label: 'Scheme', value: result.scheme_name },
      {
        label: 'Period',
        value: `${new Date(result.start_date).toLocaleDateString()} -> ${new Date(result.end_date).toLocaleDateString()}`,
      },
      { label: 'Investment Type', value: result.investment_type === 'sip' ? 'SIP' : 'Lump Sum' },
      { label: 'Data Points', value: result.nav_dates.length },
      { label: 'Trading Days', value: result.total_trading_days },
    ];
  }, [result]);

  const riskRows = useMemo(() => {
    if (!result) return [];
    return [
      { label: 'Max Drawdown', value: formatPercent(result.max_drawdown) },
      { label: 'Volatility', value: formatPercent(result.volatility) },
      { label: 'Sharpe Ratio', value: Number(result.sharpe_ratio || 0).toFixed(2) },
      { label: 'Positive Days', value: `${result.positive_days}/${result.total_trading_days}` },
    ];
  }, [result]);

  const performanceRows = useMemo(() => {
    if (!result) return [];
    return [
      { label: 'Average Daily Return', value: formatPercent(result.avg_daily_return) },
      { label: 'Best Day', value: formatPercent(result.best_day_return) },
      { label: 'Worst Day', value: formatPercent(result.worst_day_return) },
      { label: 'Final Value', value: formatCurrency(result.final_value) },
    ];
  }, [result]);

  const MetricTable = ({ rows }) => (
    <div className="glass-panel table-panel">
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td>{row.label}</td>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (!result) return null;

  return (
    <>
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
                plugins: { legend: { labels: { color: '#cad6f0' } } },
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
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { color: '#a5b3cc', maxTicksLimit: 8 }, grid: { color: 'rgba(121, 192, 255, 0.08)' } },
                  y: { ticks: { color: '#a5b3cc', callback: (value) => `${value}%` }, grid: { color: 'rgba(121, 192, 255, 0.08)' } },
                },
              }}
            />
          </div>
        </div>
      </section>

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
    </>
  );
}

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
  
  // Portfolio mode state
  const [analysisMode, setAnalysisMode] = useState('single'); // 'single' | 'portfolio'
  const [portfolioFunds, setPortfolioFunds] = useState([]); // {code, name, amount}
  const [portfolioQuery, setPortfolioQuery] = useState('');
  const [portfolioSearchResults, setPortfolioSearchResults] = useState([]);
  const [portfolioInvestmentType, setPortfolioInvestmentType] = useState('lump-sum');
  const [showPortfolioSearch, setShowPortfolioSearch] = useState(false);
  const portfolioSearchTimer = useRef(null);

  // Compare mode state
  const [compareFunds, setCompareFunds] = useState([]);
  const [compareQuery, setCompareQuery] = useState('');
  const [compareSearchResults, setCompareSearchResults] = useState([]);
  const [showCompareSearch, setShowCompareSearch] = useState(false);
  const [compareInvestmentType, setCompareInvestmentType] = useState('lump-sum');
  const compareSearchTimer = useRef(null);
  const [compareResults, setCompareResults] = useState(null);

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
        setSearchResults(results.items.slice(0, 10));
      } catch (error) {
        console.error(error);
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(searchTimer.current);
   }, [schemeQuery]);

  useEffect(() => {
    if (!portfolioQuery || portfolioQuery.length < 2) {
      setPortfolioSearchResults([]);
      return;
    }

    if (portfolioSearchTimer.current) {
      clearTimeout(portfolioSearchTimer.current);
    }

    portfolioSearchTimer.current = setTimeout(async () => {
      try {
        const response = await fetch(buildApiUrl(`/api/schemes/search?q=${encodeURIComponent(portfolioQuery)}`));
        if (!response.ok) {
          throw new Error('Unable to search schemes');
        }
        const results = await response.json();
        setPortfolioSearchResults(results.items.slice(0, 10));
      } catch (error) {
        console.error(error);
        setPortfolioSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(portfolioSearchTimer.current);
  }, [portfolioQuery]);

  useEffect(() => {
    if (!compareQuery || compareQuery.length < 2) {
      setCompareSearchResults([]);
      return;
    }

    if (compareSearchTimer.current) {
      clearTimeout(compareSearchTimer.current);
    }

    compareSearchTimer.current = setTimeout(async () => {
      try {
        const response = await fetch(buildApiUrl(`/api/schemes/search?q=${encodeURIComponent(compareQuery)}`));
        if (!response.ok) {
          throw new Error('Unable to search schemes');
        }
        const results = await response.json();
        setCompareSearchResults(results.items.slice(0, 10));
      } catch (error) {
        console.error(error);
        setCompareSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(compareSearchTimer.current);
  }, [compareQuery]);

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

  // Portfolio functions
  const addFundToPortfolio = (schemeCode, schemeName) => {
    setPortfolioFunds((current) => {
      if (current.some((f) => f.code === schemeCode)) {
        return current;
      }
      return [...current, { code: schemeCode, name: schemeName, amount: 10000, start_date: form.startDate, end_date: form.endDate }];
    });
    setPortfolioQuery('');
    setPortfolioSearchResults([]);
    setShowPortfolioSearch(false);
  };

  const removeFundFromPortfolio = (index) => {
    setPortfolioFunds((current) => current.filter((_, i) => i !== index));
  };

  const updateFundAmount = (index, amount) => {
    setPortfolioFunds((current) =>
      current.map((fund, i) => (i === index ? { ...fund, amount: amount || 0 } : fund))
    );
  };

  // Compare functions
  const selectSchemeForCompare = (schemeCode, schemeName) => {
    if (compareFunds.length >= 5) {
      showAlert('warning', 'Maximum 5 funds allowed for comparison.');
      return;
    }
    setCompareFunds((current) => {
      if (current.some((f) => f.code === schemeCode)) {
        showAlert('warning', 'Fund already added.');
        return current;
      }
      return [...current, { code: schemeCode, name: schemeName, amount: 10000, start_date: form.startDate, end_date: form.endDate }];
    });
    setCompareQuery('');
    setCompareSearchResults([]);
    setShowCompareSearch(false);
  };

  const removeFundFromCompare = (index) => {
    setCompareFunds((current) => current.filter((_, i) => i !== index));
  };

  const updateCompareFundAmount = (index, amount) => {
    setCompareFunds((current) =>
      current.map((fund, i) => (i === index ? { ...fund, amount: amount || 0 } : fund))
    );
  };

  const updateCompareFundStartDate = (index, date) => {
    setCompareFunds((current) =>
      current.map((fund, i) => (i === index ? { ...fund, start_date: date } : fund))
    );
  };

  const updateCompareFundEndDate = (index, date) => {
    setCompareFunds((current) =>
      current.map((fund, i) => (i === index ? { ...fund, end_date: date } : fund))
    );
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

  const validatePortfolio = () => {
    if (portfolioFunds.length < 2) {
      showAlert('warning', 'Add at least 2 funds to the portfolio.');
      return false;
    }
    for (const fund of portfolioFunds) {
      if (!fund.amount || fund.amount <= 0) {
        showAlert('warning', `Amount for ${fund.name} must be greater than zero.`);
        return false;
      }
      if (!fund.start_date || !fund.end_date) {
        showAlert('warning', `Select start and end dates for ${fund.name}.`);
        return false;
      }
      if (new Date(fund.start_date) >= new Date(fund.end_date)) {
        showAlert('warning', `Start date must be before end date for ${fund.name}.`);
        return false;
      }
    }
    return true;
  };

  const validateCompare = () => {
    if (compareFunds.length < 2) {
      showAlert('warning', 'Add at least 2 funds to compare.');
      return false;
    }
    for (const fund of compareFunds) {
      if (!fund.amount || fund.amount <= 0) {
        showAlert('warning', `Amount for ${fund.name} must be greater than zero.`);
        return false;
      }
      if (!fund.start_date || !fund.end_date) {
        showAlert('warning', `Select start and end dates for ${fund.name}.`);
        return false;
      }
      if (new Date(fund.start_date) >= new Date(fund.end_date)) {
        showAlert('warning', `Start date must be before end date for ${fund.name}.`);
        return false;
      }
    }
    return true;
  };

  const runAnalysis = async () => {
    if (analysisMode === 'single') {
      if (!validateForm()) return;
    } else if (analysisMode === 'portfolio') {
      if (!validatePortfolio()) return;
    } else if (analysisMode === 'compare') {
      if (!validateCompare()) return;
    }
    clearAlerts();
    setLoading(true);
    setBacktest(null);
    setCompareResults(null);

    let payload, endpoint;
    if (analysisMode === 'single') {
      endpoint = '/api/backtest';
      payload = {
        scheme_code: parseInt(form.schemeCode, 10),
        start_date: form.startDate,
        end_date: form.endDate,
        investment_type: form.investmentType,
        lumpsum_amount: form.investmentType === 'lump-sum' ? Number(form.investmentAmount) : undefined,
        sip_amount: form.investmentType === 'sip' ? Number(form.sipAmount) : undefined,
      };
    } else if (analysisMode === 'portfolio') {
      endpoint = '/api/portfolio-backtest';
      payload = {
        scheme_codes: portfolioFunds.map((f) => f.code),
        allocations: portfolioFunds.map((f) => Number(f.amount)),
        investment_type: portfolioInvestmentType,
        scheme_dates: portfolioFunds.map((f) => ({
          scheme_code: f.code,
          start_date: f.start_date,
          end_date: f.end_date,
        })),
      };
    } else if (analysisMode === 'compare') {
      endpoint = '/api/compare-detailed';
      payload = {
        funds: compareFunds.map((f) => ({
          scheme_code: f.code,
          start_date: f.start_date,
          end_date: f.end_date,
          amount: Number(f.amount),
        })),
        investment_type: compareInvestmentType,
      };
    }

    try {
      const response = await fetch(buildApiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Analysis failed');
      }
      if (analysisMode === 'compare') {
        setCompareResults(data);
      } else {
        setBacktest(data);
      }
      showAlert('success', 
        analysisMode === 'single' ? 'Backtest complete.' :
        analysisMode === 'portfolio' ? 'Portfolio analysis complete.' :
        'Comparison complete.');
    } catch (error) {
      console.error(error);
      showAlert('error', error.message || 'Request failed');
    } finally {
      setLoading(false);
      setShowSearch(false);
      setShowPortfolioSearch(false);
      setShowCompareSearch(false);
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
    setCompareResults(null);
    setPortfolioFunds([]);
    setPortfolioQuery('');
    setPortfolioSearchResults([]);
    setCompareFunds([]);
    setCompareQuery('');
    setCompareSearchResults([]);
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
               <section className={analysisMode === 'compare' ? 'grid-1-up' : 'grid-2-up'}>
                 <article className="glass-panel form-panel">
                   <div className="panel-heading">
                     <div>
                       <p className="panel-title">{analysisMode === 'single' ? 'Backtest Parameters' : 'Portfolio Builder'}</p>
                       <p className="panel-subtitle">{analysisMode === 'single' ? 'Search any scheme and run a backtest in seconds.' : 'Select unlimited funds and allocate amounts.'}</p>
                     </div>
                     <span className="chip">Interactive</span>
                   </div>

                    {/* Mode Toggle */}
                    <div className="mode-toggle">
                      <button
                        type="button"
                        className={`mode-btn ${analysisMode === 'single' ? 'active' : ''}`}
                        onClick={() => setAnalysisMode('single')}
                      >
                        Single Fund
                      </button>
                      <button
                        type="button"
                        className={`mode-btn ${analysisMode === 'portfolio' ? 'active' : ''}`}
                        onClick={() => setAnalysisMode('portfolio')}
                      >
                        Portfolio
                      </button>
                      <button
                        type="button"
                        className={`mode-btn ${analysisMode === 'compare' ? 'active' : ''}`}
                        onClick={() => setAnalysisMode('compare')}
                      >
                        Compare
                      </button>
                    </div>

                   {analysisMode === 'single' ? (
                     <>
                        <div className="field-group">
                          <label>Add Fund to Compare</label>
                          <div className="search-with-clear">
                            <input
                              type="text"
                              value={compareQuery}
                              onChange={(e) => { setCompareQuery(e.target.value); setShowCompareSearch(true); }}
                              placeholder="Search by scheme code or name"
                              className="search-input"
                            />
                            {compareQuery && (
                              <button
                                type="button"
                                className="clear-btn"
                                onClick={() => setCompareQuery('')}
                                title="Clear"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          {showCompareSearch && compareSearchResults.length > 0 && (
                            <div className="search-dropdown">
                              {compareSearchResults.map((item) => (
                                <button
                                  key={item.scheme_code}
                                  type="button"
                                  className="search-item"
                                  onClick={() => selectSchemeForCompare(item.scheme_code, item.scheme_name)}
                                >
                                  <span>{item.scheme_code}</span>
                                  <small>{item.scheme_name}</small>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
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
                     </>
                   ) : (
                     <>
                       {/* Portfolio Search */}
                       <div className="field-group">
                         <label>Add Mutual Fund to Portfolio</label>
                         <div className="search-with-clear">
                           <input
                             type="text"
                             value={portfolioQuery}
                             onChange={(event) => { setPortfolioQuery(event.target.value); setShowPortfolioSearch(true); }}
                             placeholder="Search by scheme code or name"
                             className="search-input"
                           />
                           {portfolioQuery && (
                             <button
                               type="button"
                               className="clear-btn"
                               onClick={() => { setPortfolioQuery(''); setPortfolioSearchResults([]); }}
                               title="Clear"
                             >
                               ✕
                             </button>
                           )}
                         </div>
                         {showPortfolioSearch && portfolioSearchResults.length > 0 && (
                           <div className="search-dropdown">
                             {portfolioSearchResults.map((item) => (
                               <button
                                 key={item.scheme_code}
                                 type="button"
                                 className="search-item"
                                 onClick={() => addFundToPortfolio(item.scheme_code, item.scheme_name)}
                               >
                                 <span>{item.scheme_code}</span>
                                 <small>{item.scheme_name}</small>
                               </button>
                             ))}
                           </div>
                         )}
                       </div>

                       {/* Portfolio Funds List */}
                       {portfolioFunds.length > 0 && (
                         <div className="portfolio-list">
                           {portfolioFunds.map((fund, idx) => (
                             <div key={idx} className="portfolio-fund-row">
                               <div className="fund-info">
                                 <strong>{fund.code}</strong>
                                 <small>{fund.name}</small>
                               </div>
                               <div className="fund-alloc">
                                 <label>Amount</label>
                                 <input
                                   type="number"
                                   value={fund.amount}
                                   onChange={(e) => updateFundAmount(idx, e.target.value)}
                                   min="100"
                                   step="100"
                                   placeholder="Amount"
                                 />
                               </div>
                               <button
                                 type="button"
                                 className="btn-remove"
                                 onClick={() => removeFundFromPortfolio(idx)}
                                 title="Remove fund"
                               >
                                 ✕
                               </button>
                             </div>
                           ))}
                         </div>
                       )}

                       <div className="hint-box">
                         <strong>Portfolio Total:</strong> {formatCurrency(portfolioFunds.reduce((sum, f) => sum + Number(f.amount || 0), 0))}
                       </div>

                       {/* Portfolio Investment Type */}
                       <div className="field-group">
                         <label>Investment Type</label>
                         <select value={portfolioInvestmentType} onChange={(e) => setPortfolioInvestmentType(e.target.value)}>
                           <option value="lump-sum">Lump Sum</option>
                           <option value="sip">SIP</option>
                         </select>
                       </div>
                     </>
                   )}

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

                   {analysisMode === 'single' && (
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

            {analysisMode !== 'compare' && backtest && <BacktestResult result={backtest} />}
            {analysisMode === 'compare' && compareResults && compareResults.results && (
              <div className="compare-results-grid">
                {compareResults.results.map((result) => (
                  <BacktestResult key={result.scheme_code} result={result} />
                ))}
              </div>
            )}

                    <div className="button-row">
                      <button className="btn btn-primary" onClick={runAnalysis} disabled={loading}>
                        {loading ? 'Running...' : 
                         analysisMode === 'single' ? 'Run Backtest' :
                         analysisMode === 'portfolio' ? 'Analyze Portfolio' :
                         'Compare Funds'}
                      </button>
                      <button className="btn btn-secondary" onClick={resetForm} disabled={loading}>
                        Reset
                      </button>
                    </div>

                  <div className="hint-box">
                    <strong>Tip:</strong> pick a scheme from autocomplete so the public deployment always sends a valid scheme code.
                  </div>
                </article>

                {analysisMode !== 'compare' && (
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
                )}
            </section>

            {backtest && <BacktestResult result={backtest} />}
            {compareResults && compareResults.results && (
              <div className="compare-results-grid">
                {compareResults.results.map((result) => (
                  <BacktestResult key={result.scheme_code} result={result} />
                ))}
              </div>
            )}
            </div>

            <PopularFundsSidebar />
            </div>
          </div>

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
