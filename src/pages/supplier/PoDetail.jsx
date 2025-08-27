import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function PoDetail(){
  const { id } = useParams()
  const nav = useNavigate()
  const [po, setPo] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await axios.get(`/purchase/${id}`)
      const poData = r.data.po || r.data.data?.po || null
      setPo(poData)
      setItems((r.data.items || []).map(it => ({
        ...it,
        // state lokal editable
        _decision: it.supplier_decision || 'pending',
        _note: it.supplier_note || '',
        _price:
          it.supplier_price_per_pack != null && Number(it.supplier_price_per_pack) > 0
            ? Number(it.supplier_price_per_pack)
            : null
      })))
    } finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [id])

  const isEditable = po && (po.status === 'draft' || po.status === 'sent')

  // semua item sudah diputuskan, dan kalau "send" harganya > 0
  const allResolved = useMemo(() => {
    if (!items.length) return false
    return items.every(it => {
      const dec = it._decision || 'pending'
      if (dec === 'pending') return false
      if (dec === 'send') return Number(it._price) > 0
      return true
    })
  }, [items])

  // total berdasarkan harga supplier untuk item yang "send" (lainnya 0)
  const total = useMemo(() =>
    items.reduce((s, it) => {
      if (it._decision !== 'send') return s
      const price = Number(it._price || 0)
      return s + price * Number(it.qty_pack || 0)
    }, 0)
  , [items])

  // payload konfirmasi: kirim keputusan + harga supplier
  const payloadFromState = () => ({
    decisions: items.map(it => ({
      purchase_item_id: it.id,
      decision: it._decision || 'pending',     // send | nosend | pending
      note: it._note || '',
      supplier_price_per_pack: it._decision === 'send' ? Number(it._price || 0) : null
    }))
  })

  const confirm = async () => {
    if (!allResolved) {
      alert('Selesaikan semua keputusan. Item "Dikirim" wajib mengisi harga modal/pack.')
      return
    }
    if (!window.confirm('Kirim keputusan & konfirmasi PO ini?')) return
    setConfirming(true)
    try {
      await axios.post(`/purchase/${id}/confirm`, payloadFromState())
      await load()
      alert('PO dikonfirmasi & keputusan tersimpan')
    } catch (e) {
      alert(e?.response?.data?.message || 'Gagal konfirmasi PO')
    } finally { setConfirming(false) }
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
                    <th>Harga Supplier / Pack</th>
                    <th>Total</th>
                    <th className="w-40">Keputusan</th>
                    <th className="w-56">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const price = it._decision === 'send' ? Number(it._price || 0) : 0
                    const lineTotal = price * Number(it.qty_pack || 0)

                    return (
                      <tr key={it.id} className="border-b">
                        <td className="py-2">{it.product_name}</td>
                        <td>{it.qty_pack}</td>

                        {/* HARGA SUPPLIER */}
                        <td className="w-48">
                          {isEditable && it._decision === 'send' ? (
                            <input
                              className="input w-full"
                              type="number"
                              min={0}
                              placeholder="Harga modal/pack"
                              value={it._price ?? ''}
                              onChange={e=>{
                                const v=[...items]
                                v[idx]._price = e.target.value === '' ? null : Number(e.target.value)
                                setItems(v)
                              }}
                              onFocus={e=>e.target.select()}
                            />
                          ) : (
                            <span className="text-gray-700">
                              {it._decision === 'send' && it._price != null && Number(it._price) > 0
                                ? Number(it._price).toLocaleString()
                                : '—'}
                            </span>
                          )}
                        </td>

                        <td>{Number(lineTotal).toLocaleString()}</td>

                        <td>
                          {isEditable ? (
                            <select
                              className="input w-full"
                              value={it._decision}
                              onChange={e=>{
                                const v=[...items]
                                v[idx]._decision = e.target.value
                                if (e.target.value !== 'send') v[idx]._price = null // reset harga jika bukan kirim
                                setItems(v)
                              }}
                            >
                              <option value="pending">— pending —</option>
                              <option value="send">Dikirim</option>
                              <option value="nosend">Tidak dikirim</option>
                            </select>
                          ) : (
                            <span className="uppercase text-gray-700">{it.supplier_decision || 'pending'}</span>
                          )}
                        </td>

                        <td>
                          {isEditable ? (
                            <input
                              className="input w-full"
                              placeholder="cth: stok habis"
                              value={it._note}
                              onChange={e=>{
                                const v=[...items]
                                v[idx]._note = e.target.value
                                setItems(v)
                              }}
                              disabled={it._decision !== 'nosend'}
                            />
                          ) : (
                            <span className="text-gray-600">{it.supplier_note || '—'}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {!items.length && <tr><td colSpan={6} className="py-3 text-gray-500">Tidak ada item</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="text-right mt-3 font-semibold">Grand Total: {total.toLocaleString()}</div>
          </div>

          <div className="flex gap-2">
            {(po.status==='sent' || po.status==='draft') && (
              <button
                className={`btn-primary ${!allResolved ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={confirm}
                disabled={!allResolved || confirming}
                title={!allResolved ? 'Masih ada item pending / harga belum diisi' : ''}
              >
                {confirming ? 'Mengirim…' : 'Confirm PO'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
