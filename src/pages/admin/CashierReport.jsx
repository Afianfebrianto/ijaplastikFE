import { useEffect, useMemo, useState, useRef } from 'react'
import axios from 'axios'

function ymd(d){
  const pad = n => String(n).toString().padStart(2,'0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
}

export default function CashierReport(){
  const today = useMemo(()=> new Date(), [])

  // hitung awal & akhir bulan berjalan
  const monthStart = useMemo(()=> new Date(today.getFullYear(), today.getMonth(), 1), [today])
  const monthEnd   = useMemo(()=> new Date(today.getFullYear(), today.getMonth()+1, 0), [today])

  // default: bulan ini
  const [dateFrom, setDateFrom] = useState(ymd(monthStart))
  const [dateTo,   setDateTo]   = useState(ymd(monthEnd))

  const [cashiers, setCashiers] = useState([])
  const [cashierId, setCashierId] = useState('')
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(null)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  // dialog receipt
  const [showDetail, setShowDetail] = useState(false)
  const [activeSale, setActiveSale] = useState(null)
  const [receiptHtml, setReceiptHtml] = useState('')
  const [loadingReceipt, setLoadingReceipt] = useState(false)
  const receiptBoxRef = useRef(null)

  useEffect(()=>{ axios.get('/reports/cashiers').then(r=> setCashiers(r.data.data||[])) },[])

  const load = async () => {
    setLoading(true)
    try {
      const params = { date_from: dateFrom, date_to: dateTo, page, limit }
      if (cashierId) params.cashier_id = cashierId
      const r = await axios.get('/reports/cashier', { params })
      setRows(r.data.data || [])
      setSummary(r.data.summary || null)
      setTotal(r.data.total || 0)
    } finally { setLoading(false) }
  }

  // load awal & saat ganti halaman
  useEffect(()=>{ load() }, [page])

  const submitFilter = async (e) => { e?.preventDefault?.(); setPage(1); await load() }

  const pages = useMemo(()=> Math.max(1, Math.ceil(total/limit)), [total, limit])

  const csvUrl = useMemo(()=>{
    const qs = new URLSearchParams({ date_from: dateFrom, date_to: dateTo, ...(cashierId?{cashier_id:cashierId}:{}) }).toString()
    return `/reports/cashier.csv?${qs}`
  }, [dateFrom, dateTo, cashierId])

  // 1) Tambah handler ini di dalam komponen
const handleExportCsv = async () => {
  try {
    const params = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
      ...(cashierId ? { cashier_id: cashierId } : {})
    }).toString();

    // pakai axios agar lewat proxy + include cookie/session
    const response = await axios.get(`/reports/cashier.csv?${params}`, {
      responseType: 'blob',
      withCredentials: true,           // penting kalau auth berbasis cookie httpOnly
      headers: { Accept: 'text/csv' }, // optional
    });

    // bikin file buat diunduh
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cashier-report_${dateFrom}_to_${dateTo}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export CSV gagal:', err);
    alert('Gagal mengekspor CSV. Coba lagi atau cek login/izin admin.');
  }
};



  const openDetail = async (saleRow) => {
    try {
      setActiveSale(saleRow)
      setShowDetail(true)
      setLoadingReceipt(true)
      setReceiptHtml('')
      const { data } = await axios.get(`/sales/${saleRow.id}/receipt`, {
        responseType: 'text',
        headers: { 'Accept': 'text/html' },
        withCredentials: true
      })
      setReceiptHtml(String(data || ''))
    } catch (e) {
      setReceiptHtml('<div style="padding:8px;color:#b91c1c">Gagal memuat receipt.</div>')
    } finally {
      setLoadingReceipt(false)
    }
  }

  const closeDetail = () => {
    setShowDetail(false)
    setActiveSale(null)
    setReceiptHtml('')
  }

  const printReceipt = () => {
    if (!receiptHtml) return;
    const html = receiptHtml.includes('<html')
      ? receiptHtml
      : `<!doctype html><html><head><meta charset="utf-8"></head><body>${receiptHtml}</body></html>`;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    Object.assign(iframe.style, { position:'fixed', right:'0', bottom:'0', width:'0', height:'0', border:'0', visibility:'hidden' });
    document.body.appendChild(iframe);

    let printed = false;
    let fallbackTimer;

    const cleanup = () => {
      if (iframe && iframe.parentNode) {
        try { iframe.parentNode.removeChild(iframe); } catch {}
      }
    };
    const doPrint = () => {
      if (printed) return;
      printed = true;
      try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); }
      finally { setTimeout(cleanup, 300); }
    };

    iframe.addEventListener('load', () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      setTimeout(doPrint, 50);
    }, { once:true });

    fallbackTimer = setTimeout(doPrint, 1200);
    iframe.srcdoc = html;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Laporan Kasir</h1>
       <div className="flex items-center justify-between">
  <h1 className="text-xl font-semibold">Laporan Kasir</h1>
  <button className="px-3 py-2 border rounded" onClick={handleExportCsv}>
    Export CSV
  </button>
