import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'

function DecisionPill({ decision }) {
  const d = String(decision || 'pending').toLowerCase()
  const cls =
    d === 'send'
      ? 'bg-green-100 text-green-700'
      : d === 'nosend'
      ? 'bg-red-100 text-red-700'
      : 'bg-gray-100 text-gray-600'
  const label =
    d === 'send' ? 'Dikirim' : d === 'nosend' ? 'Tidak dikirim' : 'Pending'
  return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{label}</span>
}

// helper
const fmtMoney = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString() : '—'
}
const fmtNum = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString() : '—'
}

export default function ReceiveGRNDetail(){
  const { id } = useParams()
  const nav = useNavigate()

  const [mode, setMode] = useState('receive') // 'receive' | 'detail'
  const [po, setPo] = useState(null)
  const [formItems, setFormItems] = useState([])     // utk mode receive
  const [detailItems, setDetailItems] = useState([]) // utk mode detail (summary+history)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    setLoading(true)
    try {
      // Ambil header + items PO
      const r = await axios.get(`/purchase/${id}`)
      const poData = r.data.po || r.data.data?.po
      const poItems = r.data.items || []
      if (!poData) { setError('PO tidak ditemukan'); return }

      setPo(poData)

      if (String(poData.status).toLowerCase() === 'received') {
        setMode('detail')
        // Ambil receive-detail (grns + summary_items)
        const { data } = await axios.get(`/purchase/${id}/receive-detail`, { withCredentials: true })
        if (data?.status) {
          // pastikan backend sudah include: supplier_decision, supplier_note, supplier_price_per_pack, pack_size
          setDetailItems(Array.isArray(data.summary_items) ? data.summary_items : [])
        } else {
          setDetailItems([])
        }
      } else {
        setMode('receive')
        // siapkan form: default 0; jika supplier nosend -> paksa 0 & disabled
        setFormItems(
          poItems.map(it => ({
            id: it.id,
            product_id: it.product_id,
            product_name: it.product_name,
            qty_pack: Number(it.qty_pack || 0),
            price_per_pack: Number(it.price_per_pack || 0), // harga request/admin (boleh abaikan)
            pack_size: Number(it.pack_size || 1),
            unit_name: it.unit_name || 'pcs',
            supplier_decision: it.supplier_decision || 'pending',
            supplier_note: it.supplier_note || '',
            supplier_price_per_pack:
              it.supplier_price_per_pack != null ? Number(it.supplier_price_per_pack) : null,
            recv_qty_pack: 0
          }))
        )
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Gagal memuat data')
    } finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [id])

  // ===== Mode RECEIVE =====
  const setRecv = (idx, val) => {
    const v = Math.max(0, Number(val || 0))
    setFormItems(prev => {
      const t=[...prev]
      t[idx].recv_qty_pack = v
      return t
    })
  }

  const receiveAll = () =>
    setFormItems(prev =>
      prev.map(it => ({
        ...it,
        recv_qty_pack: String(it.supplier_decision).toLowerCase() === 'nosend'
          ? 0
          : Number(it.qty_pack || 0)
      }))
    )

  const clearAll = () =>
    setFormItems(prev => prev.map(it => ({ ...it, recv_qty_pack: 0 })))

  const summary = useMemo(() => {
    if (mode !== 'receive') return { packs: 0, units: 0, cost: 0, missingPrice: 0 }
    let packs = 0, units = 0, cost = 0, missingPrice = 0
    for (const it of formItems) {
      const r = Number(it.recv_qty_pack || 0)
      const ps = Number(it.pack_size || 1)
      const supPrice = (it.supplier_price_per_pack != null) ? Number(it.supplier_price_per_pack) : null

      packs += r
      units += r * ps
      if (supPrice == null) {
        if (r > 0) missingPrice += 1
      } else {
        cost += r * supPrice
      }
    }
    return { packs, units, cost, missingPrice }
  }, [formItems, mode])

  // ===== Detail totals (mode 'detail') =====
  const detailTotals = useMemo(() => {
    if (!Array.isArray(detailItems) || !detailItems.length) {
      return { receivedPacks: 0, receivedUnits: 0, cost: 0, hasPackSize: false }
    }
    let receivedPacks = 0, receivedUnits = 0, cost = 0, hasPackSize = false
    for (const it of detailItems) {
      const rPack = Number(it.received_qty_pack || 0)
      const supPrice = it.supplier_price_per_pack != null ? Number(it.supplier_price_per_pack) : null
      const psize = it.pack_size != null ? Number(it.pack_size) : null
      receivedPacks += rPack
      if (psize != null && Number.isFinite(psize)) {
        hasPackSize = true
        receivedUnits += rPack * psize
      }
      if (supPrice != null) cost += rPack * supPrice
    }
    return { receivedPacks, receivedUnits, cost, hasPackSize }
  }, [detailItems])

  const submit = async () => {
    setError('')
    const picked = formItems
      .filter(it => Number(it.recv_qty_pack||0)>0)
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
        <h1 className="text-xl font-semibold">
          {mode === 'detail' ? 'Detail GRN — Detail PO' : 'Receive GRN — Detail PO'}
        </h1>
        <button className="px-3 py-1 border rounded" onClick={()=>nav('/admin/purchase/receive')}>
          Kembali ke List
        </button>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
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

          {mode === 'receive' ? (
            <>
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
                        <th>Keputusan Supplier</th>
                        <th>Harga Supplier / Pack</th>
                        <th>Keterangan</th>
                        <th>Diterima (Pack)</th>
                        <th>= Units</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formItems.map((it, idx) => {
                        const units = Number(it.recv_qty_pack||0) * Number(it.pack_size||1)
                        const blocked = String(it.supplier_decision).toLowerCase() === 'nosend'
                        const hSupplier = it.supplier_price_per_pack
                        return (
                          <tr key={it.id} className="border-b">
                            <td className="py-2">
                              <div className="font-medium">{it.product_name}</div>
                            </td>
                            <td>{fmtNum(it.qty_pack)}</td>
                            <td>{fmtNum(it.pack_size)} {it.unit_name}</td>
                            <td><DecisionPill decision={it.supplier_decision} /></td>
                            <td>{hSupplier == null ? '—' : fmtNum(hSupplier)}</td>
                            <td className="text-xs text-gray-700">{it.supplier_note || '—'}</td>
                            <td className="w-40">
                              <input
                                className={`input ${blocked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                type="number"
                                min={0}
                                value={blocked ? 0 : it.recv_qty_pack}
                                onChange={e=>!blocked && setRecv(idx, e.target.value)}
                                disabled={blocked}
                                title={blocked ? 'Supplier menandai item ini tidak dikirim' : ''}
                              />
                            </td>
                            <td className="w-32">{fmtNum(units)}</td>
                          </tr>
                        )
                      })}
                      {!formItems.length && (
                        <tr><td className="py-3 text-gray-500" colSpan={8}>Tidak ada item</td></tr>
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
                  <div className="font-medium">Total Pack: {fmtNum(summary.packs)}</div>
                  <div className="font-medium">Total Units: {fmtNum(summary.units)}</div>
                  <div className="font-semibold">
                    Total Biaya (Harga Supplier): {fmtMoney(summary.cost)}
                  </div>
                  {summary.missingPrice > 0 && (
                    <div className="text-xs text-amber-700 mt-1">
                      * {summary.missingPrice} item diterima tanpa harga supplier — dianggap 0.
                    </div>
                  )}
                  <button
                    className="btn-primary w-full mt-2"
                    onClick={submit}
                    disabled={submitting || !formItems.some(it => Number(it.recv_qty_pack) > 0)}
                  >
                    {submitting ? 'Menyimpan…' : 'Simpan Penerimaan'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="card">
              <div className="font-medium mb-2">Item & Riwayat Penerimaan</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2">Item</th>
                      <th>Ordered (Pack)</th>
                      <th>Received (Pack)</th>
                      <th>Remaining (Pack)</th>
                      <th>Harga Supplier / Pack</th>
                      <th>Biaya Diterima</th>
                      <th>Keputusan</th>
                      <th>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailItems.map(it => {
                      const supPrice = it.supplier_price_per_pack != null ? Number(it.supplier_price_per_pack) : null
                      const recvPack = Number(it.received_qty_pack || 0)
                      const lineCost = supPrice != null ? recvPack * supPrice : null
                      return (
                        <tr key={it.purchase_item_id} className="border-b align-top">
                          <td className="py-2 font-medium">{it.product_name}</td>
                          <td>{fmtNum(it.ordered_qty_pack)}</td>
                          <td>{fmtNum(it.received_qty_pack)}</td>
                          <td>{fmtNum(it.remaining_qty_pack)}</td>
                          <td>{supPrice != null ? fmtMoney(supPrice) : '—'}</td>
                          <td>{lineCost != null ? fmtMoney(lineCost) : '—'}</td>
                          <td><DecisionPill decision={it.supplier_decision} /></td>
                          <td className="text-xs text-gray-700">{it.supplier_note || '—'}</td>
                        </tr>
                      )
                    })}
                    {!detailItems.length && (
                      <tr><td className="py-4 text-gray-500" colSpan={8}>Tidak ada data</td></tr>
                    )}
                  </tbody>

                  {detailItems.length > 0 && (
                    <tfoot>
                      <tr className="border-t font-semibold">
                        <td className="py-2 text-right" colSpan={2}>Total Received:</td>
                        <td>{fmtNum(detailTotals.receivedPacks)} pack</td>
                        <td>
                          {detailTotals.hasPackSize
                            ? `${fmtNum(detailTotals.receivedUnits)} unit`
                            : '—'}
                        </td>
                        <td className="text-right">Total Biaya:</td>
                        <td>{fmtMoney(detailTotals.cost)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
