import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function ReceiveGRN(){
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('') // default: Semua
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const params = { search, page, limit }
      if (status) params.status = status // kirim status hanya jika dipilih
      const r = await axios.get('/purchase', { params })
      setRows(r.data.data || [])
      setTotal(r.data.total || 0)
    } finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [page]) // awal & saat pindah halaman
  const submitFilter = async (e) => { e?.preventDefault?.(); setPage(1); await load() }

  const pages = useMemo(()=> Math.max(1, Math.ceil(total/limit)), [total, limit])

  const goAction = (po) => {
  // Halaman detail + receive share komponen: /admin/purchase/:id/receive
  if (po.status === 'received') {
    // mode detail (opsional via query string)
    nav(`/admin/purchase/${po.id}/receive?view=detail`);
  } else {
    nav(`/admin/purchase/${po.id}/receive`);
  }
 };

  const actionLabel = (po) => (po.status === 'received' ? 'Detail' : 'Receive')

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Receive GRN — Pilih PO</h1>

      <form onSubmit={submitFilter} className="card grid md:grid-cols-4 gap-2">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Search (Kode atau Nama Supplier)</label>
          <input
            className="input"
            placeholder="cth: PO-2025 atau Sumber Bahan"
            value={search}
            onChange={e=>setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select className="input" value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="">Semua</option>
            <option value="sent">Sent</option>
            <option value="confirmed">Confirmed</option>
            <option value="received">Received</option>
          </select>
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Loading…' : 'Apply'}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Kode</th>
              <th>Supplier</th>
              <th>Status</th>
              <th>Items</th>
              <th>Tanggal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
  {rows.map(po => (
    <tr key={po.id} className="border-b">
      <td className="py-2 font-medium">{po.code}</td>
      <td>{po.supplier_name}</td>
      <td className="uppercase text-gray-600">{po.status}</td>
      <td>{po.item_count}</td>
      <td>{new Date(po.created_at).toLocaleString()}</td>
      <td>
        {/* Jangan tampilkan tombol kalau masih draft */}
        {po.status !== 'sent' && (
          <button
            className="text-blue-600 hover:underline"
            onClick={()=> goAction(po)}
            title={actionLabel(po)}
          >
            {actionLabel(po)}
          </button>
        )}
      </td>
    </tr>
  ))}
  {!rows.length && (
    <tr>
      <td className="py-4 text-gray-500" colSpan={6}>Tidak ada data</td>
    </tr>
  )}
</tbody>

        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Total: {total}</div>
        <div className="flex gap-2">
          <button className="px-3 py-1 border rounded" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Prev</button>
          <div className="px-3 py-1 border rounded">Page {page} / {pages}</div>
          <button className="px-3 py-1 border rounded" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>Next</button>
        </div>
      </div>
    </div>
  )
}
