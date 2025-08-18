import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'

export default function ReceiveGRNDetail(){
  const { id } = useParams()
  const nav = useNavigate()
  const [po, setPo] = useState(null)
  const [items, setItems] = useState([])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    setLoading(true)
    try {
      const r = await axios.get(`/purchase/${id}`)
      const poData = r.data.po || r.data.data?.po
      const poItems = r.data.items || []
      if (!poData) { setError('PO tidak ditemukan'); return }
      setPo(poData)
      setItems(poItems.map(it => ({ ...it, recv_qty_pack: 0 })))
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Gagal memuat PO')
    } finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [id])

  const setRecv = (idx, val) => {
    const v = Math.max(0, Number(val || 0))
    setItems(prev => { const t=[...prev]; t[idx].recv_qty_pack=v; return t })
  }
  const receiveAll = () => setItems(prev => prev.map(it => ({ ...it, recv_qty_pack: Number(it.qty_pack||0) })))
  const clearAll = () => setItems(prev => prev.map(it => ({ ...it, recv_qty_pack: 0 })))

  const summary = useMemo(() => {
    const packs = items.reduce((s, it) => s + Number(it.recv_qty_pack || 0), 0)
    const units = items.reduce((s, it) => s + Number(it.recv_qty_pack || 0) * Number(it.pack_size || 1), 0)
    return { packs, units }
  }, [items])

  const submit = async () => {
    setError('')
    const picked = items.filter(it => Number(it.recv_qty_pack||0)>0)
                         .map(it => ({ product_id: it.product_id, qty_pack: Number(it.recv_qty_pack) }))
    if (!picked.length) { setError('Isi minimal 1 item diterima'); return }
    try {
      setSubmitting(true)
      const r = await axios.post(`/purchase/${id}/receive`, { items: picked, note })
      alert(`GRN OK: ${r.data.grn_id}`)
      nav('/admin/purchase/receive')
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Gagal menyimpan GRN')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Receive GRN — Detail PO</h1>
        <button className="px-3 py-1 border rounded" onClick={()=>nav('/admin/purchase/receive')}>Kembali ke List</button>
      </div>

      {loading ? <div>Loading…</div> : error ? <div className="text-red-600">{error}</div> : (
        <>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="card">
              <div className="text-sm text-gray-500">Kode</div>
              <div className="font-medium">{po.code}</div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-500">Status</div>
              <div className="font-medium uppercase">{po.status}</div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-500">Tanggal</div>
              <div className="font-medium">{new Date(po.created_at).toLocaleString()}</div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Items</div>
              <div className="flex gap-2">
                <button className="px-2 py-1 border rounded" onClick={receiveAll}>Terima Semua</button>
                <button className="px-2 py-1 border rounded" onClick={clearAll}>Kosongkan</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Produk</th>
                    <th>Qty PO (Pack)</th>
                    <th>Pack Size</th>
                    <th>Diterima (Pack)</th>
                    <th>= Units</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const units = Number(it.recv_qty_pack||0) * Number(it.pack_size||1)
                    return (
                      <tr key={it.id} className="border-b">
                        <td className="py-2">
                          <div className="font-medium">{it.product_name}</div>
                          <div className="text-xs text-gray-500">Harga/Pack: {Number(it.price_per_pack).toLocaleString()}</div>
                        </td>
                        <td>{it.qty_pack}</td>
                        <td>{it.pack_size} {it.unit_name}</td>
                        <td className="w-40">
                          <input
                            className="input"
                            type="number"
                            min={0}
                            value={it.recv_qty_pack}
                            onChange={e=>setRecv(idx, e.target.value)}
                          />
                        </td>
                        <td className="w-32">{units.toLocaleString()}</td>
                      </tr>
                    )
                  })}
                  {!items.length && (
                    <tr><td className="py-3 text-gray-500" colSpan={5}>Tidak ada item</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-2 card">
              <label className="block text-sm font-medium mb-1">Catatan (opsional)</label>
              <input
                className="input"
                placeholder="Misal: selisih 1 pack di item X"
                value={note}
                onChange={e=>setNote(e.target.value)}
              />
            </div>
            <div className="card">
              <div className="text-sm text-gray-500">Ringkasan</div>
              <div className="font-medium">Total Pack: {summary.packs.toLocaleString()}</div>
              <div className="font-medium">Total Units: {summary.units.toLocaleString()}</div>
              <button
                className="btn-primary w-full mt-2"
                onClick={submit}
                disabled={submitting || !items.some(it => Number(it.recv_qty_pack) > 0)}
              >
                {submitting ? 'Menyimpan…' : 'Simpan Penerimaan'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
