import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

function ProductCard({ p }) {
  const img = p.image_url || ''
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition">
      {/* Image on top */}
      <div className="bg-gray-100">
        {img ? (
          <img
            src={img}
            alt={p.name}
            loading="lazy"
            className="w-full aspect-[4/3] object-cover"
          />
        ) : (
          <div className="w-full aspect-[4/3] grid place-items-center text-gray-400 text-sm">
            no image
          </div>
        )}
      </div>

      {/* Details below */}
      <div className="p-3 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold leading-tight">{p.name}</div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">
            {p.sku || '—'}
          </span>
        </div>

        <div className="text-xs text-gray-500">
          {p.category || 'Uncategorized'} • Pack {p.pack_size} {p.unit_name}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm mt-2">
          <div className="bg-gray-50 rounded p-2">
            <div className="text-[11px] text-gray-500">Harga Unit</div>
            <div className="font-medium">
              {Number(p.retail_price_per_unit).toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <div className="text-[11px] text-gray-500">Harga Pack</div>
            <div className="font-medium">
              {Number(p.wholesale_price_per_pack).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="text-sm">
            <span className="text-gray-500">Stok: </span>
            <span className="font-medium">{p.stock_units}</span>
          </div>
          <Link
            to={`/admin/products/${p.id}`}
            className="text-sm text-blue-600 hover:underline"
          >
            Edit
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function Products() {
  const [data, setData] = useState([])
  const [q, setQ] = useState('')

  const load = async () => {
    const r = await axios.get('/products')
    setData(r.data.data || [])
  }
  useEffect(() => { load() }, [])

  // === Multi-search: setiap token harus match di name/sku/category (case-insensitive)
  const filtered = useMemo(() => {
    const tokens = String(q || '').toLowerCase().split(/\s+/).filter(Boolean)
    if (!tokens.length) return data
    return data.filter(p => {
      const name = (p.name || '').toLowerCase()
      const sku = (p.sku || '').toLowerCase()
      const cat = (p.category || '').toLowerCase()
      return tokens.every(t => name.includes(t) || sku.includes(t) || cat.includes(t))
    })
  }, [data, q])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-semibold">Products</h1>
        <div className="flex gap-2 w-full md:w-auto">
          <input
            className="input flex-1 md:w-72"
            placeholder="Cari SKU / Nama / Kategori"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <Link to="/admin/products/new" className="btn-primary whitespace-nowrap">+ New</Link>
        </div>
      </div>

      {/* Grid of cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map(p => <ProductCard key={p.id} p={p} />)}
        {!filtered.length && (
          <div className="text-sm text-gray-500">Tidak ada produk yang cocok.</div>
        )}
      </div>
    </div>
  )
}
