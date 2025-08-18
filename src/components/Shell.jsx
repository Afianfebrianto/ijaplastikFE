
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'

export default function Shell(){
  const { user, logout } = useAuth()
  const loc = useLocation()
  const nav = [
    ...(user?.role==='admin' ? [
      { to:'/admin', label:'Dashboard' },
      { to:'/admin/products', label:'Products' },
      { to:'/admin/purchase/new', label:'Create PO' },
      { to:'/admin/purchase/receive', label:'Receive GRN' },
      { to:'/admin/reports/cashier', label:'Laporan Kasir' },
      { to:'/admin/users', label:'Users' },
    ]: []),
    ...(user?.role==='cashier' || user?.role==='admin' ? [
      { to:'/cashier', label:'POS' }
    ]: []),
    ...(user?.role==='supplier' ? [
      { to:'/supplier', label:'Supplier' }
    ]: [])
  ]
  if (loc.pathname.startsWith('/login')) return <Outlet/>
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-semibold">IjaPlastik</div>
          <nav className="flex gap-4">
            {nav.map(n => <Link key={n.to} className="text-sm hover:underline" to={n.to}>{n.label}</Link>)}
          </nav>
          <div className="text-sm flex items-center gap-3">
            <span>{user?.name} <span className="uppercase text-gray-500">({user?.role})</span></span>
            <button onClick={logout} className="px-2 py-1 border rounded">Logout</button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4">
        <Outlet/>
      </main>
    </div>
  )
}
