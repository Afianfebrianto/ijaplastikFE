import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'

export default function ReceiveGRNDetail(){
  const { id } = useParams()
  const nav = useNavigate()

  const [mode, setMode] = useState('receive') // 'receive' | 'detail'
  const [po, setPo] = useState(null)

  // RECEIVE mode (form)
  const [formItems, setFormItems] = useState([]) // dari /purchase/:id (items PO)
  const [note, setNote] = useState('')

  // DETAIL mode (read-only)
  const [grns, setGrns] = useState([])            // dari /purchase/:id/receive-detail
  const [summaryItems, setSummaryItems] = useState([])

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // ====== LOAD DATA ======
  const load = async () => {
    setError('')
    setLoading(true)
    try {
      // Ambil detail GRN-centric
      const det = await axios.get(`/purchase/${id}/receive-detail`, { withCredentials: true })
      if (!det?.data?.status) throw new Error(det?.data?.message || 'Gagal memuat detail GRN')

      const { purchase, grns: grnList = [], summary_items: sum = [] } = det.data
      setPo(purchase || null)
      setGrns(Array.isArray(grnList) ? grnList : [])
      setSummaryItems(Array.isArray(sum) ? sum : [])

      // Tentukan mode: kalau status sudah received → detail, selain itu receive
      const currentMode = String(purchase?.status || '').toLowerCase() === 'received' ? 'detail' : 'receive'
      setMode(currentMode)

      // Kalau receive: ambil items PO untuk form input penerimaan
      if (currentMode === 'receive') {
        const r = await axios.get(`/purchase/${id}`)
        const poItems = r.data.items || r.data.data?.items || []
        // default recv_qty_pack = sisa (ordered - received), jika ada di summaryItems; kalau tidak, 0
        const itemsForForm = poItems.map(it => {
          const match = summaryItems.find(s => s.purchase_item_id === it.id || s.product_id === it.product_id)
          const ordered = Number(it.qty_pack || 0)
          const recv = Number(match?.received_qty_pack || 0)
          const remain = Math.max(0, ordered - recv)
          return {
            ...it,
            recv_qty_pack: 0,            // user isi manual; kalau mau auto, ganti ke remain
            remaining_pack: remain
          }
        })
        setFormItems(itemsForForm)
      } else {
        // mode detail: pastikan form kosong
        setFormItems([])
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Gagal memuat data')
    } finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [id])

  // ===== Mode RECEIVE (form) =====
  const setRecv = (idx, val) => {
    const v = Math.max(0, Number(val || 0))
    setFormItems(prev => { const t=[...prev]; t[idx].recv_qty_pack=v; return t })
  }
  const receiveAll = () => setFormItems(prev =>
  prev.map(it => {
    const base = it.remaining_pack ?? it.qty_pack ?? 0
    return { ...it, recv_qty_pack: Number(base) }
  })
)
  const clearAll = () => setFormItems(prev => prev.map(it => ({ ...it, recv_qty_pack: 0 })))

  const summaryReceive = useMemo(() => {
    if (mode !== 'receive') return { packs: 0, units: 0 }
    const packs = formItems.reduce((s, it) => s + Number(it.recv_qty_pack || 0), 0)
    const units = formItems.reduce((s, it) => s + Number(it.recv_qty_pack || 0) * Number(it.pack_size || 1), 0)
    return { packs, units }
  }, [formItems, mode])

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
          {mode === 'detail' ? 'Detail GRN' : 'Receive GRN'}
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
          {/* Header PO */}
          <div className="grid md:grid-cols-3 gap-3">
            <div className="card">
              <div className="text-sm text-gray-500">Kode</div>
              <div className="font-medium">{po?.code}</div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-500">Status</div>
              <div className="font-medium uppercase">{po?.status}</div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-500">Tanggal</div>
              <div className="font-medium">{po?.created_at ? new Date(po.created_at).toLocaleString() : '-'}</div>
            </div>
          </div>

          {mode === 'receive' ? (
            // ================== RECEIVE MODE (Form) ==================
            <>
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Items</div>
                  <div className="flex gap-2">
                    <button className="px-2 py-1 border rounded" onClick={receiveAll}>Terima Semua (Sisa)</button>
                    <button className="px-2 py-1 border rounded" onClick={clearAll}>Kosongkan</button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2">Produk</th>
                        <th>Qty PO (Pack)</th>
                        <th>Sisa (Pack)</th>
                        <th>Pack Size</th>
                        <th>Diterima (Pack)</th>
                        <th>= Units</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formItems.map((it, idx) => {
                        const units = Number(it.recv_qty_pack||0) * Number(it.pack_size||1)
                        return (
                          <tr key={it.id} className="border-b">
                            <td className="py-2">
                              <div className="font-medium">{it.product_name}</div>
                              <div className="text-xs text-gray-500">Harga/Pack: {Number(it.price_per_pack).toLocaleString()}</div>
                            </td>
                            <td>{Number(it.qty_pack).toLocaleString()}</td>
                            <td>{Number(it.remaining_pack ?? 0).toLocaleString()}</td>
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
                      {!formItems.length && (
                        <tr><td className="py-3 text-gray-500" colSpan={6}>Tidak ada item</td></tr>
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
                  <div className="font-medium">Total Pack: {summaryReceive.packs.toLocaleString()}</div>
                  <div className="font-medium">Total Units: {summaryReceive.units.toLocaleString()}</div>
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
            // ================== DETAIL MODE (GRN-CENTRIC + SUMMARY) ==================
            <>
              {/* Ringkasan per item PO */}
              <div className="card">
                <div className="font-medium mb-2">Ringkasan Item PO</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2">Item</th>
                        <th>Ordered (Pack)</th>
                        <th>Received (Pack)</th>
                        <th>Remaining (Pack)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryItems.map(si => (
                        <tr key={si.purchase_item_id} className="border-b">
                          <td className="py-2 font-medium">{si.product_name}</td>
                          <td>{Number(si.ordered_qty_pack).toLocaleString()}</td>
                          <td>{Number(si.received_qty_pack).toLocaleString()}</td>
                          <td>{Number(si.remaining_qty_pack).toLocaleString()}</td>
                        </tr>
                      ))}
                      {!summaryItems.length && (
                        <tr><td className="py-3 text-gray-500" colSpan={4}>Tidak ada data ringkasan</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Daftar GRN */}
              <div className="card">
                <div className="font-medium mb-2">Daftar Penerimaan (GRN)</div>
                {!grns.length && <div className="text-sm text-gray-500">Belum ada penerimaan.</div>}
                <div className="space-y-4">
                  {grns.map(grn => (
                    <div key={grn.id} className="border rounded p-3">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                        <div>
                          <div className="text-sm text-gray-500">GRN ID</div>
                          <div className="font-medium">#{grn.id}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Tanggal Terima</div>
                          <div className="font-medium">{grn.received_at ? new Date(grn.received_at).toLocaleString() : '-'}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Diterima Oleh</div>
                          <div className="font-medium">{grn.received_by_name || '-'}</div>
                        </div>
                      </div>
                      {grn.note && (
                        <div className="mb-2 text-sm text-gray-700">
                          <span className="text-gray-500">Catatan: </span>{grn.note}
                        </div>
                      )}
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left border-b">
                              <th className="py-2">Produk</th>
                              <th>Pack Size</th>
                              <th>Qty (Pack)</th>
                              <th>= Units</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(grn.items || []).map((it, idx) => (
                              <tr key={idx} className="border-b">
                                <td className="py-2 font-medium">{it.product_name}</td>
                                <td>{Number(it.pack_size).toLocaleString()}</td>
                                <td>{Number(it.qty_pack).toLocaleString()}</td>
                                <td>{Number(it.qty_units).toLocaleString()}</td>
                              </tr>
                            ))}
                            {!grn.items?.length && (
                              <tr><td className="py-3 text-gray-500" colSpan={4}>Tidak ada item</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
