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

  return (
    <div className="bg-white p-3 rounded shadow">
      <div className="mb-2 flex gap-2">
        <button
          className="px-3 py-2 border rounded bg-gray-100 hover:bg-gray-200"
          onClick={()=>nav(-1)}
        >
          ← Back
        </button>
        <button
          className="btn-primary"
          onClick={()=>window.print()}
        >
          Print
        </button>
      </div>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
