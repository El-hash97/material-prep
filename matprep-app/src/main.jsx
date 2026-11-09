import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { db } from './store/db'

const root = createRoot(document.getElementById('root'))

db.init()
  .then(() => root.render(<StrictMode><App /></StrictMode>))
  .catch(e => {
    console.error(e)
    document.getElementById('root').textContent = 'Gagal memuat data dari database. Muat ulang halaman.'
  })
