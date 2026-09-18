import { useEffect, useState, useMemo } from 'react';
import { getAnalytics } from '../api/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface CategoryData {
  name: string;
  count: number;
}

interface DecisionData {
  name: string;
  count: number;
}

interface AnalyticsData {
  total_materials: number;
  potential_duplicates: number;
  harmonized_identities: number;
  pending_reviews: number;
  no_match_count: number;
  match_rate: number;
  harmonization_rate: number;
  by_category: CategoryData[];
  by_decision: DecisionData[];
  insights: string[];
}

// Refined, muted semantic colors (not presentation-bright)
const DECISION_CONFIG: Record<string, { label: string; color: string; order: number }> = {
  match: { label: 'MATCH', color: '#16856F', order: 1 },
  review: { label: 'REVIEW', color: '#B47A24', order: 2 },
  'no match': { label: 'NO MATCH', color: '#B64A4A', order: 3 },
  no_match: { label: 'NO MATCH', color: '#B64A4A', order: 3 },
};

function CategoryTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="analytics-chart-tooltip">
        <div className="analytics-tooltip-label">{item.name}</div>
        <div className="analytics-tooltip-val">
          <strong>{item.count}</strong> materials
        </div>
      </div>
    );
  }
  return null;
}

function DecisionTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="analytics-chart-tooltip">
        <div className="analytics-tooltip-label" style={{ color: item.color }}>
          {item.label}
        </div>
        <div className="analytics-tooltip-val">
          <strong>{item.count}</strong> records
          {item.pct !== undefined && <span className="analytics-tooltip-sub"> ({item.pct}%)</span>}
        </div>
      </div>
    );
  }
  return null;
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Ensure navigation starts at top of page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let isMounted = true;
    getAnalytics()
      .then(res => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Sorted categories descending for clean visual hierarchy
  const sortedCategories = useMemo(() => {
    if (!data?.by_category) return [];
    return [...data.by_category].sort((a, b) => b.count - a.count);
  }, [data]);

  // Structured decision metrics with muted status colors
  const { decisionList, matchCount, reviewCount, noMatchCount } = useMemo(() => {
    if (!data) {
      return { decisionList: [], matchCount: 0, reviewCount: 0, noMatchCount: 0 };
    }

    let m = 0;
    let r = 0;
    let nm = 0;

    const list = (data.by_decision || []).map(d => {
      const key = d.name.toLowerCase().trim();
      const conf = DECISION_CONFIG[key] || {
        label: d.name.toUpperCase(),
        color: '#56615C',
        order: 99,
      };

      if (key === 'match') m = d.count;
      else if (key === 'review') r = d.count;
      else if (key.includes('no')) nm = d.count;

      return {
        key,
        name: d.name,
        label: conf.label,
        count: d.count,
        color: conf.color,
        order: conf.order,
      };
    });

    if (m === 0 && data.potential_duplicates) m = data.potential_duplicates;
    if (r === 0 && data.pending_reviews) r = data.pending_reviews;
    if (nm === 0 && data.no_match_count) nm = data.no_match_count;

    list.sort((a, b) => a.order - b.order);

    const total = list.reduce((acc, curr) => acc + curr.count, 0);

    const withPct = list.map(item => ({
      ...item,
      pct: total > 0 ? Math.round((item.count / total) * 100) : 0,
    }));

    return {
      decisionList: withPct,
      matchCount: m,
      reviewCount: r,
      noMatchCount: nm,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="analytics-page">
        <header className="analytics-header">
          <div className="skel" style={{ width: 220, height: 38, marginBottom: 8, borderRadius: 4 }} />
          <div className="skel" style={{ width: 480, height: 18, borderRadius: 4 }} />
        </header>
        <div className="skel" style={{ height: 44, marginBottom: 26, borderRadius: 6 }} />
        <div className="analytics-grid">
          <div className="skel" style={{ height: 340, borderRadius: 8 }} />
          <div className="skel" style={{ height: 340, borderRadius: 8 }} />
        </div>
        <div className="skel" style={{ height: 210, marginTop: 30, borderRadius: 8 }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="analytics-page">
        <header className="analytics-header">
          <h1 className="analytics-title">ANALYTICS</h1>
          <p className="analytics-subtitle">
            System-level insights into material records, matching decisions, and harmonization activity.
          </p>
        </header>
        <div className="analytics-error-card">
          <div className="analytics-error-title">Unable to Load Analytics</div>
          <p className="analytics-error-desc">
            Failed to retrieve live metrics from the MaterialDNA backend service.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      {/* ── Page Header (Left Aligned, Full Breathing Space) ── */}
      <header className="analytics-header">
        <h1 className="analytics-title">ANALYTICS</h1>
        <p className="analytics-subtitle">
          System-level insights into material records, matching decisions, and harmonization activity.
        </p>
      </header>

      {/* ── Top Summary Strip (Quiet, Technical System Status Line) ── */}
      <div className="analytics-summary-strip" aria-label="System Metrics Status">
        <div className="analytics-summary-item">
          <span className="analytics-summary-label">TOTAL MATERIALS</span>
          <span className="analytics-summary-value">{data.total_materials}</span>
        </div>
        <span className="analytics-summary-sep" aria-hidden="true">·</span>
        <div className="analytics-summary-item">
          <span className="analytics-summary-label">MATCHED</span>
          <span className="analytics-summary-value">{matchCount}</span>
        </div>
        <span className="analytics-summary-sep" aria-hidden="true">·</span>
        <div className="analytics-summary-item">
          <span className="analytics-summary-label">REVIEW</span>
          <span className="analytics-summary-value">{reviewCount}</span>
        </div>
        <span className="analytics-summary-sep" aria-hidden="true">·</span>
        <div className="analytics-summary-item">
          <span className="analytics-summary-label">NO MATCH</span>
          <span className="analytics-summary-value">{noMatchCount}</span>
        </div>
      </div>

      {/* ── Main Charts Area: 2-Column Equal Weight Layout ── */}
      <div className="analytics-grid">
        {/* Chart 1: Materials by Category */}
        <section className="analytics-card" aria-labelledby="chart-category-title">
          <header className="analytics-card-header">
            <h2 id="chart-category-title" className="analytics-card-title">
              Materials by Category
            </h2>
          </header>
          <div className="analytics-card-body">
            {sortedCategories.length > 0 ? (
              <div className="analytics-chart-wrap">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={sortedCategories}
                    layout="vertical"
                    margin={{ top: 4, right: 20, left: 10, bottom: 4 }}
                  >
                    <CartesianGrid horizontal={false} stroke="#EFF2F0" strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      tick={{ fill: '#7A8580', fontSize: 11, fontFamily: 'var(--mono)' }}
                      axisLine={{ stroke: '#D7DDD9' }}
                      tickLine={{ stroke: '#D7DDD9' }}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fill: '#17201D', fontSize: 12, fontFamily: 'var(--sans)' }}
                      axisLine={false}
                      tickLine={false}
                      width={105}
                    />
                    <Tooltip
                      content={<CategoryTooltip />}
                      cursor={{ fill: 'rgba(22, 133, 111, 0.04)' }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#16856F"
                      radius={[0, 3, 3, 0]}
                      barSize={14}
                      isAnimationActive={true}
                      animationDuration={300}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="analytics-chart-empty">No category data available</div>
            )}
          </div>
        </section>

        {/* Chart 2: Match Decisions */}
        <section className="analytics-card" aria-labelledby="chart-decisions-title">
          <header className="analytics-card-header">
            <h2 id="chart-decisions-title" className="analytics-card-title">
              Match Decisions
            </h2>
          </header>
          <div className="analytics-card-body">
            {decisionList.length > 0 ? (
              <div className="analytics-donut-container">
                <div className="analytics-donut-chart">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={decisionList}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={84}
                        paddingAngle={2.5}
                        stroke="#FFFFFF"
                        strokeWidth={2}
                        isAnimationActive={true}
                        animationDuration={300}
                        animationEasing="ease-out"
                      >
                        {decisionList.map(item => (
                          <Cell key={item.key} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<DecisionTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Refined Legend with subtle typography and muted semantic dots */}
                <div className="analytics-donut-legend" role="list">
                  {decisionList.map(item => (
                    <div key={item.key} className="analytics-legend-row" role="listitem">
                      <div className="analytics-legend-left">
                        <span
                          className="analytics-legend-indicator"
                          style={{ backgroundColor: item.color }}
                          aria-hidden="true"
                        />
                        <span className="analytics-legend-label">{item.label}</span>
                      </div>
                      <div className="analytics-legend-right">
                        <span className="analytics-legend-count">{item.count}</span>
                        {item.pct !== undefined && (
                          <span className="analytics-legend-pct">({item.pct}%)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="analytics-chart-empty">No match decision data available</div>
            )}
          </div>
        </section>
      </div>

      {/* ── System Insights Section (Clean Engineering Intelligence Feed) ── */}
      {data.insights && data.insights.length > 0 && (
        <section className="analytics-card analytics-card--insights" aria-labelledby="system-insights-title">
          <header className="analytics-card-header">
            <h2 id="system-insights-title" className="analytics-card-title">
              SYSTEM INSIGHTS
            </h2>
          </header>
          <div className="analytics-insights-list" role="list">
            {data.insights.map((insight: string, idx: number) => {
              const numStr = String(idx + 1).padStart(2, '0');
              return (
                <div key={idx} className="analytics-insight-row" role="listitem">
                  <span className="analytics-insight-num">{numStr}</span>
                  <p className="analytics-insight-text">{insight}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
