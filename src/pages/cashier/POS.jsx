import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function POS(){
  const [products, setProducts] = useState([])
  const [q, setQ] = useState('')
  const [cart, setCart] = useState([])
  const [payment, setPayment] = useState('cash')

  // modal cash
  const [showPay, setShowPay] = useState(false)
  const [cashInput, setCashInput] = useState('')
  const [payError, setPayError] = useState('')

  const nav = useNavigate()

  useEffect(()=>{ axios.get('/products').then(r=>setProducts(r.data.data||[])) },[])

  const getAvailPack = (p) => {
    const size = Number(p.pack_size || 1)
    const units = Number(p.stock_units || 0)
    return Math.floor(units / (size > 0 ? size : 1))
  }

  const add = (p, type='unit') => {
    // guard stok saat menambah dari kartu produk
    if (type === 'unit' && Number(p.stock_units || 0) <= 0) return
    if (type === 'pack' && getAvailPack(p) <= 0) return

    const idx = cart.findIndex(c => c.product_id===p.id && c.item_type===type)
    if (idx>=0){
      const v=[...cart]; v[idx].qty += 1; setCart(v)
    } else {
      setCart(prev => [...prev, {
        product_id:p.id, name:p.name, item_type:type, qty:1,
        price: type==='pack'?p.wholesale_price_per_pack : p.retail_price_per_unit,
        pack_size:p.pack_size,
        stock_units: p.stock_units ?? 0 // simpan stok untuk referensi (opsional)
      }])
    }
  }

  const subtotal = useMemo(()=> cart.reduce((s,c)=> s + Number(c.price||0)*Number(c.qty||0), 0), [cart])
  const total = subtotal // TANPA PPN

  // === SEARCH: by SKU, name, category (multi-kata; semua token harus match salah satu field) ===
  const filtered = useMemo(()=>{
    const tokens = String(q || '').toLowerCase().split(/\s+/).filter(Boolean)
    if (!tokens.length) return products
    return products.filter(p => {
      const name = (p.name || '').toLowerCase()
      const sku = (p.sku || '').toLowerCase()
      const cat = (p.category || '').toLowerCase()
      return tokens.every(t => name.includes(t) || sku.includes(t) || cat.includes(t))
    })
  }, [products, q])

  const isCash = payment === 'cash'
  const canCheckout = cart.length > 0 && isCash

  const openPay = () => {
    if (!canCheckout) return // non-cash: coming soon
    setCashInput(String(total || ''))
    setPayError('')
    setShowPay(true)
  }

  const confirmPay = async () => {
    setPayError('')
    const cash = Number(cashInput || 0)
    if (isNaN(cash)) { setPayError('Nominal tidak valid'); return }
    if (cash < total) { setPayError('Uang kurang dari total belanja'); return }
    await checkout(cash)
  }

  const checkout = async (cashReceived = null) => {
    const items = cart.map(({product_id, item_type, qty}) => ({product_id, item_type, qty}))
    const payload = { items, payment_method: payment }
    if (isCash && cashReceived != null) payload.cash_received = Number(cashReceived)

    const r = await axios.post('/sales', payload)
    setShowPay(false)
    setCart([])
    nav(`/cashier/receipt/${r.data.id}`)
  }

  // helper untuk update qty pada cart (termasuk hapus saat 0)
  const setQty = (index, q) => {
    const next = [...cart]
    const n = Number(q || 0)
    if (n <= 0) {
      next.splice(index, 1) // qty 0 → hapus item
    } else {
      next[index].qty = n
    }
    setCart(next)
  }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="md:col-span-2 space-y-3">
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Cari SKU / Nama / Kategori"
            value={q}
            onChange={e=>setQ(e.target.value)}
          />
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {filtered.map(p => {
            const stockUnits = Number(p.stock_units || 0)
            const stockPacks = getAvailPack(p)
            const disableUnit = stockUnits <= 0
            const disablePack = stockPacks <= 0
            return (
              <div key={p.id} className="border rounded p-3">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-gray-500 mb-1">
                  {p.sku || '—'} • {p.category || 'Tanpa Kategori'} • Pack {p.pack_size} {p.unit_name}
                </div>

                {/* Harga */}
                <div className="text-sm">Unit: {Number(p.retail_price_per_unit).toLocaleString()}</div>
                <div className="text-sm">Pack: {Number(p.wholesale_price_per_pack).toLocaleString()}</div>

                {/* Stok */}
                <div className="mt-1 text-xs text-gray-600">
                  Stok Unit: <b>{stockUnits.toLocaleString()}</b> • Stok Pack: <b>{stockPacks.toLocaleString()}</b>
                </div>

                <div className="flex gap-2 mt-2">
                  <button
                    className={`px-2 py-1 border rounded ${disableUnit ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={()=>add(p,'unit')}
                    disabled={disableUnit}
                    title={disableUnit ? 'Stok unit habis' : ''}
                  >
                    + Unit
                  </button>
                  <button
                    className={`px-2 py-1 border rounded ${disablePack ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={()=>add(p,'pack')}
                    disabled={disablePack}
                    title={disablePack ? 'Stok pack habis' : ''}
                  >
                    + Pack
                  </button>
                </div>
              </div>
            )
          })}
          {!filtered.length && (
            <div className="col-span-full text-sm text-gray-500">Tidak ada produk yang cocok.</div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* Cart */}
        <div className="card">
          <div className="font-medium mb-2">Cart</div>
          <div className="space-y-2">
            {cart.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2">
                <div className="text-sm">
                  {c.name} <span className="text-gray-500">({c.item_type})</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="px-2 border rounded"
                    onClick={() => setQty(idx, Number(c.qty) - 1)}
                  >
                    -
                  </button>

                  <input
                    className="w-16 input text-center"
                    type="number"
                    min={0}
                    value={c.qty}
                    onFocus={(e) => e.target.select()}  // auto-select saat fokus
                    onClick={(e) => e.target.select()}  // auto-select saat klik
                    onChange={(e) => setQty(idx, e.target.value)}
                  />

                  <button
                    className="px-2 border rounded"
                    onClick={() => setQty(idx, Number(c.qty) + 1)}
                  >
                    +
                  </button>
                </div>

                <div className="w-24 text-right">{Number(c.price * c.qty).toLocaleString()}</div>

                <button
                  className="text-red-600"
                  onClick={() => {
                    const next = [...cart]
                    next.splice(idx, 1)
                    setCart(next)
                  }}
                  title="Hapus item"
                >
                  x
                </button>
              </div>
            ))}
            {!cart.length && <div className="text-sm text-gray-500">Belum ada item</div>}
          </div>
        </div>

        <div className="card space-y-1">
          <div className="flex justify-between"><span>Subtotal</span><span>{subtotal.toLocaleString()}</span></div>
          <div className="flex justify-between font-semibold text-lg"><span>Total</span><span>{total.toLocaleString()}</span></div>
          <div className="flex gap-2 mt-2">
            <select className="input" value={payment} onChange={e=>setPayment(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="qris">QRIS</option>
              <option value="card">Card</option>
            </select>
            <button
              className={`flex-1 ${canCheckout ? 'btn-primary' : 'px-3 py-2 border rounded bg-gray-100 text-gray-500 cursor-not-allowed'}`}
              onClick={openPay}
              disabled={!canCheckout}
              title={payment !== 'cash' ? 'Coming soon' : (cart.length ? '' : 'Cart kosong')}
            >
              {payment === 'cash' ? 'Checkout' : 'Coming soon'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal pembayaran cash */}
      {showPay && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Pembayaran Tunai</h2>
              <button className="text-gray-500" onClick={()=>setShowPay(false)}>✕</button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Belanja</span>
                <span className="font-semibold">{total.toLocaleString()}</span>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Uang Diterima</label>
                <input
                  className="input w-full"
                  type="number"
                  min={total}
                  value={cashInput}
                  onChange={e=>setCashInput(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex justify-between">
                <span>Kembalian</span>
                <span className="font-semibold">
                  {Math.max(0, Number(cashInput || 0) - total).toLocaleString()}
                </span>
              </div>
              {payError && <div className="text-red-600 text-sm">{payError}</div>}
              <div className="flex gap-2 pt-2">
                <button className="px-3 py-2 border rounded w-32" onClick={()=>setShowPay(false)}>Batal</button>
                <button
                  className="btn-primary flex-1"
                  onClick={confirmPay}
                  disabled={Number(cashInput||0) < total}
                  title={Number(cashInput||0) < total ? 'Uang kurang dari total' : ''}
                >
                  Bayar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
