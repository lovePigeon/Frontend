import { useState, useEffect } from 'react'
import { apiClient } from '../../utils/api'
import './ImprovementStatus.css'

interface ImprovementArea {
  category: string
  description: string
  status: 'improving' | 'stable' | 'monitoring' | 'completed'
  progress: number
  lastUpdate: string
  location?: string
  completedDate?: string
}

const ImprovementStatus = () => {
  const [improvements, setImprovements] = useState<ImprovementArea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchImprovements = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await apiClient.getInterventions({ status: 'active' })
        
        console.log('📈 ImprovementStatus 응답:', response)
        
        // 응답 구조에 따라 유연하게 처리
        let dataArray: any[] = []
        if (Array.isArray(response)) {
          dataArray = response
        } else if (response && Array.isArray(response.data)) {
          dataArray = response.data
        } else if (response && response.success && Array.isArray(response.data)) {
          dataArray = response.data
        }
        
        // 응답 데이터를 ImprovementArea 형식으로 변환
        const formatted = dataArray.map((item: any) => ({
          category: item.intervention_type || '개선 사업',
          description: item.note || '',
          status: item.status === 'active' ? 'improving' : item.status === 'completed' ? 'completed' : 'stable',
          progress: item.progress || 0,
          lastUpdate: item.start_date || new Date().toISOString().split('T')[0],
          location: item.unit_id ? `지역 ID: ${item.unit_id}` : undefined,
          completedDate: item.end_date || undefined
        }))
        setImprovements(formatted)
        if (formatted.length === 0) {
          console.log('ℹ️ ImprovementStatus: 데이터가 없습니다. 백엔드에 active 상태의 개입 데이터가 없을 수 있습니다.')
        }
      } catch (err) {
        console.error('개선 현황 데이터 로드 실패:', err)
        setError('데이터를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchImprovements()
  }, [])

  if (loading) {
    return (
      <div className="improvement-status">
        <div className="section-header">
          <h2 className="heading-2">개선 현황</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center' }}>로딩 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="improvement-status">
        <div className="section-header">
          <h2 className="heading-2">개선 현황</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-600)' }}>
          {error}
        </div>
      </div>
    )
  }

  if (improvements.length === 0) {
    return (
      <div className="improvement-status">
        <div className="section-header">
          <h2 className="heading-2">개선 현황</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-600)' }}>
          데이터가 없습니다.
        </div>
      </div>
    )
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'improving':
        return '개선 중'
      case 'stable':
        return '안정적'
      case 'monitoring':
        return '모니터링 중'
      case 'completed':
        return '완료'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'improving':
        return 'var(--chateau-green-600)'
      case 'stable':
        return 'var(--chateau-green-500)'
      case 'monitoring':
        return 'var(--gray-500)'
      case 'completed':
        return 'var(--chateau-green-700)'
      default:
        return 'var(--gray-500)'
    }
  }

  return (
    <div className="improvement-status">
      <div className="section-header">
        <h2 className="heading-2">개선 현황</h2>
        <p className="body-small text-secondary mt-sm">
          진행 중인 도시 편의성 개선 사업 현황
        </p>
      </div>

      <div className="improvements-grid">
        {improvements.map((item, index) => (
          <div key={index} className="improvement-card">
            <div className="improvement-header">
              <h3 className="improvement-category">{item.category}</h3>
              <span
                className="status-badge"
                style={{ color: getStatusColor(item.status) }}
              >
                {getStatusLabel(item.status)}
              </span>
            </div>

            <p className="improvement-description">{item.description}</p>

            <div className="improvement-progress">
              <div className="progress-header">
                <span className="progress-label">진행률</span>
                <span className="progress-value">{item.progress}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${item.progress}%`,
                    backgroundColor: getStatusColor(item.status)
                  }}
                />
              </div>
            </div>

            <div className="improvement-footer">
              {item.location && (
                <span className="improvement-location">{item.location}</span>
              )}
              <span className="last-update">최종 업데이트: {item.lastUpdate}</span>
              {item.completedDate && (
                <span className="completed-date">완료일: {item.completedDate}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ImprovementStatus



