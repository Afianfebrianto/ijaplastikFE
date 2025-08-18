
import { useEffect, useState } from 'react'
import axios from 'axios'

export default function AdminDashboard(){
  const [summary, setSummary] = useState(null)
  useEffect(()=>{ axios.get('/dashboard/summary').then(r=>setSummary(r.data)) },[])
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Admin Dashboard</h1>
      {!summary ? <div>Loading...</div> :
        <div className="grid md:grid-cols-3 gap-4">
          <div className="card">
            <div className="text-sm text-gray-500">Transaksi Hari Ini</div>
            <div className="text-2xl font-bold">{summary?.today?.trx || 0}</div>
            <div className="text-gray-500">Omzet: {Number(summary?.today?.omzet||0).toLocaleString()}</div>
          </div>
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
        </div>
      }
    </div>
  )
}
