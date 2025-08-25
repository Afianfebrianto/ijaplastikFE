import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import ResultDialog from '../../components/ResultDialog'     // <-- sesuaikan path
import ConfirmDialog from '../../components/ConfirmDialog'   // <-- sesuaikan path

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

  // ResultDialog state
  const [dlgOpen, setDlgOpen] = useState(false)
  const [dlgType, setDlgType] = useState('success') // 'success' | 'error'
  const [dlgTitle, setDlgTitle] = useState('')
  const [dlgMsg, setDlgMsg] = useState('')
  const [dlgAutoClose, setDlgAutoClose] = useState(undefined)
  const afterCloseRef = useRef(null)

  const openDialog = useCallback((type, title, message, { autoCloseMs, afterClose } = {}) => {
    setDlgType(type)
    setDlgTitle(title)
    setDlgMsg(message)
    setDlgAutoClose(autoCloseMs)
    afterCloseRef.current = typeof afterClose === 'function' ? afterClose : null
    setDlgOpen(true)
  }, [])
  const closeDialog = useCallback(() => {
    setDlgOpen(false)
    if (afterCloseRef.current) {
      const cb = afterCloseRef.current
      afterCloseRef.current = null
      cb()
    }
  }, [])

  // ConfirmDialog state
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(()=>{
    if (!isNew){
      axios.get(`/products/${id}`)
        .then(r => setForm({ ...r.data.data }))
        .catch(err => {
          const msg = err.response?.data?.message || err.message || 'Gagal memuat produk'
          openDialog('error', 'Gagal Memuat', msg)
        })
    }
  }, [id, isNew, openDialog])

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
        openDialog(
          'success',
          'Produk Berhasil Dibuat',
          `Produk "${form.name}" telah disimpan.`,
          { autoCloseMs: 1200, afterClose: () => nav('/admin/products') }
        )
      } else {
        await axios.put(`/products/${id}`, fd)
        openDialog(
          'success',
          'Perubahan Tersimpan',
          `Produk "${form.name}" telah diperbarui.`,
          { autoCloseMs: 1200, afterClose: () => nav('/admin/products') }
        )
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Gagal menyimpan produk.'
      openDialog('error', 'Gagal Menyimpan', msg)
    } finally {
      setSaving(false)
    }
  }

  const removeProduct = async () => {
    if (isNew) return
    setDeleting(true)
    try {
      await axios.delete(`/products/${id}`)
      openDialog(
        'success',
        'Produk Dihapus',
        `Produk "${form.name}" telah dihapus.`,
        { autoCloseMs: 1000, afterClose: () => nav('/admin/products') }
      )
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Gagal menghapus produk.'
      openDialog('error', 'Gagal Menghapus', msg)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-3 max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{isNew ? 'New' : 'Edit'} Product</h1>

          {!isNew && (
            <button
              type="button"
              onClick={()=>setConfirmOpen(true)}
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
              onClick={()=>setConfirmOpen(true)}
              className="px-3 py-2 rounded border border-red-500 text-red-600 hover:bg-red-50"
              disabled={deleting}
            >
              {deleting ? 'Menghapus…' : 'Hapus Produk'}
            </button>
          )}
        </div>
      </form>

      {/* Result Dialog */}
      <ResultDialog
        open={dlgOpen}
        type={dlgType}
        title={dlgTitle}
        message={dlgMsg}
        onClose={closeDialog}
        autoCloseMs={dlgAutoClose}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Konfirmasi Hapus"
        message={`Apakah Anda yakin ingin menghapus produk "${form.name}"? Tindakan ini tidak dapat dibatalkan.`}
        onCancel={()=>setConfirmOpen(false)}
        onConfirm={()=>{
          setConfirmOpen(false)
          removeProduct()
        }}
      />
    </>
  )
}
