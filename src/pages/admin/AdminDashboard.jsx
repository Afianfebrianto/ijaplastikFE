import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

export default function AdminDashboard(){
  const [summary, setSummary] = useState(null)

  useEffect(()=>{
    axios.get('/dashboard/summary').then(r=>{
      // pastikan hanya ambil tanggal (YYYY-MM-DD)
      const daily = (r.data.daily_sales || []).map(d => ({
        ...d,
        date: d.date ? d.date.substring(0,10) : d.date
      }))
      setSummary({ ...r.data, daily_sales: daily })
    })
  },[])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Admin Dashboard</h1>
      {!summary ? <div>Loading...</div> :
        <div className="grid md:grid-cols-3 gap-4">
          {/* Hari ini */}
          <div className="card">
            <div className="text-sm text-gray-500">Transaksi Hari Ini</div>
            <div className="text-2xl font-bold">{summary?.today?.trx || 0}</div>
            <div className="text-gray-500">
              Omzet: {Number(summary?.today?.omzet||0).toLocaleString()}
            </div>
          </div>

          {/* Stok menipis */}
          <div className="card md:col-span-2">
            <div className="text-sm text-gray-500 mb-2">Produk Stok Menipis</div>
            <div className="space-y-1">
              {summary?.low_stock?.map(p=>(
                <div key={p.id} className="flex justify-between border-b py-1">
                  <span>{p.name}</span>
                  <span className="font-medium">{p.stock_units}</span>
                </div>
              ))}
              {!summary?.low_stock?.length && <div className="text-sm text-gray-500">Aman</div>}
            </div>
          </div>

          {/* Top produk */}
          <div className="card md:col-span-3">
            <div className="text-sm text-gray-500 mb-2">Top Produk (Unit Terjual)</div>
            <div className="grid md:grid-cols-3 gap-2">
              {summary?.top_products?.map((p)=>(
                <div key={p.id} className="border rounded p-2">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-gray-500">Units: {p.units_sold}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Statistik omzet harian */}
          <div className="card md:col-span-3">
            <div className="text-sm text-gray-500 mb-2">Statistik Omzet Harian</div>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={summary?.daily_sales || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value)=> new Intl.NumberFormat().format(value)}
                    labelFormatter={(label)=> `Tanggal: ${label}`}
                  />
                  <Bar dataKey="omzet" fill="#4f46e5" barSize={20} /> 
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      }
    </div>
  )
}
