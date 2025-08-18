import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'

export default function SupplierDashboard(){
  const [pos, setPos] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const r = await axios.get('/purchase/mine')
      setPos(r.data.data || [])
    } finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [])

  const confirm = async (id) => {
    if (!confirmDialog()) return
    await axios.post(`/purchase/${id}/confirm`)
    await load()
  }

  const confirmDialog = () => window.confirm('Konfirmasi PO ini?')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Supplier Dashboard</h1>
        <button className="px-3 py-2 border rounded" onClick={load}>Refresh</button>
      </div>

      {loading ? <div>Loading…</div> : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Code</th>
                <th>Status</th>
                <th>Items</th>
                <th>Tanggal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pos.map(po => (
                <tr key={po.id} className="border-b">
                  <td className="py-2 font-medium">{po.code}</td>
                  <td><span className="uppercase text-gray-600">{po.status}</span></td>
                  <td>{po.item_count}</td>
                  <td>{new Date(po.created_at).toLocaleString()}</td>
                  <td className="space-x-2">
                    <Link to={`/supplier/po/${po.id}`} className="text-blue-600 hover:underline">Detail</Link>
                    {(po.status==='sent' || po.status==='draft') && (
                      <button onClick={()=>confirm(po.id)} className="text-green-700 hover:underline">
                        Confirm
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!pos.length && (
                <tr><td className="py-4 text-sm text-gray-500" colSpan={5}>Belum ada PO</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
