import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/design-system.css'
import { testApiConnection } from './utils/api'

// 앱 시작 시 API 연결 테스트
testApiConnection().then((connected) => {
  if (connected) {
    console.log('🚀 앱이 시작되었습니다.')
  } else {
    console.warn('⚠️ API 연결에 문제가 있습니다. 일부 기능이 작동하지 않을 수 있습니다.')
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)



