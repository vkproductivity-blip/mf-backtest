import { useState } from 'react';

export default function PopularFundsSidebar() {
  const [funds] = useState([
    {
      scheme_code: 100035,
      scheme_name: 'HDFC Top 100 Fund',
      growth_1yr: 18.5,
    },
    {
      scheme_code: 100089,
      scheme_name: 'ICICI Prudential Bluechip',
      growth_1yr: 22.1,
    },
    {
      scheme_code: 100032,
      scheme_name: 'Axis Bluechip Fund',
      growth_1yr: 19.7,
    },
    {
      scheme_code: 100019,
      scheme_name: 'Reliance Growth Fund',
      growth_1yr: 21.3,
    },
    {
      scheme_code: 100033,
      scheme_name: 'Kotak Standard Multicap',
      growth_1yr: 20.8,
    },
  ]);

  return (
    <aside className="popular-funds-sidebar">
      <h3 className="sidebar-title">Popular Funds</h3>
      <div className="popular-funds">
        {funds.map((fund) => (
          <div key={fund.scheme_code} className="fund-card">
            <div className="fund-code">{fund.scheme_code}</div>
            <div className="fund-name">{fund.scheme_name}</div>
            <div className={`fund-return ${fund.growth_1yr >= 0 ? 'positive' : 'negative'}`}>
              {fund.growth_1yr >= 0 ? '+' : ''}
              {fund.growth_1yr.toFixed(1)}%
            </div>
            <div className="fund-period">1-Year Growth</div>
          </div>
        ))}
      </div>
    </aside>
  );
}
