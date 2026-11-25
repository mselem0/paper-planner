import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/archivo-black'
import '@fontsource/caveat/400.css'
import '@fontsource/caveat/700.css'
import '@fontsource/nunito/400.css'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import '@fontsource/nunito/800.css'
import '@fontsource/amiri-quran'
import './styles/tokens.css'
import './styles/global.css'
import { App } from './app/App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
