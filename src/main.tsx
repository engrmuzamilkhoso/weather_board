// Global styles first, so component styles (imported by App) can override the base classes.
import '@fontsource-variable/inter'
import './styles/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ToastProvider } from './components/Toast/ToastProvider'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root is missing from index.html')

createRoot(root).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
