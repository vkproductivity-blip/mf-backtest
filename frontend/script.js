// Global variables
let portfolioChart = null;
let returnsChart = null;
let backtestData = null;

// Set default dates
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date();
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    
    document.getElementById('endDate').valueAsDate = today;
    document.getElementById('startDate').valueAsDate = oneYearAgo;

    // Investment type handler
    document.getElementById('investmentType').addEventListener('change', function() {
        const sipGroup = document.getElementById('sipAmountGroup');
        sipGroup.style.display = this.value === 'sip' ? 'block' : 'none';
    });

    // Scheme search
    document.getElementById('schemeCode').addEventListener('input', debounce(searchSchemes, 300));
});

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Search schemes
async function searchSchemes(e) {
    const query = e.target.value;
    const resultsDiv = document.getElementById('schemeResults');

    if (query.length < 2) {
        resultsDiv.style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`/api/schemes/search?q=${encodeURIComponent(query)}`);
        const schemes = await response.json();
        
        if (schemes.length === 0) {
            resultsDiv.innerHTML = '<div class="scheme-option">No schemes found</div>';
        } else {
            resultsDiv.innerHTML = schemes.slice(0, 10).map(s => 
                `<div class="scheme-option" onclick="selectScheme(${s.scheme_code}, '${s.scheme_name}')">${s.scheme_code} - ${s.scheme_name}</div>`
            ).join('');
        }
        resultsDiv.style.display = 'block';
    } catch (error) {
        console.error('Search error:', error);
    }
}

function selectScheme(code, name) {
    document.getElementById('schemeCode').value = code;
    document.getElementById('schemeResults').style.display = 'none';
}

// Run backtest
async function runBacktest() {
    const schemeCode = document.getElementById('schemeCode').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const investmentAmount = parseFloat(document.getElementById('investmentAmount').value);
    const investmentType = document.getElementById('investmentType').value;
    const sipAmount = parseFloat(document.getElementById('sipAmount').value);

    // Validation
    if (!schemeCode || !startDate || !endDate) {
        showError('Please fill in all required fields');
        return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
        showError('Start date must be before end date');
        return;
    }

    if (investmentAmount <= 0) {
        showError('Investment amount must be greater than 0');
        return;
    }

    if (investmentType === 'sip' && sipAmount <= 0) {
        showError('SIP amount must be greater than 0');
        return;
    }

    // Show loading
    document.getElementById('loading').style.display = 'block';
    clearResults();

    try {
        const payload = {
            scheme_code: parseInt(schemeCode),
            start_date: startDate,
            end_date: endDate,
            investment_type: investmentType
        };

        if (investmentType === 'lump-sum') {
            payload.lumpsum_amount = investmentAmount;
        } else {
            payload.sip_amount = sipAmount;
        }

        const response = await fetch('/api/backtest', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Backtest failed');
        }

        backtestData = await response.json();
        displayResults(backtestData);
        showSuccess('Backtest completed successfully!');
    } catch (error) {
        showError(error.message || 'Error running backtest');
        console.error('Backtest error:', error);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// Display results
function displayResults(data) {
    // Update summary metrics
    const totalReturn = data.total_return;
    const totalReturnPct = (totalReturn * 100).toFixed(2);
    const finalValue = data.final_value;
    const profit = finalValue - (data.investment_type === 'lump-sum' ? data.lumpsum_amount : data.total_invested);
    const profitPct = (profit / (data.investment_type === 'lump-sum' ? data.lumpsum_amount : data.total_invested) * 100).toFixed(2);

    document.getElementById('totalReturn').textContent = `₹${formatNumber(profit)}`;
    document.getElementById('totalReturnPct').textContent = `${totalReturnPct}%`;
    document.getElementById('totalReturnPct').className = totalReturn >= 0 ? 'metric-change' : 'metric-change negative';

    document.getElementById('finalValue').textContent = `₹${formatNumber(finalValue)}`;
    document.getElementById('profitLoss').textContent = `${profitPct}%`;
    document.getElementById('profitLoss').className = profit >= 0 ? 'metric-change' : 'metric-change negative';

    document.getElementById('cagr').textContent = `${(data.cagr * 100).toFixed(2)}%`;
    document.getElementById('cagrStatus').textContent = data.cagr >= 0.1 ? 'Strong' : 'Moderate';
    document.getElementById('cagrStatus').className = data.cagr >= 0.1 ? 'metric-change' : 'metric-change';

    document.getElementById('maxDrawdown').textContent = `${(data.max_drawdown * 100).toFixed(2)}%`;

    // Update info
    document.getElementById('schemeName').textContent = data.scheme_name;
    const startDate = new Date(data.start_date).toLocaleDateString();
    const endDate = new Date(data.end_date).toLocaleDateString();
    document.getElementById('period').textContent = `${startDate} to ${endDate}`;

    // Draw charts
    drawPortfolioChart(data.nav_dates, data.portfolio_values);
    drawReturnsChart(data.nav_dates, data.daily_returns);

    // Update tables
    updateStatisticsTable(data);
    updateRiskTable(data);
    updatePerformanceTable(data);
}

// Draw portfolio growth chart
function drawPortfolioChart(dates, values) {
    const ctx = document.getElementById('portfolioChart').getContext('2d');
    
    if (portfolioChart) {
        portfolioChart.destroy();
    }

    portfolioChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            datasets: [{
                label: 'Portfolio Value (₹)',
                data: values.map(v => Math.round(v)),
                borderColor: '#64c8ff',
                backgroundColor: 'rgba(100, 200, 255, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: '#00d4ff',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#e0e0e0' }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleColor: '#64c8ff',
                    bodyColor: '#e0e0e0',
                    borderColor: '#64c8ff',
                    borderWidth: 1,
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: { color: '#888' },
                    grid: { color: 'rgba(100, 200, 255, 0.1)' }
                },
                x: {
                    ticks: { color: '#888' },
                    grid: { color: 'rgba(100, 200, 255, 0.1)' }
                }
            }
        }
    });
}

