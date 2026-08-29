import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#eab308'];

export default function BIDashboards() {
  const [activeTab, setActiveTab] = useState<'executive' | 'performance' | 'customer' | 'market'>('executive');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ mps: any[]; reviews: any[]; restaurants: any[] }>({ mps: [], reviews: [], restaurants: [] });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const restsSnap = await getDocs(collection(db, 'restaurants'));
      const restData = restsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const revsSnap = await getDocs(collection(db, 'reviews'));
      const revData = revsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const mpsData = restData.map(r => ({
        restaurant_id: r.id,
        restaurant_name: (r as any).name,
        area: (r as any).area,
        mps: (r as any).mps_score || 0,
        overall_rating: (r as any).taste_score || (r as any).google_rating || 4,
      }));

      setData({
        mps: mpsData || [],
        reviews: revData || [],
        restaurants: restData || [],
      });
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;
  }

  // Derived Metrics
  const totalRestaurants = data.restaurants.length;
  const totalReviews = data.reviews.length;
  const avgRating = totalRestaurants ? (data.mps.reduce((a, c) => a + (c.overall_rating || 0), 0) / totalRestaurants).toFixed(1) : '0';
  const avgPrice = totalRestaurants ? Math.round(data.restaurants.reduce((a, c) => a + (c.approx_price || 0), 0) / totalRestaurants) : 0;
  
  const recommendRate = totalReviews ? Math.round((data.reviews.filter(r => r.would_recommend).length / totalReviews) * 100) : 0;
  const avgCS = totalReviews ? ((data.reviews.reduce((a, c) => a + ((c.sub_ratings?.taste||0) + (c.sub_ratings?.service||0) + (c.sub_ratings?.cleanliness||0))/3, 0) / totalReviews).toFixed(1)) : '0';

  // Area distribution
  const areaCounts = data.restaurants.reduce((acc, r) => {
    acc[r.area] = (acc[r.area] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const areaChartData = Object.keys(areaCounts).map(area => ({ name: area, count: areaCounts[area] }));

  // MPS ranking
  const mpsRanking = [...data.mps].sort((a, b) => b.mps - a.mps).slice(0, 10).map(m => ({
    name: m.restaurant_name, mps: parseFloat(m.mps.toFixed(1))
  }));

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-[var(--border)] pb-2 overflow-x-auto">
        {[
          { id: 'executive', label: 'Executive' },
          { id: 'performance', label: 'Restaurant Performance' },
          { id: 'customer', label: 'Customer Analytics' },
          { id: 'market', label: 'Market Analysis' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap',
              activeTab === t.id ? 'bg-orange-500 text-white' : 'hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)]'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {activeTab === 'executive' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="card p-4 border-t-4 border-t-blue-500">
                <p className="text-xs text-[var(--text-muted)]">Total Restaurants</p>
                <p className="text-2xl font-bold">{totalRestaurants}</p>
              </div>
              <div className="card p-4 border-t-4 border-t-green-500">
                <p className="text-xs text-[var(--text-muted)]">Total Reviews</p>
                <p className="text-2xl font-bold">{totalReviews}</p>
              </div>
              <div className="card p-4 border-t-4 border-t-yellow-500">
                <p className="text-xs text-[var(--text-muted)]">Avg Rating</p>
                <p className="text-2xl font-bold">{avgRating}</p>
              </div>
              <div className="card p-4 border-t-4 border-t-red-500">
                <p className="text-xs text-[var(--text-muted)]">Avg Price</p>
                <p className="text-2xl font-bold">₹{avgPrice}</p>
              </div>
              <div className="card p-4 border-t-4 border-t-purple-500">
                <p className="text-xs text-[var(--text-muted)]">Customer Sat.</p>
                <p className="text-2xl font-bold">{avgCS} / 5</p>
              </div>
              <div className="card p-4 border-t-4 border-t-indigo-500">
                <p className="text-xs text-[var(--text-muted)]">Recommend Rate</p>
                <p className="text-2xl font-bold">{recommendRate}%</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="card p-5">
            <h3 className="font-semibold mb-4">Top 10 by MPS Score</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mpsRanking} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="var(--text-muted)" domain={[0, 10]} />
                  <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={11} width={120} />
                  <RechartsTooltip cursor={{fill: 'var(--surface-secondary)'}} contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }} />
                  <Bar dataKey="mps" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'customer' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="font-semibold mb-4">Would Recommend?</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[
                      { name: 'Yes', value: data.reviews.filter(r => r.would_recommend).length },
                      { name: 'No', value: data.reviews.filter(r => !r.would_recommend).length }
                    ]} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'market' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="font-semibold mb-4">Restaurants per Area</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={areaChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickFormatter={(val) => val.substring(0,8)+'...'} />
                    <YAxis stroke="var(--text-muted)" />
                    <RechartsTooltip cursor={{fill: 'var(--surface-secondary)'}} contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
