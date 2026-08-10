import React, { useState, useMemo } from 'react';
import { Donation, PaymentMethod, DonationItem } from '../types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  CreditCard,
  Award,
  BarChart2,
  PieChart as PieIcon,
  Users,
  Sparkles,
} from 'lucide-react';

interface DonationAnalyticsProps {
  donations: Donation[];
  paymentMethods: PaymentMethod[];
  donationItems: DonationItem[];
}

type Timeframe = 'daily' | 'weekly' | 'monthly';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#3B82F6', '#14B8A6'];

export const DonationAnalytics: React.FC<DonationAnalyticsProps> = ({
  donations,
  paymentMethods,
  donationItems,
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('daily');
  const [statusFilter, setStatusFilter] = useState<'APPROVED' | 'ALL'>('APPROVED');

  // Filtered donations based on status selection
  const filteredDonations = useMemo(() => {
    if (statusFilter === 'APPROVED') {
      return donations.filter((d) => d.status === 'APPROVED');
    }
    return donations;
  }, [donations, statusFilter]);

  // Overall metrics calculation
  const metrics = useMemo(() => {
    const approved = donations.filter((d) => d.status === 'APPROVED');
    const totalAmount = approved.reduce((sum, d) => sum + (d.amount || 0), 0);
    const pendingCount = donations.filter((d) => d.status === 'PENDING').length;
    const count = approved.length;
    const avgAmount = count > 0 ? Math.round(totalAmount / count) : 0;
    const approvalRate =
      donations.length > 0
        ? Math.round((approved.length / donations.length) * 100)
        : 0;

    return {
      totalAmount,
      totalCount: donations.length,
      approvedCount: count,
      pendingCount,
      avgAmount,
      approvalRate,
    };
  }, [donations]);

  // Generate Time Series Data based on timeframe
  const timeSeriesData = useMemo(() => {
    const list = filteredDonations;
    const map: Record<string, { dateLabel: string; revenue: number; count: number; timestamp: number }> = {};

    // Generate fallback baseline buckets if array is small or empty so chart always looks great
    const now = new Date();

    if (timeframe === 'daily') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        map[key] = { dateLabel: label, revenue: 0, count: 0, timestamp: d.getTime() };
      }
    } else if (timeframe === 'weekly') {
      // Last 8 weeks
      for (let i = 7; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i * 7);
        const weekNum = Math.ceil(d.getDate() / 7);
        const label = `W${weekNum} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
        const key = `${d.getFullYear()}-W${Math.ceil((d.getDate() + d.getDay()) / 7)}`;
        map[key] = { dateLabel: label, revenue: 0, count: 0, timestamp: d.getTime() };
      }
    } else {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        map[key] = { dateLabel: label, revenue: 0, count: 0, timestamp: d.getTime() };
      }
    }

    // Populate actual data
    list.forEach((d) => {
      const date = new Date(d.createdAt);
      if (isNaN(date.getTime())) return;

      let key = '';
      let dateLabel = '';

      if (timeframe === 'daily') {
        key = date.toISOString().split('T')[0];
        dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (timeframe === 'weekly') {
        const weekNum = Math.ceil(date.getDate() / 7);
        key = `${date.getFullYear()}-W${weekNum}`;
        dateLabel = `W${weekNum} ${date.toLocaleDateString('en-US', { month: 'short' })}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        dateLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }

      if (!map[key]) {
        map[key] = { dateLabel, revenue: 0, count: 0, timestamp: date.getTime() };
      }

      map[key].revenue += d.amount || 0;
      map[key].count += 1;
    });

    return Object.values(map).sort((a, b) => a.timestamp - b.timestamp);
  }, [filteredDonations, timeframe]);

  // Payment method breakdown
  const paymentMethodData = useMemo(() => {
    const counts: Record<string, number> = {};
    const methodNames: Record<string, string> = {};

    paymentMethods.forEach((pm) => {
      methodNames[pm.id] = pm.name;
    });

    donations
      .filter((d) => d.status === 'APPROVED')
      .forEach((d) => {
        const name = d.paymentMethodName || methodNames[d.paymentMethodId] || 'KPay / Other';
        counts[name] = (counts[name] || 0) + (d.amount || 0);
      });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [donations, paymentMethods]);

  // Popular reward items breakdown
  const rewardItemData = useMemo(() => {
    const counts: Record<string, { count: number; revenue: number }> = {};

    donations
      .filter((d) => d.status === 'APPROVED')
      .forEach((d) => {
        const itemName = d.donationItemName || 'General Donation';
        if (!counts[itemName]) {
          counts[itemName] = { count: 0, revenue: 0 };
        }
        counts[itemName].count += 1;
        counts[itemName].revenue += d.amount || 0;
      });

    return Object.entries(counts)
      .map(([name, data]) => ({
        name,
        count: data.count,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [donations]);

  // Top Donors Leaderboard
  const topDonors = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number }> = {};

    donations
      .filter((d) => d.status === 'APPROVED')
      .forEach((d) => {
        const name = d.donorName?.trim() || 'Anonymous Supporter';
        if (!map[name]) {
          map[name] = { name, total: 0, count: 0 };
        }
        map[name].total += d.amount || 0;
        map[name].count += 1;
      });

    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [donations]);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <TrendingUp className="w-64 h-64 text-indigo-400" />
        </div>

        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-indigo-500/20 border border-indigo-500/40 rounded-xl text-indigo-300">
                <BarChart2 className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Donation Analytics & Revenue Charts
                </h2>
                <p className="text-slate-700 dark:text-slate-300 text-xs">
                  Real-time visualization of stream donations, revenue trends, payment methods & top supporters
                </p>
              </div>
            </div>

            {/* Status Filter Toggle */}
            <div className="flex items-center bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 p-1 rounded-xl">
              <button
                onClick={() => setStatusFilter('APPROVED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'APPROVED'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approved Only</span>
              </button>
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-indigo-600 text-slate-900 dark:text-white shadow'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>All Statuses</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Total Approved Revenue */}
        <div className="bg-white dark:bg-[#1E293B] border border-emerald-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/50 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Approved Revenue
            </span>
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {metrics.totalAmount.toLocaleString()} <span className="text-xs font-bold text-emerald-400">MMK</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>{metrics.approvedCount} successful transactions</span>
          </p>
        </div>

        {/* Total Donations Count */}
        <div className="bg-white dark:bg-[#1E293B] border border-indigo-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-indigo-500/50 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Submissions
            </span>
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {metrics.totalCount} <span className="text-xs font-bold text-indigo-400">donations</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>{metrics.pendingCount} pending review</span>
          </p>
        </div>

        {/* Average Donation */}
        <div className="bg-white dark:bg-[#1E293B] border border-purple-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-purple-500/50 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Average Donation
            </span>
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {metrics.avgAmount.toLocaleString()} <span className="text-xs font-bold text-purple-400">MMK</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Per approved donor submission
          </p>
        </div>

        {/* Approval Rate */}
        <div className="bg-white dark:bg-[#1E293B] border border-amber-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/50 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Approval Rate
            </span>
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {metrics.approvalRate}%
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Verified by Admin / Telegram Bot
          </p>
        </div>
      </div>

      {/* MAIN CHART: Revenue Over Time */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <span>Donation Revenue Trend</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Visualizing total income generated across selected timeframe</p>
          </div>

          {/* Timeframe Selector Buttons */}
          <div className="flex items-center bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setTimeframe('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                timeframe === 'daily'
                  ? 'bg-indigo-600 text-slate-900 dark:text-white shadow'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Daily</span>
            </button>
            <button
              onClick={() => setTimeframe('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                timeframe === 'weekly'
                  ? 'bg-indigo-600 text-slate-900 dark:text-white shadow'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Weekly</span>
            </button>
            <button
              onClick={() => setTimeframe('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                timeframe === 'monthly'
                  ? 'bg-indigo-600 text-slate-900 dark:text-white shadow'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span>Monthly</span>
            </button>
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="w-full h-[320px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeSeriesData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis
                dataKey="dateLabel"
                stroke="#94A3B8"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="#94A3B8"
                fontSize={12}
                tickLine={false}
                tickFormatter={(val) => `${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#475569',
                  borderRadius: '0.75rem',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                  color: '#fff',
                  fontSize: '12px',
                }}
                formatter={(value: any, name: string) => [
                  name === 'revenue' ? `${Number(value).toLocaleString()} MMK` : value,
                  name === 'revenue' ? 'Revenue (MMK)' : 'Donation Count',
                ]}
              />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue (MMK)"
                stroke="#6366F1"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECONDARY BREAKDOWN CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Distribution (Pie Chart) */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-400" />
              <span>Revenue by Payment Method</span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">KPay, Wave, AYA Pay</span>
          </div>

          <div className="w-full h-[260px] flex items-center justify-center">
            {paymentMethodData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentMethodData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#475569',
                      borderRadius: '0.5rem',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => `${Number(val).toLocaleString()} MMK`}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs">
                No approved payment method data yet
              </div>
            )}
          </div>
        </div>

        {/* Popular Reward Items (Bar Chart) */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Top Reward Item Sales</span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">By Total Revenue</span>
          </div>

          <div className="w-full h-[260px]">
            {rewardItemData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rewardItemData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                  <XAxis type="number" stroke="#94A3B8" fontSize={11} tickFormatter={(val) => `${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} />
                  <YAxis type="category" dataKey="name" stroke="#94A3B8" fontSize={11} width={90} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#475569',
                      borderRadius: '0.5rem',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`${Number(value).toLocaleString()} MMK`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#F59E0B" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs">
                No item sales data yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TOP DONORS LEADERBOARD */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span>Top Donors Leaderboard</span>
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">Stream Community MVPs</span>
        </div>

        {topDonors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {topDonors.map((donor, idx) => (
              <div
                key={idx}
                className="bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/40 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`w-6 h-6 rounded-full font-extrabold text-xs flex items-center justify-center ${
                      idx === 0
                        ? 'bg-amber-500 text-slate-950'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-950'
                        : idx === 2
                        ? 'bg-amber-700 text-slate-900 dark:text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {donor.count} {donor.count === 1 ? 'donation' : 'donations'}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{donor.name}</h4>
                  <p className="text-amber-400 font-extrabold text-xs mt-0.5">
                    {donor.total.toLocaleString()} MMK
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
            No donor leaderboard records yet
          </div>
        )}
      </div>
    </div>
  );
};
