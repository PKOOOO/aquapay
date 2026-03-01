'use client';
import { useState, useEffect, useCallback } from 'react';

interface Order { id: string; order_id: string; dispenser_id: string; phone: string; amount_ml: number; amount_kes: number; status: string; created_at: string; paid_at: string | null; dispensed_at: string | null; }
interface Stats { total_dispensed: number; active_orders: number; total_ml: number; total_revenue: number; }

function formatPrice(c: number): string { return (c / 100).toFixed(2); }
function formatTime(d: string | null): string { if (!d) return '—'; return new Date(d).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }

export default function DashboardPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState<Stats>({ total_dispensed: 0, active_orders: 0, total_ml: 0, total_revenue: 0 });
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchData = useCallback(async () => {
        try { const r = await fetch('/api/aquapay/dashboard'); const j = await r.json(); if (j.success) { setOrders(j.orders || []); setStats(j.stats || {}); setLastUpdated(new Date()); } }
        catch (e) { console.error(e) } finally { setLoading(false) }
    }, []);

    useEffect(() => { fetchData(); const i = setInterval(fetchData, 10000); return () => clearInterval(i) }, [fetchData]);

    return (<>
        <header className="header">
            <div className="header-inner">
                <div className="header-brand">
                    <div className="header-logo">💧</div>
                    <div className="header-text">
                        <h1>AquaPay Smart Water Dispenser</h1>
                        <p>Ngala Memorial Girls — Watamu</p>
                    </div>
                </div>
                <div className="header-badge"><span className="dot"></span>System Online</div>
            </div>
            <div className="header-accent"></div>
        </header>

        <main className="main">
            <div className="stats-grid">
                <div className="stat-card cyan">
                    <div className="stat-icon cyan">🚰</div>
                    <div className="stat-label">Total Dispensed</div>
                    <div className="stat-value">{(Number(stats.total_ml) / 1000).toFixed(1)}L</div>
                    <div className="stat-sub">{stats.total_dispensed} orders completed</div>
                </div>
                <div className="stat-card blue">
                    <div className="stat-icon blue">⏳</div>
                    <div className="stat-label">Active Orders</div>
                    <div className="stat-value">{stats.active_orders}</div>
                    <div className="stat-sub">Pending or paid</div>
                </div>
                <div className="stat-card green">
                    <div className="stat-icon green">💰</div>
                    <div className="stat-label">Total Revenue</div>
                    <div className="stat-value">KES {formatPrice(Number(stats.total_revenue))}</div>
                    <div className="stat-sub">From dispensed orders</div>
                </div>
                <div className="stat-card amber">
                    <div className="stat-icon amber">📊</div>
                    <div className="stat-label">All Orders</div>
                    <div className="stat-value">{orders.length}</div>
                    <div className="stat-sub">Total transactions</div>
                </div>
            </div>

            <div className="table-container">
                <div className="table-header">
                    <h2>Water Orders</h2>
                    <button className="refresh-btn" onClick={() => { setLoading(true); fetchData(); }}>🔄 {loading ? 'Loading...' : 'Refresh'}</button>
                </div>
                {orders.length === 0 ? (
                    <div className="empty-state"><div className="empty-icon">💧</div><p>No orders yet</p><div className="sub">Orders appear here when students buy water</div></div>
                ) : (<>
                    <table><thead><tr><th>Dispenser</th><th>Amount</th><th>Price</th><th>Status</th><th>Phone</th><th>Time</th></tr></thead>
                        <tbody>{orders.map(o => (
                            <tr key={o.id}>
                                <td><span className="amount-badge">🚰 {o.dispenser_id}</span></td>
                                <td><span className="amount-badge">{o.amount_ml}ml</span></td>
                                <td><span className="price-cell">KES {formatPrice(o.amount_kes)}</span></td>
                                <td><span className={`status-badge ${o.status}`}><span className="status-dot"></span>{o.status}</span></td>
                                <td><span className="phone-cell">{o.phone || '—'}</span></td>
                                <td><span className="phone-cell">{formatTime(o.created_at)}</span></td>
                            </tr>
                        ))}</tbody></table>
                    <div className="last-updated">Auto-refreshes every 10s · Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}</div>
                </>)}
            </div>
        </main>
    </>);
}
