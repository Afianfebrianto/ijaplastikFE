
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'

const empty = {
  name:'', sku:'', category:'',
  pack_size:20, unit_name:'pcs',
  wholesale_price_per_pack:0, retail_price_per_unit:0,
  min_stock_units:0, max_stock_units:1000,
  initial_stock_units: 0
}

export default function ProductForm(){
  const nav = useNavigate()
  const { id } = useParams()
  const isNew = !id
  const [form, setForm] = useState(empty)
  const [image, setImage] = useState(null)

  useEffect(()=>{
    if (!isNew){
      axios.get(`/products/${id}`).then(r => setForm({ ...r.data.data }))
    }
  }, [id, isNew])

  const submit = async (e) => {
    e.preventDefault()
    const fd = new FormData()
    for (const k in form) if (form[k]!==undefined && form[k]!==null) fd.append(k, form[k])
    if (image) fd.append('image', image)
    if (isNew) await axios.post('/products', fd)
    else await axios.put(`/products/${id}`, fd)
    nav('/admin/products')
  }

  return (
     <form onSubmit={submit} className="space-y-3 max-w-2xl">
      <h1 className="text-xl font-semibold">{isNew ? 'New' : 'Edit'} Product</h1>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Nama Produk</label>
          <input className="input" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">SKU (opsional)</label>
          <input className="input" value={form.sku} onChange={e=>setForm({...form, sku:e.target.value})} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Kategori</label>
          <input className="input" value={form.category||''} onChange={e=>setForm({...form, category:e.target.value})} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Satuan</label>
          <input className="input" value={form.unit_name} onChange={e=>setForm({...form, unit_name:e.target.value})} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Isi per Pack</label>
          <input className="input" type="number" value={form.pack_size} onChange={e=>setForm({...form, pack_size:e.target.value})} />
        </div>

        {/* TAMPILKAN HANYA SAAT CREATE */}
        {isNew && (
          <div>
            <label className="block text-sm font-medium mb-1">Stok Awal (UNIT)</label>
            <input
              className="input"
              type="number"
              min={0}
              value={form.initial_stock_units}
              onChange={e=>setForm({...form, initial_stock_units: e.target.value})}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Stok Minimum (UNIT)</label>
          <input className="input" type="number" value={form.min_stock_units} onChange={e=>setForm({...form, min_stock_units:e.target.value})} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Stok Maksimum (UNIT)</label>
          <input className="input" type="number" value={form.max_stock_units} onChange={e=>setForm({...form, max_stock_units:e.target.value})} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Harga Grosir per Pack</label>
          <input className="input" type="number" value={form.wholesale_price_per_pack} onChange={e=>setForm({...form, wholesale_price_per_pack:e.target.value})} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Harga Ecer per Unit</label>
          <input className="input" type="number" value={form.retail_price_per_unit} onChange={e=>setForm({...form, retail_price_per_unit:e.target.value})} />
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">Gambar Produk (opsional)</label>
        <input className="input" type="file" accept="image/*" onChange={e=>setImage(e.target.files?.[0]||null)} />
      </div>

      {(image || form.image_url) && (
        <div className="mt-2">
          <div className="text-xs text-gray-500 mb-1">Preview</div>
          <img
            src={image ? URL.createObjectURL(image) : form.image_url}
            alt="preview"
            className="w-full max-w-sm aspect-[4/3] object-cover rounded border"
          />
        </div>
      )}

      <button className="btn-primary">Save</button>
    </form>
  )
}
