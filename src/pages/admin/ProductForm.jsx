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
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(()=>{
    if (!isNew){
      axios.get(`/products/${id}`).then(r => setForm({ ...r.data.data }))
    }
  }, [id, isNew])

  const submit = async (e) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      const fd = new FormData()
      for (const k in form) {
        if (form[k]!==undefined && form[k]!==null) fd.append(k, form[k])
      }
      if (image) fd.append('image', image)

      if (isNew) {
        await axios.post('/products', fd)
      } else {
        await axios.put(`/products/${id}`, fd)
      }
      nav('/admin/products')
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || err.message || 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const removeProduct = async () => {
    if (isNew) return
    if (!window.confirm('Yakin ingin menghapus produk ini? Tindakan ini tidak bisa dibatalkan.')) return
    if (deleting) return
    setDeleting(true)
    try {
      await axios.delete(`/products/${id}`)
      alert('Produk berhasil dihapus')
      nav('/admin/products')
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || err.message || 'Gagal menghapus produk')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{isNew ? 'New' : 'Edit'} Product</h1>

        {!isNew && (
          <button
            type="button"
            onClick={removeProduct}
            className="px-3 py-2 rounded border border-red-500 text-red-600 hover:bg-red-50"
            disabled={deleting}
            title="Hapus produk ini"
          >
            {deleting ? 'Menghapus…' : 'Hapus Produk'}
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Nama Produk</label>
          <input className="input" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">SKU (opsional)</label>
          <input className="input" value={form.sku||''} onChange={e=>setForm({...form, sku:e.target.value})} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Kategori</label>
          <input className="input" value={form.category||''} onChange={e=>setForm({...form, category:e.target.value})} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Satuan</label>
          <input className="input" value={form.unit_name||''} onChange={e=>setForm({...form, unit_name:e.target.value})} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Isi per Pack</label>
          <input className="input" type="number" value={form.pack_size||0} onChange={e=>setForm({...form, pack_size:e.target.value})} />
        </div>

        {/* Hanya saat CREATE */}
        {isNew && (
          <div>
            <label className="block text-sm font-medium mb-1">Stok Awal (UNIT)</label>
            <input
              className="input"
              type="number"
              min={0}
              value={form.initial_stock_units||0}
              onChange={e=>setForm({...form, initial_stock_units: e.target.value})}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Stok Minimum (UNIT)</label>
          <input className="input" type="number" value={form.min_stock_units||0} onChange={e=>setForm({...form, min_stock_units:e.target.value})} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Stok Maksimum (UNIT)</label>
          <input className="input" type="number" value={form.max_stock_units||0} onChange={e=>setForm({...form, max_stock_units:e.target.value})} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Harga Grosir per Pack</label>
          <input className="input" type="number" value={form.wholesale_price_per_pack||0} onChange={e=>setForm({...form, wholesale_price_per_pack:e.target.value})} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Harga Ecer per Unit</label>
          <input className="input" type="number" value={form.retail_price_per_unit||0} onChange={e=>setForm({...form, retail_price_per_unit:e.target.value})} />
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

      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>

        {!isNew && (
          <button
            type="button"
            onClick={removeProduct}
            className="px-3 py-2 rounded border border-red-500 text-red-600 hover:bg-red-50"
            disabled={deleting}
          >
            {deleting ? 'Menghapus…' : 'Hapus Produk'}
          </button>
        )}
      </div>
    </form>
  )
}
