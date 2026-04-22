import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { LoadingProvider } from './contexts/LoadingContext';
import { ActiveProfileProvider } from './contexts/ActiveProfileContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LoadingProvider>
      <ActiveProfileProvider>
      <App />
      </ActiveProfileProvider>
    </LoadingProvider>
  </React.StrictMode>,
)