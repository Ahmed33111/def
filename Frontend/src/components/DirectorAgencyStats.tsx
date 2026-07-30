import React, { useState, useEffect } from 'react';
import { 
  Users, Building2, Activity, TrendingUp, Calendar, 
  ArrowUpRight, ArrowDownRight, Filter, RefreshCcw, CreditCard, DollarSign
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { apiUrl } from '../api';

interface AgencyStats {
  transactionCount: number;
  deposits: number;
  withdrawals: number;
  transfersIn: number;
  transfersOut: number;
  totalAmount: number;
}

interface DirectorAgencyStatsProps {
  onLogout?: () => void;
}

export default function DirectorAgencyStats({ onLogout }: DirectorAgencyStatsProps) {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [stats, setStats] = useState<AgencyStats | null>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const handleAuthFailure = (response: Response) => {
    if (response.status === 401 || response.status === 403) {
      onLogout?.();
      return true;
    }
    return false;
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const credentials = localStorage.getItem('credentials');
      
      // Calculer les dates de début et fin
      const startDate = new Date(selectedDate);
      const endDate = new Date(selectedDate);
      
      if (timeRange === 'week') {
        startDate.setDate(startDate.getDate() - startDate.getDay());
        endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
      } else if (timeRange === 'month') {
        startDate.setDate(1);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
      }
      
      // Ajuster les heures pour couvrir toute la journée
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      // Formater les dates sans le 'Z' à la fin
      const formatDate = (date: Date) => {
        return date.toISOString().slice(0, -1);
      };

      console.log('Fetching stats for period:', {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate)
      });

      const response = await fetch(apiUrl('/api/director/statistics/filtered'), {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: formatDate(startDate),
          endDate: formatDate(endDate)
        })
      });

      if (handleAuthFailure(response)) {
        return;
      }

      if (response.ok) {
        const data = await response.json();
        console.log('Received stats:', data);
        setStats(data);
      } else {
        const errorData = await response.text();
        console.error('Error response:', errorData);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const credentials = localStorage.getItem('credentials');
      const response = await fetch(apiUrl('/api/stats/dashboard'), {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        }
      });
      if (handleAuthFailure(response)) {
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setDashboardStats(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchDashboardStats();
  }, [timeRange, selectedDate]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 3
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Contrôles de période */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex bg-gray-50 rounded-lg p-1">
              <button onClick={() => setTimeRange('day')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timeRange === 'day' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>Jour</button>
              <button onClick={() => setTimeRange('week')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timeRange === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>Semaine</button>
              <button onClick={() => setTimeRange('month')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timeRange === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>Mois</button>
            </div>
            <div className="relative">
              <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
                <input type="date" value={selectedDate.toISOString().split('T')[0]} onChange={(e) => setSelectedDate(new Date(e.target.value))} className="bg-transparent border-0 text-sm font-medium text-gray-600 focus:ring-0 cursor-pointer" />
              </div>
            </div>
          </div>
          <button onClick={fetchStats} className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
            <RefreshCcw className="h-4 w-4" /><span>Actualiser</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
      ) : (
        <>
          {/* Animated KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-100">Solde Agence</p>
                  <p className="text-2xl font-bold mt-1">{formatAmount(dashboardStats?.kpis?.totalBalance ?? stats?.totalAmount ?? 0)}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl"><DollarSign className="h-6 w-6" /></div>
              </div>
              <p className="text-xs text-blue-200 mt-2">Valorisé en TND</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-100">Clients Actifs</p>
                  <p className="text-3xl font-bold mt-1">{dashboardStats?.kpis?.totalClients ?? 0}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl"><Users className="h-6 w-6" /></div>
              </div>
              <p className="text-xs text-emerald-200 mt-2">Clients suivis</p>
            </div>
            <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-violet-100">Cartes Actives</p>
                  <p className="text-3xl font-bold mt-1">{dashboardStats?.kpis?.totalCards ?? 0}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl"><CreditCard className="h-6 w-6" /></div>
              </div>
              <p className="text-xs text-violet-200 mt-2">Cartes non bloquées</p>
            </div>
            <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-100">Équipe</p>
                  <p className="text-3xl font-bold mt-1">{dashboardStats?.kpis?.totalStaff ?? 0}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl"><Building2 className="h-6 w-6" /></div>
              </div>
              <p className="text-xs text-amber-200 mt-2">Caissiers actifs</p>
            </div>
          </div>

          {/* Evolution Chart + Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Évolution des mouvements (30 jours)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardStats?.evolution ?? []}>
                    <defs>
                      <linearGradient id="depGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="witGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => formatAmount(v as number)} />
                    <Area type="monotone" dataKey="deposits" stroke="#10b981" fill="url(#depGrad)" name="Dépôts" />
                    <Area type="monotone" dataKey="withdrawals" stroke="#ef4444" fill="url(#witGrad)" name="Retraits" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Répartition comptes</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={Object.entries(dashboardStats?.accountBreakdown ?? {}).map(([k, v]) => ({ name: k, value: v as number }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map((color, i) => <Cell key={i} fill={color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Agency Comparison + Heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Comparaison agences</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardStats?.agencyComparison ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => formatAmount(v as number)} />
                    <Legend />
                    <Bar dataKey="deposits" fill="#10b981" radius={[4, 4, 0, 0]} name="Dépôts" />
                    <Bar dataKey="withdrawals" fill="#ef4444" radius={[4, 4, 0, 0]} name="Retraits" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Répartition par type</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={Object.entries(dashboardStats?.cardBreakdown ?? {}).map(([k, v]) => ({ name: k, value: v as number }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {['#6366f1', '#ec4899', '#14b8a6', '#f97316'].map((color, i) => <Cell key={i} fill={color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Heatmap */}
          {dashboardStats?.heatmap && dashboardStats.heatmap.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Heatmap d'activité</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="p-1 text-left text-gray-500"></th>
                      {Array.from(new Set(dashboardStats.heatmap.map((d: any) => d.hour))).map((h) => <th key={String(h)} className="p-1 text-center text-gray-500 font-normal">{String(h)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(day => (
                      <tr key={day}>
                        <td className="p-1 text-gray-500 font-medium">{day.slice(0, 3)}</td>
                        {Array.from(new Set(dashboardStats.heatmap.map((d: any) => d.hour))).map((hour) => {
                          const h = String(hour);
                          const cell = dashboardStats.heatmap.find((d: any) => d.day === day && d.hour === h);
                          const val = cell?.value ?? 0;
                          const maxVal = Math.max(...dashboardStats.heatmap.map((d: any) => d.value), 1);
                          const intensity = val / maxVal;
                          return (
                            <td key={h} className="p-0.5">
                              <div className="w-full h-6 rounded-sm transition-all duration-300 hover:scale-110" style={{ backgroundColor: `rgba(59, 130, 246, ${0.05 + intensity * 0.9})` }} title={`${day} ${h}: ${val} transactions`} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 