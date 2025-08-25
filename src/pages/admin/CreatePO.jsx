import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import axios from 'axios'
import ResultDialog from '../../components/ResultDialog' // <-- sesuaikan path sesuai struktur project-mu

export default function CreatePO(){
  const [products, setProducts] = useState([])
  const [items, setItems] = useState([])
  const [note, setNote] = useState('')

  // === Product search
  const [qProd, setQProd] = useState('')

  // supplier combo-box
  const [supplierSearch, setSupplierSearch] = useState('')
  const [supplierList, setSupplierList] = useState([])
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)

  const typingTimer = useRef(null)
  const blurTimer = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // === Result Dialog state
  const [dlgOpen, setDlgOpen] = useState(false)
  const [dlgType, setDlgType] = useState('success') // 'success' | 'error'
  const [dlgTitle, setDlgTitle] = useState('')
  const [dlgMsg, setDlgMsg] = useState('')
  const [dlgAutoClose, setDlgAutoClose] = useState(undefined)

  const openDialog = useCallback((type, title, message, autoCloseMs) => {
    setDlgType(type)
    setDlgTitle(title)
    setDlgMsg(message)
    setDlgAutoClose(autoCloseMs)
    setDlgOpen(true)
  }, [])

  useEffect(()=>{
    axios.get('/products').then(r=>setProducts(r.data.data||[]))
  },[])

  // ====== SUPPLIER LOGIC ======

  const prefetchSuppliers = async () => {
    if (supplierList.length) return
    setSearchLoading(true)
    try {
      const res = await axios.get('/suppliers', { params: { limit: 20 } })
      setSupplierList(res.data.data || [])
    } finally { setSearchLoading(false) }
  }

  const runSearch = async (q) => {
    setSearchLoading(true)
    try {
      const params = q.trim().length ? { search: q.trim(), limit: 20 } : { limit: 20 }
      const res = await axios.get('/suppliers', { params })
      setSupplierList(res.data.data || [])
      setActiveIdx(-1)
    } finally { setSearchLoading(false) }
  }

  const onSearchChange = (val) => {
    setSupplierSearch(val)
    setSelectedSupplier(null)
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(()=> runSearch(val), 200)
  }

  const onFocus = async () => {
    setShowDropdown(true)
    await prefetchSuppliers()
  }

  const onBlur = () => {
    blurTimer.current = setTimeout(()=> setShowDropdown(false), 120)
  }

  const pickSupplier = (s) => {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    setSelectedSupplier(s)
    setSupplierSearch(s.name)
    setShowDropdown(false)
  }

  const onKeyDown = (e) => {
    if (!showDropdown || !supplierList.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(supplierList.length - 1, i + 1))
      scrollActiveIntoView(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(0, i - 1))
      scrollActiveIntoView(-1)
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0) {
        e.preventDefault()
        pickSupplier(supplierList[activeIdx])
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  const scrollActiveIntoView = (dir=1) => {
    const list = listRef.current
    if (!list) return
    const el = list.querySelector(`[data-idx="${activeIdx}"]`)
    if (el) {
      const { offsetTop, offsetHeight } = el
      const { scrollTop, clientHeight } = list
      if (offsetTop < scrollTop) list.scrollTop = offsetTop
      else if (offsetTop + offsetHeight > scrollTop + clientHeight) list.scrollTop = offsetTop - clientHeight + offsetHeight
    }
  }

  const clearSupplier = () => {
    setSelectedSupplier(null)
    setSupplierSearch('')
    setActiveIdx(-1)
    setShowDropdown(true)
    runSearch('')
    inputRef.current?.focus()
  }

  // ====== ITEMS / SUBMIT ======

  const addItem = (p) => {
    setItems(prev => {
      const existIdx = prev.findIndex(it => it.product_id === p.id)
      if (existIdx >= 0) {
        const updated = [...prev]
        updated[existIdx].qty_pack = Number(updated[existIdx].qty_pack) + 1
        return updated
      }
      // simpan price_per_pack (untuk payload) tapi tidak ditampilkan
      return [
        ...prev,
        {
          product_id: p.id,
          name: p.name,
          qty_pack: 1,
          price_per_pack: p.wholesale_price_per_pack
        }
      ]
    })
  }

  const removeItem = (idx) => setItems(items.filter((_,i)=>i!==idx))

  const submit = async () => {
    if (!selectedSupplier) {
      openDialog('error', 'Gagal Membuat PO', 'Pilih supplier terlebih dahulu.')
      return
    }
    if (!items.length) {
      openDialog('error', 'Gagal Membuat PO', 'Tambahkan minimal 1 item ke daftar.')
      return
    }

    const payload = {
      supplier_id: selectedSupplier.id,
      items: items.map(({product_id, qty_pack, price_per_pack})=>({
        product_id,
        qty_pack: Math.max(1, Number(qty_pack || 1)),
        price_per_pack: Math.max(0, Number(price_per_pack || 0))
      })),
      note
    }

    try {
      const r = await axios.post('/purchase', payload)
      const code = r?.data?.code || '(tanpa kode)'

      // Tampilkan dialog sukses
      openDialog(
        'success',
        'PO Berhasil Dibuat',
        `Kode PO: ${code}\nSupplier: ${selectedSupplier.name}`
      )

      // reset ringan
      setItems([])
      setNote('')
      // supplier tetap dipertahankan
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Terjadi kesalahan saat membuat PO.'
      openDialog('error', 'Gagal Membuat PO', msg)
    }
  }

  // auto-fix price_per_pack di state (kalau undefined) — tidak ditampilkan
  useEffect(()=>{
    if (!items.length) return
    let changed = false
    const fixed = items.map(it => {
      const cur = Number(it.price_per_pack)
      if (Number.isFinite(cur) && cur >= 0) return it
      const prod = products.find(p => p.id === it.product_id)
      const price = Number(prod?.wholesale_price_per_pack ?? 0) || 0
      if (it.price_per_pack !== price) changed = true
      return { ...it, price_per_pack: price }
    })
    if (changed) setItems(fixed)
  }, [items, products])

  // ====== PRODUCT MULTI-SEARCH (SKU/Name/Category, multi-kata) ======
  const filteredProducts = useMemo(()=>{
    const tokens = String(qProd || '').toLowerCase().split(/\s+/).filter(Boolean)
    if (!tokens.length) return products
    return products.filter(p => {
      const name = (p.name || '').toLowerCase()
      const sku = (p.sku || '').toLowerCase()
      const cat = (p.category || '').toLowerCase()
      return tokens.every(t => name.includes(t) || sku.includes(t) || cat.includes(t))
    })
  }, [products, qProd])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Create Purchase Order</h1>

      {/* Supplier & note */}
      <div className="card space-y-3">
        <div className="relative">
          <label className="block text-sm font-medium mb-1">Supplier</label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              className="input w-full"
              placeholder="cari supplier"
              value={supplierSearch}
              onChange={(e)=>onSearchChange(e.target.value)}
              onFocus={onFocus}
              onBlur={onBlur}
              onKeyDown={onKeyDown}
            />
            {supplierSearch && (
              <button className="px-3 py-2 border rounded" onClick={clearSupplier}>Clear</button>
            )}
          </div>

          {showDropdown && (
            <div
              ref={listRef}
              className="absolute z-20 mt-1 w-full border rounded bg-white shadow max-h-64 overflow-auto"
            >
              {searchLoading ? (
                <div className="px-3 py-2 text-sm text-gray-500">Mencari…</div>
              ) : (
                <>
                  {supplierList.length ? supplierList.map((s, i) => (
                    <div
                      key={s.id}
                      data-idx={i}
                      className={`px-3 py-2 cursor-pointer ${i===activeIdx ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
                      onMouseDown={(e)=>{ e.preventDefault(); pickSupplier(s); }}
                      onMouseEnter={()=>setActiveIdx(i)}
                    >
                      <div className="font-medium">{s.name}</div>
                      {(s.phone || s.email) && (
                        <div className="text-xs text-gray-500">
                          {s.phone || ''}{s.phone && s.email ? ' • ' : ''}{s.email || ''}
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="px-3 py-2 text-sm text-gray-500">Tidak ada supplier</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {selectedSupplier && (
          <div className="text-sm text-green-700">
            Supplier terpilih: <b>{selectedSupplier.name}</b> (ID: {selectedSupplier.id})
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Catatan (opsional)</label>
          <input className="input w-full" placeholder="Catatan untuk supplier" value={note} onChange={e=>setNote(e.target.value)} />
        </div>

        <div className="flex items-center gap-2">
          <button className="btn-primary" onClick={submit} disabled={!selectedSupplier || !items.length}>
            Submit PO
          </button>
          {/* Grand total disembunyikan sesuai permintaan */}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Products */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Products</div>
            <input
              className="input w-60"
              placeholder="Cari SKU / Nama / Kategori"
              value={qProd}
              onChange={e=>setQProd(e.target.value)}
            />
          </div>
          <div className="space-y-1 max-h-80 overflow-auto">
            {filteredProducts.map(p => (
              <div key={p.id} className="flex justify-between items-center border rounded p-2">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-500">
                    {p.sku || '—'} • {p.category || 'Tanpa Kategori'}
                  </div>
                  <div className="text-sm text-gray-500">
                    Pack: {p.pack_size} {p.unit_name}
                  </div>
                </div>
                <button type="button" className="px-2 py-1 border rounded" onClick={()=>addItem(p)}>Tambah</button>
              </div>
            ))}
            {!filteredProducts.length && (
              <div className="text-sm text-gray-500">Tidak ada produk yang cocok.</div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="card">
          <div className="font-medium mb-2">Items</div>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6">{it.name}</div>

                <label className="col-span-3 text-xs text-gray-500">Qty Pack</label>
                <input
                  className="input col-span-2"
                  type="number"
                  min={1}
                  value={it.qty_pack}
                  onChange={e=>{
                    const v=[...items]; v[idx].qty_pack = e.target.value; setItems(v);
                  }}
                />
                <button
                  className="col-span-1 text-red-600"
                  onClick={()=>removeItem(idx)}
                >
                  Hapus
                </button>
              </div>
            ))}
            {!items.length && <div className="text-sm text-gray-500">Belum ada item</div>}
          </div>
        </div>
      </div>

      {/* Dialog Success/Fail */}
      <ResultDialog
        open={dlgOpen}
        type={dlgType}
        title={dlgTitle}
        message={dlgMsg}
        onClose={()=>setDlgOpen(false)}
        autoCloseMs={dlgAutoClose}
      />
    </div>
  )
}
