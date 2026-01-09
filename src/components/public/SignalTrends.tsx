import { useState, useEffect } from 'react'
import { apiClient } from '../../utils/api'
import './SignalTrends.css'

interface SignalTrend {
  district: string
  trend: 'improving' | 'stable' | 'monitoring' | 'attention'
  signals: {
    human: 'increasing' | 'stable' | 'decreasing'
    population?: 'increasing' | 'stable' | 'decreasing'
  }
  description: string
  note?: string
}

const SignalTrends = () => {
  const [signalTrends, setSignalTrends] = useState<SignalTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSignalTrends = async () => {
      try {
        setLoading(true)
        setError(null)
        const today = new Date().toISOString().split('T')[0]
        
        // 민원 데이터와 생활인구 데이터를 가져와서 지역별로 집계
        const [humanSignalResponse, populationSignalResponse] = await Promise.all([
          apiClient.getHumanSignal({ date: today, period: 'month' }),
          apiClient.getPopulationSignal({ date: today, period: 'month' })
        ])

        console.log('📡 SignalTrends 응답:', { humanSignalResponse, populationSignalResponse })

        // 응답 데이터를 SignalTrend 형식으로 변환
        // 실제 응답 구조에 따라 조정 필요
        const trends: SignalTrend[] = []
        
        // TODO: 백엔드 응답 구조에 맞게 데이터 변환 로직 구현 필요
        // 현재는 빈 배열로 설정하여 "데이터가 없습니다" 메시지 표시
        if (humanSignalResponse && (humanSignalResponse.success || Array.isArray(humanSignalResponse.trends))) {
          // 실제 데이터 변환 로직 구현 필요
          // 예: humanSignalResponse.trends를 지역별로 집계하여 SignalTrend 생성
        }
        
        if (trends.length > 0) {
          setSignalTrends(trends)
        } else {
          console.warn('⚠️ SignalTrends: 데이터 변환 로직 구현 필요. 응답:', { humanSignalResponse, populationSignalResponse })
          setError('데이터 변환 로직이 구현되지 않았습니다.')
        }
      } catch (err) {
        console.error('신호 추세 데이터 로드 실패:', err)
        setError('데이터를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchSignalTrends()
  }, [])

  if (loading) {
    return (
      <div className="signal-trends">
        <div className="section-header">
          <h2 className="heading-2">지역별 신호 추세</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center' }}>로딩 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="signal-trends">
        <div className="section-header">
          <h2 className="heading-2">지역별 신호 추세</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-600)' }}>
          {error}
        </div>
      </div>
    )
  }

  if (signalTrends.length === 0) {
    return (
      <div className="signal-trends">
        <div className="section-header">
          <h2 className="heading-2">지역별 신호 추세</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-600)' }}>
          데이터가 없습니다.
        </div>
      </div>
    )
  }

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case 'improving':
        return '개선 중'
      case 'stable':
        return '안정적'
      case 'monitoring':
        return '모니터링 중'
      case 'attention':
        return '주의 필요'
      default:
        return trend
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'var(--chateau-green-600)'
      case 'stable':
        return 'var(--gray-500)'
      case 'monitoring':
        return 'var(--chateau-green-500)'
      case 'attention':
        return '#f59e0b'
      default:
        return 'var(--gray-500)'
    }
  }

  const getSignalLabel = (signal: string) => {
    switch (signal) {
      case 'increasing':
        return '증가'
      case 'stable':
        return '유지'
      case 'decreasing':
        return '감소'
      default:
        return signal
    }
  }

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'increasing':
        return '#f59e0b'
      case 'stable':
        return 'var(--gray-500)'
      case 'decreasing':
        return 'var(--chateau-green-600)'
      default:
        return 'var(--gray-500)'
    }
  }

  return (
    <div className="signal-trends">
      <div className="section-header">
        <h2 className="heading-2">지역별 신호 추세</h2>
        <p className="body-small text-secondary mt-sm">
          구 단위 지역별 신호 변화 추이 (정확한 위치 정보는 공개되지 않습니다)
        </p>
      </div>

      <div className="trends-grid">
        {signalTrends.map((trend, index) => (
          <div key={index} className="trend-card">
            <div className="trend-header">
              <h3 className="trend-district">{trend.district}</h3>
              <span
                className="trend-badge"
                style={{
                  backgroundColor: getTrendColor(trend.trend) + '20',
                  color: getTrendColor(trend.trend)
                }}
              >
                {getTrendLabel(trend.trend)}
              </span>
            </div>

            <p className="trend-description">{trend.description}</p>

            <div className="trend-signals">
              <div className="signal-item">
                <span className="signal-label">민원 신호</span>
                <span
                  className="signal-value"
                  style={{ color: getSignalColor(trend.signals.human) }}
                >
                  {getSignalLabel(trend.signals.human)}
                </span>
              </div>
              {trend.signals.population && (
                <div className="signal-item">
                  <span className="signal-label">생활인구 신호</span>
                  <span
                    className="signal-value"
                    style={{ color: getSignalColor(trend.signals.population) }}
                  >
                    {getSignalLabel(trend.signals.population)}
                  </span>
                </div>
              )}
            </div>

            {trend.note && (
              <div className="trend-note">
                <small>{trend.note}</small>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default SignalTrends
