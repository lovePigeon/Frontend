import { useState, useEffect } from 'react'
import LocationMap from './LocationMap'
import { apiClient } from '../../utils/api'
import './BlindSpotDetection.css'

interface BlindSpot {
  id: string
  location: string
  lat: number
  lng: number
  riskLevel: 'high' | 'medium' | 'low'
  detectionReason: string
  signals: {
    human: { value: number; status: 'low' | 'normal' | 'high' }
    geo: { value: number; status: 'low' | 'normal' | 'high' }
    uci?: { value: number; status: 'low' | 'normal' | 'high' } // 가이드라인: uci 필드
    population?: { value: number; status: 'low' | 'normal' | 'high' }
    pigeon?: { detected: boolean; intensity: 'high' | 'medium' | 'low' | null }
  }
  recommendedAction: string
}

const BlindSpotDetection = () => {
  const [blindSpots, setBlindSpots] = useState<BlindSpot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBlindSpots = async () => {
      try {
        setLoading(true)
        setError(null)
        const today = new Date().toISOString().split('T')[0]
        const response = await apiClient.getBlindSpots({ date: today })
        
        console.log('🔍 BlindSpotDetection 응답:', response)
        
        // 응답 구조에 따라 유연하게 처리
        let dataArray: any[] = []
        if (Array.isArray(response)) {
          dataArray = response
        } else if (response && Array.isArray(response.data)) {
          dataArray = response.data
        } else if (response && response.success && Array.isArray(response.data)) {
          dataArray = response.data
        }
        
        // 응답 데이터를 BlindSpot 형식으로 변환
        // 가이드라인 응답 형식: {id, location, lat, lng, risk_level, detection_reason, signals: {human, geo, uci}, recommended_action}
        const formatted = dataArray.map((item: any) => ({
          id: item.id || `bs-${item.location}`,
          location: item.location || '',
          lat: item.lat || 37.5665,
          lng: item.lng || 126.9780,
          riskLevel: item.risk_level || 'medium',
          detectionReason: item.detection_reason || '',
          signals: {
            human: item.signals?.human || { value: 0, status: 'normal' },
            geo: item.signals?.geo || { value: 0, status: 'normal' },
            uci: item.signals?.uci || undefined, // 가이드라인: uci 필드
            population: item.signals?.population || undefined,
            pigeon: item.signals?.pigeon || undefined
          },
          recommendedAction: item.recommended_action || ''
        }))
        setBlindSpots(formatted)
        if (formatted.length === 0) {
          console.log('ℹ️ BlindSpotDetection: 데이터가 없습니다. 백엔드에 해당 날짜의 사각지대 데이터가 없을 수 있습니다.')
        }
      } catch (err) {
        console.error('사각지대 탐지 데이터 로드 실패:', err)
        setError('데이터를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchBlindSpots()
  }, [])
  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'high':
        return '높음'
      case 'medium':
        return '보통'
      case 'low':
        return '낮음'
      default:
        return risk
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'var(--chateau-green-600)'
      case 'medium':
        return 'var(--chateau-green-500)'
      case 'low':
        return 'var(--gray-500)'
      default:
        return 'var(--gray-500)'
    }
  }

  const getSignalStatusColor = (status: string) => {
    switch (status) {
      case 'high':
        return 'var(--chateau-green-600)'
      case 'normal':
        return 'var(--gray-500)'
      case 'low':
        return 'var(--gray-400)'
      default:
        return 'var(--gray-500)'
    }
  }

  if (loading) {
    return (
      <div className="blindspot-detection">
        <div className="section-header">
          <h2 className="heading-2">사각지대 탐지</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center' }}>로딩 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="blindspot-detection">
        <div className="section-header">
          <h2 className="heading-2">사각지대 탐지</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-600)' }}>
          {error}
        </div>
      </div>
    )
  }

  if (blindSpots.length === 0) {
    return (
      <div className="blindspot-detection">
        <div className="section-header">
          <h2 className="heading-2">사각지대 탐지</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-600)' }}>
          데이터가 없습니다.
        </div>
      </div>
    )
  }

  const mapLocations = blindSpots.map((spot) => ({
    id: spot.id,
    location: spot.location,
    lat: spot.lat,
    lng: spot.lng,
    comfortIndex: 0, // 사각지대는 지수 없음
    priority: spot.riskLevel as 'high' | 'medium' | 'low'
  }))

  return (
    <div className="blindspot-detection">
      <div className="section-header">
        <h2 className="heading-2">사각지대 탐지</h2>
        <p className="body-small text-secondary mt-sm">
          신호 간 불일치를 분석하여 행정 데이터가 놓치는 사각지대를 탐지합니다
        </p>
      </div>

      <div className="blindspot-map-section">
        <LocationMap
          locations={mapLocations}
          selectedLocationId={undefined}
          onLocationClick={() => {}}
        />
      </div>

      <div className="blindspot-list">
        {blindSpots.map((spot) => (
          <div key={spot.id} className="blindspot-item">
            <div className="blindspot-header">
              <div>
                <h3 className="heading-4">{spot.location}</h3>
                <p className="blindspot-reason">{spot.detectionReason}</p>
              </div>
              <div className="risk-badge-container">
                <span
                  className="risk-badge"
                  style={{ 
                    backgroundColor: getRiskColor(spot.riskLevel) + '20',
                    color: getRiskColor(spot.riskLevel)
                  }}
                >
                  위험도: {getRiskLabel(spot.riskLevel)}
                </span>
              </div>
            </div>

            <div className="blindspot-signals">
              <h4 className="signals-title">신호 분석</h4>
              <div className="signals-grid">
                <div className="signal-card">
                  <span className="signal-name">Human-signal</span>
                  <div className="signal-value-container">
                    <span 
                      className="signal-value"
                      style={{ color: getSignalStatusColor(spot.signals.human.status) }}
                    >
                      {spot.signals.human.value}
                    </span>
                    <span className="signal-status">{spot.signals.human.status === 'low' ? '낮음' : spot.signals.human.status === 'normal' ? '보통' : '높음'}</span>
                  </div>
                </div>

                <div className="signal-card">
                  <span className="signal-name">Geo-signal</span>
                  <div className="signal-value-container">
                    <span 
                      className="signal-value"
                      style={{ color: getSignalStatusColor(spot.signals.geo.status) }}
                    >
                      {spot.signals.geo.value}
                    </span>
                    <span className="signal-status">{spot.signals.geo.status === 'low' ? '낮음' : spot.signals.geo.status === 'normal' ? '보통' : '높음'}</span>
                  </div>
                </div>

                {spot.signals.uci && (
                  <div className="signal-card">
                    <span className="signal-name">UCI-signal</span>
                    <div className="signal-value-container">
                      <span 
                        className="signal-value"
                        style={{ color: getSignalStatusColor(spot.signals.uci.status) }}
                      >
                        {spot.signals.uci.value}
                      </span>
                      <span className="signal-status">{spot.signals.uci.status === 'low' ? '낮음' : spot.signals.uci.status === 'normal' ? '보통' : '높음'}</span>
                    </div>
                  </div>
                )}

                {spot.signals.population && (
                  <div className="signal-card">
                    <span className="signal-name">Population-signal</span>
                    <div className="signal-value-container">
                      <span 
                        className="signal-value"
                        style={{ color: getSignalStatusColor(spot.signals.population.status) }}
                      >
                        {spot.signals.population.value}
                      </span>
                      <span className="signal-status">{spot.signals.population.status === 'low' ? '낮음' : spot.signals.population.status === 'normal' ? '보통' : '높음'}</span>
                    </div>
                  </div>
                )}

                {spot.signals.pigeon && (
                  <div className="signal-card pigeon-signal">
                    <span className="signal-name">비둘기 신호</span>
                    <div className="signal-value-container">
                      {spot.signals.pigeon.detected ? (
                        <>
                          <span className="signal-value pigeon-detected">
                            {spot.signals.pigeon.intensity === 'high' ? '높음' : 
                             spot.signals.pigeon.intensity === 'medium' ? '보통' : '낮음'}
                          </span>
                          <span className="signal-status">감지됨</span>
                        </>
                      ) : (
                        <span className="signal-value pigeon-not-detected">없음</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="blindspot-action">
              <h4 className="action-title">권고 조치</h4>
              <p className="action-description">{spot.recommendedAction}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default BlindSpotDetection

