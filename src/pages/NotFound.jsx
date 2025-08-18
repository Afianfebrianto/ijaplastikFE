
import { Link } from 'react-router-dom'
export default function NotFound(){
  return (
    <div className="p-10 text-center space-y-2">
      <div className="text-3xl font-bold">404</div>
      <div>Halaman tidak ditemukan</div>
      <Link to="/" className="text-blue-600 underline">Kembali</Link>
    </div>
  )
}
