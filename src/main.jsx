import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const savedTheme = localStorage.getItem('flashMemoUiTheme')
const initialTheme =
  savedTheme === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'neon'
      : 'classic'
    : savedTheme === 'classic' || savedTheme === 'neon' || savedTheme === 'glass'
      ? savedTheme
      : 'classic'
if (initialTheme) {
  document.documentElement.setAttribute('data-theme', initialTheme)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
