
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

export default function Receipt(){
  const { id } = useParams()
  const [html, setHtml] = useState('')

  useEffect(()=>{
    axios.get(`/sales/${id}/receipt`, { responseType:'text' }).then(r=> setHtml(r.data || ''))
  },[id])

  return (
    <div className="bg-white p-3 rounded shadow">
      <div className="mb-2 flex gap-2">
        <button className="btn-primary" onClick={()=>window.print()}>Print</button>
      </div>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
