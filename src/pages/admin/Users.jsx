import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

export default function Users() {
  // list & filter
  const [list, setList] = useState([])
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)

  // modal create
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // modal change password
  const [openChangePw, setOpenChangePw] = useState(false)
  const [changePwUser, setChangePwUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [pwSubmitting, setPwSubmitting] = useState(false)

  // form user
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'cashier',
    supplier_id: ''
  })

  // supplier search
  const [supQuery, setSupQuery] = useState('')
  const [supList, setSupList] = useState([])
  const [supLoading, setSupLoading] = useState(false)

  // create supplier inline
  const [makeNewSupplier, setMakeNewSupplier] = useState(false)
  const [newSup, setNewSup] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    pic_name: ''
  })

  // ===== load users
  const load = async () => {
    setLoading(true)
    try {
      const r = await axios.get('/users', { params: { search, role } })
      setList(r.data.data || [])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const submitFilter = async (e) => {
    e?.preventDefault?.()
    await load()
  }

  // ===== actions
  const del = async (id) => {
    if (!window.confirm('Nonaktifkan user ini?')) return
    await axios.delete(`/users/${id}`)
    await load()
  }

  const resetPw = async (id) => {
    if (!window.confirm('Reset password user ini ke default?')) return
    await axios.post(`/users/${id}/reset-password`)
    alert('Password di-reset (default).')
  }

  const openChangePassword = (u) => {
    setChangePwUser(u)
    setNewPassword('')
    setOpenChangePw(true)
  }

  const doChangePassword = async () => {
    try {
      if (!newPassword.trim()) {
        alert('Password baru wajib diisi')
        return
      }
      setPwSubmitting(true)
      await axios.post(`/users/${changePwUser.id}/change-password`, { password: newPassword })
      alert('Password berhasil diganti.')
      setOpenChangePw(false)
    } catch (err) {
      alert(err?.response?.data?.message || 'Gagal mengganti password')
    } finally {
      setPwSubmitting(false)
    }
  }

  const openCreate = () => {
    setForm({ name: '', email: '', phone: '', role: 'cashier', supplier_id: '' })
    setSupQuery('')
    setSupList([])
    setMakeNewSupplier(false)
    setNewSup({ name: '', phone: '', email: '', address: '', pic_name: '' })
    setErrorMsg('')
    setOpen(true)
  }

  const validateEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).toLowerCase())

  const doCreate = async () => {
    try {
      setSubmitting(true)
      setErrorMsg('')
      if (!form.name.trim()) throw new Error('Nama wajib')
      if (!form.email.trim()) throw new Error('Email wajib')
      if (!validateEmail(form.email)) throw new Error('Format email tidak valid')
      if (!form.role) throw new Error('Role wajib')

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone?.trim() || '',
        role: form.role
      }

      if (form.role === 'supplier') {
        if (makeNewSupplier) {
          if (!newSup.name.trim()) throw new Error('Nama supplier wajib')
          payload.supplier_new = {
            name: newSup.name.trim(),
            phone: newSup.phone?.trim() || '',
            email: newSup.email?.trim() || '',
            address: newSup.address?.trim() || '',
            pic_name: newSup.pic_name?.trim() || ''
          }
        } else {
          if (!form.supplier_id) throw new Error('Pilih supplier terlebih dahulu')
          payload.supplier_id = Number(form.supplier_id)
        }
      }

      await axios.post('/users', payload)
      setOpen(false)
      await load()
      alert('User berhasil dibuat')
    } catch (e) {
      setErrorMsg(e?.response?.data?.message || e.message || 'Gagal membuat user')
    } finally {
      setSubmitting(false)
    }
  }

  const searchSuppliers = async (q) => {
    setSupQuery(q)
    setForm((f) => ({ ...f, supplier_id: '' }))
    if (q.trim().length < 2) { setSupList([]); return }
    setSupLoading(true)
    try {
      const r = await axios.get(`/suppliers?search=${encodeURIComponent(q)}`)
      setSupList(r.data.data || [])
    } finally { setSupLoading(false) }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return list.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    )
  }, [list, search])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Kelola User</h1>
        <button className="btn-primary" onClick={openCreate}>+ User Baru</button>
      </div>

      {/* Filter */}
      <form onSubmit={submitFilter} className="card grid md:grid-cols-4 gap-2">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Cari</label>
          <input className="input" placeholder="Nama atau Email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Semua</option>
            <option value="admin">Admin</option>
            <option value="cashier">Cashier</option>
            <option value="supplier">Supplier</option>
          </select>
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Loading…' : 'Terapkan'}
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Nama</th>
              <th>Email</th>
              <th>Role</th>
              <th>Supplier</th>
              <th>Phone</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="py-2 font-medium">{u.name}</td>
                <td>{u.email}</td>
                <td className="uppercase">{u.role}</td>
                <td>{u.role === 'supplier' ? (u.supplier_name || (u.supplier_id ? `#${u.supplier_id}` : '-')) : '-'}</td>
                <td>{u.phone || '-'}</td>
                <td className="space-x-3">
                  <button className="text-blue-600 hover:underline" onClick={() => resetPw(u.id)}>Reset</button>
                  <button className="text-green-600 hover:underline" onClick={() => openChangePassword(u)}>Ganti Password</button>
                  <button className="text-red-600 hover:underline" onClick={() => del(u.id)}>Nonaktifkan</button>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td className="py-4 text-gray-500" colSpan={6}>Tidak ada data</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Create User */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          {/* isi form user seperti sebelumnya */}
        </div>
      )}

      {/* Modal Change Password */}
      {openChangePw && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Ganti Password</h2>
              <button className="text-gray-500" onClick={() => setOpenChangePw(false)}>✕</button>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password Baru</label>
              <input
                type="password"
                className="input w-full"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button className="px-3 py-2 border rounded w-32" onClick={() => setOpenChangePw(false)}>Batal</button>
              <button className="btn-primary flex-1" onClick={doChangePassword} disabled={pwSubmitting}>
                {pwSubmitting ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