// Draw returns chart
function drawReturnsChart(dates, returns) {
    const ctx = document.getElementById('returnsChart').getContext('2d');
    
    if (returnsChart) {
        returnsChart.destroy();
    }

    const colors = returns.map(r => r >= 0 ? '#00d4ff' : '#ff6b6b');

    returnsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            datasets: [{
                label: 'Daily Return (%)',
                data: returns.map(r => (r * 100).toFixed(3)),
                backgroundColor: colors,
                borderRadius: 3,
                borderWidth: 0,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'x',
            plugins: {
                legend: {
                    labels: { color: '#e0e0e0' }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleColor: '#64c8ff',
                    bodyColor: '#e0e0e0',
                    borderColor: '#64c8ff',
                    borderWidth: 1,
                }
            },
            scales: {
                y: {
                    ticks: { color: '#888' },
                    grid: { color: 'rgba(100, 200, 255, 0.1)' }
                },
                x: {
                    ticks: { color: '#888' },
                    grid: { color: 'rgba(100, 200, 255, 0.1)' }
                }
            }
        }
    });
}

// Update statistics table
function updateStatisticsTable(data) {
    const tbody = document.getElementById('statisticsTable');
    const days = Math.round((new Date(data.end_date) - new Date(data.start_date)) / (1000 * 60 * 60 * 24));
    const years = (days / 365).toFixed(2);

    tbody.innerHTML = `
        <tr>
            <td>Total Investment</td>
            <td style="color: #64c8ff;">₹${formatNumber(data.total_invested)}</td>
        </tr>
        <tr>
            <td>Final Value</td>
            <td style="color: #64c8ff;">₹${formatNumber(data.final_value)}</td>
        </tr>
        <tr>
            <td>Total Profit/Loss</td>
            <td style="color: ${data.final_value >= data.total_invested ? '#00d4ff' : '#ff6b6b'};">₹${formatNumber(data.final_value - data.total_invested)}</td>
        </tr>
        <tr>
            <td>Total Return %</td>
            <td style="color: ${data.total_return >= 0 ? '#00d4ff' : '#ff6b6b'};">${(data.total_return * 100).toFixed(2)}%</td>
        </tr>
        <tr>
            <td>Period (Days)</td>
            <td style="color: #64c8ff;">${days}</td>
        </tr>
        <tr>
            <td>Period (Years)</td>
            <td style="color: #64c8ff;">${years}</td>
        </tr>
    `;
}

