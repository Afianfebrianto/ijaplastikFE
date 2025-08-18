
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import Products from './pages/admin/Products.jsx'
import ProductForm from './pages/admin/ProductForm.jsx'
import POS from './pages/cashier/POS.jsx'
import Receipt from './pages/cashier/Receipt.jsx'
import CreatePO from './pages/admin/CreatePO.jsx'
import ReceiveGRN from './pages/admin/ReceiveGRN.jsx'
import SupplierDashboard from './pages/supplier/SupplierDashboard.jsx'
import NotFound from './pages/NotFound.jsx'
import { useAuth } from './state/AuthContext.jsx'
import RoleGuard from './components/RoleGuard.jsx'
import Shell from './components/Shell.jsx'
import PoDetail from './pages/supplier/PoDetail.jsx';
import ReceiveGRNDetail from './pages/admin/ReceiveGRNDetail.jsx'
import CashierReport from './pages/admin/CashierReport.jsx';
import Users from './pages/admin/Users.jsx'

export default function App(){
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={<Login/>} />
      <Route element={<Shell/>}>
        <Route path="/" element={user ? <Navigate to={`/${user.role}`} /> : <Navigate to="/login" />} />
        <Route element={<RoleGuard roles={['admin']} />}>
          <Route path="/admin" element={<AdminDashboard/>} />
          <Route path="/admin/products" element={<Products/>} />
          <Route path="/admin/products/new" element={<ProductForm/>} />
          <Route path="/admin/products/:id" element={<ProductForm/>} />
          <Route path="/admin/purchase/new" element={<CreatePO/>} />
          <Route path="/admin/purchase/receive" element={<ReceiveGRN/>} />
          <Route path="/admin/purchase/:id/receive" element={<ReceiveGRNDetail/>}/>
           <Route path="/admin/reports/cashier" element={<CashierReport/>} /> 
            <Route path="/admin/users" element={<Users/>} />
        </Route>
        <Route element={<RoleGuard roles={['cashier','admin']} />}>
          <Route path="/cashier" element={<POS/>} />
          <Route path="/cashier/receipt/:id" element={<Receipt/>} />
        </Route>
        <Route element={<RoleGuard roles={['supplier']} />}>
          <Route path="/supplier" element={<SupplierDashboard/>} />
          <Route path="/supplier/po/:id" element={<PoDetail/>} />
        </Route>
        <Route path="*" element={<NotFound/>} />
      </Route>
    </Routes>
  )
}