</div>
      </div>

      <form onSubmit={submitFilter} className="card grid md:grid-cols-5 gap-2">
        <div>
          <label className="block text-sm font-medium mb-1">Dari Tanggal</label>
          <input className="input" type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Sampai</label>
          <input className="input" type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Kasir</label>
          <select className="input" value={cashierId} onChange={e=>setCashierId(e.target.value)}>
            <option value=''>Semua Kasir</option>
            {cashiers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full" disabled={loading}>{loading?'Loading…':'Terapkan'}</button>
        </div>
      </form>

      {/* Ringkasan */}
      <div className="grid md:grid-cols-4 gap-3">
        <div className="card"><div className="text-sm text-gray-500">Transaksi</div><div className="text-2xl font-bold">{summary?.trx || 0}</div></div>
        <div className="card"><div className="text-sm text-gray-500">Units Terjual</div><div className="text-2xl font-bold">{Number(summary?.units_sold||0).toLocaleString()}</div></div>
        <div className="card"><div className="text-sm text-gray-500">Subtotal</div><div className="text-2xl font-bold">{Number(summary?.subtotal||0).toLocaleString()}</div></div>
        <div className="card"><div className="text-sm text-gray-500">Omzet (Total)</div><div className="text-2xl font-bold">{Number(summary?.omzet||0).toLocaleString()}</div></div>
      </div>

      {/* Tabel */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Tanggal</th>
              <th>Receipt</th>
              <th>Kasir</th>
              <th>Items</th>
              <th>Units</th>
              <th>Subtotal</th>
              <th>Total</th>
              <th>Pay</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b">
                <td className="py-2">{new Date(r.created_at).toLocaleString()}</td>
                <td>{r.receipt_no}</td>
                <td>{r.cashier_name}</td>
                <td>{r.item_count}</td>
                <td>{r.units_sold}</td>
                <td>{Number(r.subtotal).toLocaleString()}</td>
                <td className="font-medium">{Number(r.total).toLocaleString()}</td>
                <td className="uppercase text-gray-600">{r.payment_method}</td>
                <td>
                  <button className="text-blue-600 hover:underline" onClick={()=>openDetail(r)}>
                    Lihat
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td className="py-4 text-gray-500" colSpan={9}>Tidak ada data</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Dialog Receipt */}
      {showDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-semibold">
                {activeSale?.receipt_no || 'Receipt'}
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 border rounded" onClick={closeDetail}>Back</button>
                <button className="btn-primary" onClick={printReceipt} disabled={!receiptHtml || loadingReceipt}>
                  {loadingReceipt ? 'Loading…' : 'Print'}
                </button>
              </div>
            </div>
            <div ref={receiptBoxRef} className="p-3 max-h-[75vh] overflow-auto">
              {loadingReceipt && <div className="text-sm text-gray-500">Memuat receipt…</div>}
              {!loadingReceipt && (
                <div dangerouslySetInnerHTML={{ __html: receiptHtml }} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
