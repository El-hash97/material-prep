import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { db } from './store/db'

const root = createRoot(document.getElementById('root'))
const render = (boot) => root.render(<StrictMode><App boot={boot} onRetry={start} /></StrictMode>)

// Shell + skeleton dashboard langsung tampil; data dari API mengisi setelahnya. Gagal → kartu error + Coba lagi.
function start() {
  render('loading')
  db.init()
    .then(() => render('ready'))
    .catch(e => { console.error(e); render('error') })
}
start()
