import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'

function DecisionPill({ decision }) {
  const d = String(decision || 'pending').toLowerCase()
  const cls =
    d === 'send' ? 'bg-green-100 text-green-700'
    : d === 'nosend' ? 'bg-red-100 text-red-700'
    : 'bg-gray-100 text-gray-600'
  const label = d === 'send' ? 'Dikirim' : d === 'nosend' ? 'Tidak dikirim' : 'Pending'
  return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{label}</span>
}

const expectedToSend = (it) =>
  String(it.supplier_decision).toLowerCase() === 'nosend' ? 0 : toNum(it.qty_pack)

const toNum = (v, def = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}
const fmtMoney = (v) => Number.isFinite(Number(v)) ? Number(v).toLocaleString() : '—'
const fmtNum = (v) => Number.isFinite(Number(v)) ? Number(v).toLocaleString() : '—'
const fmtDT = (d) => d ? new Date(d).toLocaleString() : '—'

export default function ReceiveGRNDetail(){
  const { id } = useParams()
  const nav = useNavigate()

  const [mode, setMode] = useState('receive') // 'receive' | 'detail'
  const [po, setPo] = useState(null)
  const [formItems, setFormItems] = useState([])
  const [detailItems, setDetailItems] = useState([])
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

      if (String(poData.status).toLowerCase() === 'received') {
        setMode('detail')
        // Ambil receive-detail (grns + summary_items)
        const { data } = await axios.get(`/purchase/${id}/receive-detail`, { withCredentials: true })
        if (data?.status) {
          setDetailItems(Array.isArray(data.summary_items) ? data.summary_items : [])
        } else {
          setDetailItems([])
        }
      } else {
        setMode('receive')
        // Siapkan form item (tambahkan _diff_reason untuk catatan selisih)
        setFormItems(
          poItems.map(it => ({
            id: it.id,
            product_id: it.product_id,
            product_name: it.product_name,
            qty_pack: toNum(it.qty_pack),
            price_per_pack: toNum(it.price_per_pack),
            pack_size: toNum(it.pack_size, 1),
            unit_name: it.unit_name || 'pcs',
            supplier_decision: it.supplier_decision || 'pending',
            supplier_note: it.supplier_note || '',
            supplier_price_per_pack:
              it.supplier_price_per_pack != null ? toNum(it.supplier_price_per_pack) : null,
            recv_qty_pack: 0,
            _diff_reason: '' // alasan selisih
          }))
        )
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Gagal memuat data')
    } finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [id])

  const expectedToSend = (it) =>
    String(it.supplier_decision).toLowerCase() === 'nosend' ? 0 : toNum(it.qty_pack)

  // ===== Mode RECEIVE =====
  const setRecv = (idx, val) => {
  let v = Math.max(0, toNum(val))
  setFormItems(prev => {
    const t = [...prev]
    const exp = expectedToSend(t[idx])
    if (v > exp) v = exp            // ⟵ clamp ke maksimal Qty PO
    t[idx].recv_qty_pack = v
    if (v >= exp) t[idx]._diff_reason = '' // kalau tidak ada selisih, kosongkan alasan
    return t
  })
}

  const receiveAll = () =>
    setFormItems(prev =>
      prev.map(it => ({
        ...it,
        recv_qty_pack:
          String(it.supplier_decision).toLowerCase() === 'nosend' ? 0 : toNum(it.qty_pack)
      }))
    )

  const clearAll = () => setFormItems(prev => prev.map(it => ({ ...it, recv_qty_pack: 0 })))

  // Ringkasan submit (cek harga supplier & alasan selisih)
  const summary = useMemo(() => {
    if (mode !== 'receive') return {
      packs: 0, units: 0, cost: 0, missingPrice: 0, totalDiff: 0, missingDiffReason: 0
    }
    let packs=0, units=0, cost=0, missingPrice=0, totalDiff=0, missingDiffReason=0
    for (const it of formItems) {
      const recv = toNum(it.recv_qty_pack)
      const psize = toNum(it.pack_size, 1)
      const price = it.supplier_price_per_pack != null ? toNum(it.supplier_price_per_pack) : null
      const exp = expectedToSend(it)
      const diff = Math.max(0, exp - recv)

      packs += recv
      units += recv * psize

      if (recv > 0 && price == null) missingPrice += 1
      if (price != null) cost += recv * price

      totalDiff += diff
      if (diff > 0 && !String(it._diff_reason || '').trim()) missingDiffReason += 1
    }
    return { packs, units, cost, missingPrice, totalDiff, missingDiffReason }
  }, [formItems, mode])

  // Totals untuk detail mode
  const detailTotals = useMemo(() => {
    if (!Array.isArray(detailItems) || !detailItems.length) {
      return { receivedPacks: 0, receivedUnits: 0, cost: 0, hasPackSize: false }
    }
    let receivedPacks = 0, receivedUnits = 0, cost = 0, hasPackSize = false
    for (const it of detailItems) {
      const rPack = toNum(it.received_qty_pack)
      const supPrice = it.supplier_price_per_pack != null ? toNum(it.supplier_price_per_pack) : null
      const psize = it.pack_size != null ? toNum(it.pack_size) : null
      receivedPacks += rPack
      if (psize != null && Number.isFinite(psize)) { hasPackSize = true; receivedUnits += rPack * psize }
      if (supPrice != null) cost += rPack * supPrice
    }
    return { receivedPacks, receivedUnits, cost, hasPackSize }
  }, [detailItems])

  const submit = async () => {
    setError('')
    // Kirim semua item: qty diterima + (jika ada) selisih + alasan
    const payloadItems = formItems
      .filter(it => toNum(it.recv_qty_pack) > 0 || expectedToSend(it) > 0)
      .map(it => {
        const exp = expectedToSend(it)
        const recv = toNum(it.recv_qty_pack)
        const diff = Math.max(0, exp - recv)
        return {
          product_id: it.product_id,
          qty_pack: recv,
          diff_qty_pack: diff > 0 ? diff : 0,
          diff_reason: diff > 0 ? (it._diff_reason || '') : ''
        }
      })

    if (!payloadItems.some(x => x.qty_pack > 0)) {
      setError('Isi minimal 1 item diterima'); return
    }
    if (summary.missingPrice > 0) {
      setError('Ada item diterima tanpa harga supplier (dari supplier).'); return
    }
    if (summary.missingDiffReason > 0) {
      setError('Alasan selisih wajib diisi untuk setiap item yang selisih.'); return
    }

    try {
      setSubmitting(true)
      const r = await axios.post(`/purchase/${id}/receive`, { items: payloadItems, note })
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
          {/* Header + timestamps */}
          <div className="grid md:grid-cols-4 gap-3">
            <div className="card">
              <div className="text-sm text-gray-500">Kode</div>
              <div className="font-medium">{po.code}</div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-500">Supplier</div>
              <div className="font-medium">{po.supplier_name || '—'}</div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-500">Status</div>
              <div className="font-medium uppercase">{po.status}</div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-500">Dikonfirmasi / Diterima</div>
              <div className="text-xs">
                 <div>Permintaan: <b>{fmtDT(po.created_at)}</b></div>
                <div>Confirmed: <b>{fmtDT(po.confirmed_at)}</b></div>
                <div>Received: <b>{fmtDT(po.received_at)}</b></div>
              </div>
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
                        <th>Keterangan Supplier</th>
                        <th>Diterima (Pack)</th>
                        <th>= Units</th>
                        <th>Selisih (Pack)</th>
                        <th>Alasan Selisih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formItems.map((it, idx) => {
                        const blocked = String(it.supplier_decision).toLowerCase() === 'nosend'
                        const recvUnits = toNum(it.recv_qty_pack) * toNum(it.pack_size, 1)
                        const exp = expectedToSend(it)
                        const diff = Math.max(0, exp - toNum(it.recv_qty_pack))
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
  max={expectedToSend(it)}         // ⟵ batas maksimum tampil di UI juga
  step={1}
  value={blocked ? 0 : it.recv_qty_pack}
  onChange={e => !blocked && setRecv(idx, e.target.value)}
  disabled={blocked}
  title={blocked
    ? 'Supplier menandai item ini tidak dikirim'
    : `Maksimal ${expectedToSend(it)} pack`}
 />

                            </td>
                            <td className="w-24">{fmtNum(recvUnits)}</td>
                            <td className="w-24">{fmtNum(diff)}</td>
                            <td className="w-60">
                              <input
                                className="input w-full"
                                placeholder="contoh: 2 rusak, 1 kemasan sobek"
                                value={it._diff_reason}
                                onChange={e=>{
                                  const v=[...formItems]
                                  v[idx]._diff_reason = e.target.value
                                  setFormItems(v)
                                }}
                                disabled={diff === 0}
                                title={diff>0 ? 'Wajib isi alasan jika ada selisih' : ''}
                              />
                            </td>
                          </tr>
                        )
                      })}
                      {!formItems.length && (
                        <tr><td className="py-3 text-gray-500" colSpan={10}>Tidak ada item</td></tr>
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
                  <div className="font-medium">Total Pack Diterima: {fmtNum(summary.packs)}</div>
                  <div className="font-medium">Total Units: {fmtNum(summary.units)}</div>
                  <div className="font-medium">Total Selisih (Pack): {fmtNum(summary.totalDiff)}</div>
                  <div className="font-semibold">
                    Total Biaya (Harga Supplier): {fmtMoney(summary.cost)}
                  </div>
                  {summary.missingPrice > 0 && (
                    <div className="text-xs text-amber-700 mt-1">
                      * Ada {summary.missingPrice} item diterima tanpa harga supplier — lengkapi dulu (oleh supplier).
                    </div>
                  )}
                  {summary.missingDiffReason > 0 && (
                    <div className="text-xs text-amber-700">
                      * Ada {summary.missingDiffReason} item selisih tanpa alasan — isi alasannya.
                    </div>
                  )}
                  <button
                    className="btn-primary w-full mt-2"
                    onClick={submit}
                    disabled={
                      submitting ||
                      !formItems.some(it => toNum(it.recv_qty_pack) > 0) ||
                      summary.missingPrice > 0 ||
                      summary.missingDiffReason > 0
                    }
                    title={
                      summary.missingPrice > 0
                        ? 'Ada item diterima tanpa harga supplier'
                        : (summary.missingDiffReason > 0 ? 'Alasan selisih belum diisi' : '')
                    }
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
                      <th>Selisih (Pack)</th>
                      <th>Alasan Selisih</th>{/* ← NEW */}
                      <th>Harga Supplier / Pack</th>
                      <th>Biaya Diterima</th>
                      <th>Keputusan</th>
                      <th>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailItems.map(it => {
                      const supPrice = it.supplier_price_per_pack != null ? toNum(it.supplier_price_per_pack) : null
                      const recvPack = toNum(it.received_qty_pack)
                      const lineCost = supPrice != null ? recvPack * supPrice : null
                      const reason = (it.admin_return_reason || '').trim()
                      return (
                        <tr key={it.purchase_item_id} className="border-b align-top">
                          <td className="py-2 font-medium">{it.product_name}</td>
                          <td>{fmtNum(it.ordered_qty_pack)}</td>
                          <td>{fmtNum(it.received_qty_pack)}</td>
                          <td>{fmtNum(it.remaining_qty_pack)}</td>
                          <td className="text-xs text-gray-700">{reason || '—'}</td>
                          <td>{supPrice != null ? fmtMoney(supPrice) : '—'}</td>
                          <td>{lineCost != null ? fmtMoney(lineCost) : '—'}</td>
                          <td><DecisionPill decision={it.supplier_decision} /></td>
                          <td className="text-xs text-gray-700">{it.supplier_note || '—'}</td>
                        </tr>
                      )
                    })}
                    {!detailItems.length && (
                      <tr><td className="py-4 text-gray-500" colSpan={9}>Tidak ada data</td></tr>
                    )}
                  </tbody>

                  {detailItems.length > 0 && (
                    <tfoot>
                      <tr className="border-t font-semibold">
                        <td className="py-2 text-right" colSpan={2}>Total Received:</td>
                        <td>{fmtNum(detailTotals.receivedPacks)} pack</td>
                        <td>{/* remaining total tidak perlu di-total-kan */}</td>
                        <td>{/* alasan selisih (total) tidak relevan */}</td>
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
