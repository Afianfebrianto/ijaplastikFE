import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function Receipt(){
  const { id } = useParams()
  const [html, setHtml] = useState('')
  const nav = useNavigate()

  useEffect(()=>{
    axios
      .get(`/sales/${id}/receipt`, { responseType:'text' })
      .then(r=> setHtml(r.data || ''))
  },[id])

  // Opsi 1 (paling bersih): print hanya div struk via iframe
  const printOnlyReceipt = () => {
    const container = document.getElementById('receipt-root')
    const content = container ? container.innerHTML : ''

    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    Object.assign(iframe.style, {
      position:'fixed', right:'0', bottom:'0', width:'0', height:'0', border:'0', visibility:'hidden'
    })
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument || iframe.contentWindow.document
    doc.open()
    doc.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt</title>
  <style>
    /* CSS khusus print */
    @page { size: auto; margin: 8mm; }         /* atur margin sesuai kebutuhan printer */
    body { background: #fff; font-family: sans-serif; }
    /* kalau struk thermal, bisa set lebar kontainer */
    .receipt-paper { width: 80mm; }
  </style>
</head>
<body>
  <div class="receipt-paper">
    ${content}
  </div>
</body>
</html>`)
    doc.close()

    const doPrint = () => {
      try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); }
      finally { setTimeout(() => document.body.removeChild(iframe), 300) }
    }

    // tunggu render iframe
    if (iframe.contentWindow?.document?.readyState === 'complete') {
      doPrint()
    } else {
      iframe.onload = doPrint
    }
  }

  return (
    <>
      {/* Opsi 2: CSS global untuk sembunyikan elemen saat print */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>

      {/* Toolbar: jangan ikut ke-print */}
      <div className="no-print mb-2 flex gap-2">
        <button
          className="px-3 py-2 border rounded bg-gray-100 hover:bg-gray-200"
          onClick={()=>nav(-1)}
        >
          ← Back
        </button>
        {/* Pakai salah satu:
            - window.print() kalau sudah pakai .no-print di atas
            - printOnlyReceipt() untuk print bersih hanya konten struk */}
        <button className="btn-primary" onClick={printOnlyReceipt}>
          Print
        </button>
      </div>

      {/* Wrapper konten: kasih bg putih tapi tetap ke-print */}
      <div className="bg-white p-3 rounded shadow-sm">
        <div id="receipt-root" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </>
  )
}
