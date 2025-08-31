import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const fmtDT = (d) => (d ? new Date(d).toLocaleString() : '—')
const fmtMoney = (v) => (Number.isFinite(Number(v)) ? Number(v).toLocaleString() : '—')
const fmtNum = (v) => (Number.isFinite(Number(v)) ? Number(v).toLocaleString() : '—')

export default function PoDetail(){
  const { id } = useParams()
  const nav = useNavigate()
  const [po, setPo] = useState(null)
  const [items, setItems] = useState([])
  const [recvSummaryMap, setRecvSummaryMap] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      // 1) Ambil PO + items
      const r = await axios.get(`/purchase/${id}`)
      const poData = r.data.po || r.data.data?.po || null
      setPo(poData)

      const baseItems = (r.data.items || []).map(it => ({
        ...it,
        _decision: it.supplier_decision || 'pending',
        _note: it.supplier_note || '',
        _price:
          it.supplier_price_per_pack != null && Number(it.supplier_price_per_pack) > 0
            ? Number(it.supplier_price_per_pack)
            : null
      }))
      setItems(baseItems)

      // 2) Kalau sudah RECEIVED, ambil ringkasan receive untuk kolom diterima/selisih/alasan
      if (poData && String(poData.status).toLowerCase() === 'received') {
        try {
          const rd = await axios.get(`/purchase/${id}/receive-detail`)
          const summaries = Array.isArray(rd.data?.summary_items) ? rd.data.summary_items : []
          const map = new Map()
          for (const s of summaries) {
            map.set(Number(s.purchase_item_id), {
              ordered_qty_pack: Number(s.ordered_qty_pack || 0),
              received_qty_pack: Number(s.received_qty_pack || 0),
              remaining_qty_pack: Number(s.remaining_qty_pack || 0), // selisih
              supplier_decision: s.supplier_decision || 'pending',
              supplier_note: s.supplier_note || '',
              supplier_price_per_pack:
                s.supplier_price_per_pack != null ? Number(s.supplier_price_per_pack) : null,
              admin_return_reason: s.admin_return_reason || '—'
            })
          }
          setRecvSummaryMap(map)
        } catch {
          setRecvSummaryMap(new Map())
        }
      } else {
        setRecvSummaryMap(new Map())
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ load() }, [id])

  const isEditable = po && (po.status === 'draft' || po.status === 'sent')
  const showReceiveCols = po && String(po.status).toLowerCase() === 'received'

  const allResolved = useMemo(() => {
    if (!items.length) return false
    return items.every(it => {
      const dec = it._decision || 'pending'
      if (dec === 'pending') return false
      if (dec === 'send') return Number(it._price) > 0
      return true
    })
  }, [items])

  // Total dari keputusan + harga supplier di sisi supplier (sebelum GRN)
  const total = useMemo(() =>
    items.reduce((s, it) => {
      if (it._decision !== 'send') return s
      const price = Number(it._price || 0)
      return s + price * Number(it.qty_pack || 0)
    }, 0)
  , [items])

  const payloadFromState = () => ({
    decisions: items.map(it => ({
      purchase_item_id: it.id,
      decision: it._decision || 'pending',
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

  // Hitung jumlah kolom untuk baris "tidak ada item"
  const baseCols = 6 // Produk, Qty PO, Harga/Pack, Total, Keputusan, Keterangan
  const extraCols = showReceiveCols ? 3 : 0 // Diterima, Selisih, Alasan
  const colSpanEmpty = baseCols + extraCols

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">PO Detail</h1>
        <button className="px-3 py-1 border rounded" onClick={()=>nav(-1)}>Kembali</button>
      </div>

      {loading ? <div>Loading…</div> : !po ? <div>PO tidak ditemukan</div> : (
        <>
          {/* Header */}
          <div className="grid md:grid-cols-4 gap-3">
            <div className="card">
              <div className="text-sm text-gray-500">Kode</div>
              <div className="font-medium">{po.code}</div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-500">Status</div>
              <div className="font-medium uppercase">{po.status}</div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-500">Supplier</div>
              <div className="font-medium">{po.supplier_name || '—'}</div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-500">Waktu</div>
              <div className="text-xs">
                <div>Dibuat: <b>{fmtDT(po.created_at)}</b></div>
                <div>Confirmed: <b>{fmtDT(po.confirmed_at)}</b></div>
                <div>Received: <b>{fmtDT(po.received_at)}</b></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="font-medium mb-2">Items</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Produk</th>
                    <th>Qty PO (Pack)</th>
                    <th>Harga Supplier / Pack</th>
                    <th>Total (Supplier)</th>
                    {showReceiveCols && (
                      <>
                        <th>Diterima Admin (Pack)</th>
                        <th>Selisih (Pack)</th>
                        <th>Alasan Selisih</th>
                      </>
                    )}
                    <th className="w-40">Keputusan</th>
                    <th className="w-56">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const sum = recvSummaryMap.get(Number(it.id))
                    const ordered = Number(sum?.ordered_qty_pack ?? it.qty_pack ?? 0)

                    // Harga & total (berdasarkan keputusan & harga supplier)
                    const price = it._decision === 'send' ? Number(it._price || 0) : 0
                    const lineTotal = price * Number(ordered || 0)

                    // Data penerimaan (hanya dipakai saat received)
                    const received = Number(sum?.received_qty_pack || 0)
                    const remaining = Number(sum?.remaining_qty_pack || 0)
                    const diffReason = sum?.admin_return_reason || '—'

                    return (
                      <tr key={it.id} className="border-b">
                        <td className="py-2">{it.product_name}</td>
                        <td>{fmtNum(ordered)}</td>

                        {/* harga supplier */}
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
                                const val = e.target.value === '' ? null : Number(e.target.value)
                                v[idx]._price = val >= 0 ? val : 0
                                setItems(v)
                              }}
                              onFocus={e=>e.target.select()}
                            />
                          ) : (
                            <span className="text-gray-700">
                              {it._decision === 'send' && it._price != null && Number(it._price) > 0
                                ? fmtMoney(it._price)
                                : '—'}
                            </span>
                          )}
                        </td>

                        <td>{fmtMoney(lineTotal)}</td>

                        {showReceiveCols && (
                          <>
                            <td>{fmtNum(received)}</td>
                            <td className={remaining > 0 ? 'text-amber-700 font-medium' : ''}>
                              {fmtNum(remaining)}
                            </td>
                            <td className="text-xs text-gray-700">{diffReason}</td>
                          </>
                        )}

                        {/* keputusan + note supplier */}
                        <td>
                          {isEditable ? (
                            <select
                              className="input w-full"
                              value={it._decision}
                              onChange={e=>{
                                const v=[...items]
                                v[idx]._decision = e.target.value
                                if (e.target.value !== 'send') v[idx]._price = null
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
                              placeholder="Keterangan"
                              value={it._note}
                              onChange={e=>{
                                const v=[...items]
                                v[idx]._note = e.target.value
                                setItems(v)
                              }}
                            />
                          ) : (
                            <span className="text-gray-600">{it.supplier_note || '—'}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {!items.length && (
                    <tr>
                      <td colSpan={colSpanEmpty} className="py-3 text-gray-500">
                        Tidak ada item
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="text-right mt-3 font-semibold">
              Grand Total (berdasarkan keputusan & harga supplier): {fmtMoney(total)}
            </div>
          </div>

          {(po.status==='sent' || po.status==='draft') && (
            <div className="flex gap-2">
              <button
                className={`btn-primary ${!allResolved ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={confirm}
                disabled={!allResolved || confirming}
                title={!allResolved ? 'Masih ada item pending / harga belum diisi' : ''}
              >
                {confirming ? 'Mengirim…' : 'Confirm PO'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