// Update risk metrics table
function updateRiskTable(data) {
    const tbody = document.getElementById('riskTable');
    const volatility = (data.volatility * 100).toFixed(2);
    const sharpeRatio = data.sharpe_ratio ? data.sharpe_ratio.toFixed(2) : 'N/A';

    tbody.innerHTML = `
        <tr>
            <td>Max Drawdown</td>
            <td style="color: #ff9999;">${(data.max_drawdown * 100).toFixed(2)}%</td>
        </tr>
        <tr>
            <td>Volatility (Std Dev)</td>
            <td style="color: #ffb366;">${volatility}%</td>
        </tr>
        <tr>
            <td>Sharpe Ratio</td>
            <td style="color: ${sharpeRatio > 1 ? '#00d4ff' : '#ffb366'};">${sharpeRatio}</td>
        </tr>
        <tr>
            <td>Best Day Return</td>
            <td style="color: #00d4ff;">+${(data.best_day_return * 100).toFixed(3)}%</td>
        </tr>
        <tr>
            <td>Worst Day Return</td>
            <td style="color: #ff6b6b;">-${Math.abs(data.worst_day_return * 100).toFixed(3)}%</td>
        </tr>
        <tr>
            <td>Positive Days</td>
            <td style="color: #00d4ff;">${data.positive_days}</td>
        </tr>
    `;
}

// Update performance table
function updatePerformanceTable(data) {
    const tbody = document.getElementById('performanceTable');

    tbody.innerHTML = `
        <tr>
            <td>CAGR</td>
            <td style="color: #64c8ff;">${(data.cagr * 100).toFixed(2)}%</td>
        </tr>
        <tr>
            <td>Average Daily Return</td>
            <td style="color: #00d4ff;">${(data.avg_daily_return * 100).toFixed(4)}%</td>
        </tr>
        <tr>
            <td>Win Rate</td>
            <td style="color: #00d4ff;">${((data.positive_days / data.total_trading_days) * 100).toFixed(1)}%</td>
        </tr>
        <tr>
            <td>Total Trading Days</td>
            <td style="color: #64c8ff;">${data.total_trading_days}</td>
        </tr>
        <tr>
            <td>Investment Type</td>
            <td style="color: #64c8ff;">${data.investment_type === 'lump-sum' ? 'Lump Sum' : 'SIP'}</td>
        </tr>
    `;
}

// Clear results
function clearResults() {
    document.getElementById('totalReturn').textContent = '-';
    document.getElementById('totalReturnPct').textContent = '-';
    document.getElementById('finalValue').textContent = '-';
    document.getElementById('profitLoss').textContent = '-';
    document.getElementById('cagr').textContent = '-';
    document.getElementById('cagrStatus').textContent = '-';
    document.getElementById('maxDrawdown').textContent = '-';
    document.getElementById('schemeName').textContent = '-';
    document.getElementById('period').textContent = '-';
}

// Reset form
function resetForm() {
    document.getElementById('schemeCode').value = '';
    document.getElementById('investmentAmount').value = '100000';
    document.getElementById('sipAmount').value = '5000';
    document.getElementById('investmentType').value = 'lump-sum';
    document.getElementById('sipAmountGroup').style.display = 'none';
    clearResults();
}

// Switch tabs
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// Helper functions
function formatNumber(num) {
    return num.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => errorDiv.style.display = 'none', 5000);
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => successDiv.style.display = 'none', 5000);
}

// Close scheme results when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('#schemeCode') && !e.target.closest('#schemeResults')) {
        document.getElementById('schemeResults').style.display = 'none';
    }
});
