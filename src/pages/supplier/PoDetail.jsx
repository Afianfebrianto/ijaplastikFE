import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function PoDetail(){
  const { id } = useParams()
  const nav = useNavigate()
  const [po, setPo] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const r = await axios.get(`/purchase/${id}`)
      setPo(r.data.po || r.data.data?.po || null)
      setItems(r.data.items || [])
    } finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [id])

  const total = useMemo(() =>
    items.reduce((s, it)=> s + Number(it.price_per_pack||0) * Number(it.qty_pack||0), 0)
  , [items])

  const confirm = async () => {
    if (!window.confirm('Konfirmasi PO ini?')) return
    await axios.post(`/purchase/${id}/confirm`)
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">PO Detail</h1>
        <button className="px-3 py-1 border rounded" onClick={()=>nav(-1)}>Kembali</button>
      </div>

      {loading ? <div>Loading…</div> : !po ? <div>PO tidak ditemukan</div> : (
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
            <div className="font-medium mb-2">Items</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Produk</th>
                    <th>Qty Pack</th>
                    <th>Harga / Pack</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => (
                    <tr key={it.id} className="border-b">
                      <td className="py-2">{it.product_name}</td>
                      <td>{it.qty_pack}</td>
                      <td>{Number(it.price_per_pack).toLocaleString()}</td>
                      <td>{(Number(it.price_per_pack)*Number(it.qty_pack)).toLocaleString()}</td>
                    </tr>
                  ))}
                  {!items.length && <tr><td colSpan={4} className="py-3 text-gray-500">Tidak ada item</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="text-right mt-3 font-semibold">Grand Total: {total.toLocaleString()}</div>
          </div>

          {(po.status==='sent' || po.status==='draft') && (
            <button className="btn-primary" onClick={confirm}>Confirm PO</button>
          )}
        </>
      )}
    </div>
  )
}
