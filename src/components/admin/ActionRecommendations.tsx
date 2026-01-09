import { useState, useEffect } from 'react'
import { apiClient } from '../../utils/api'
import './ActionRecommendations.css'

interface Recommendation {
  id: string
  location: string
  title?: string // 가이드라인: title 필드
  interventionType: string
  description: string
  expectedImpact: string
  urgency: 'immediate' | 'short-term' | 'medium-term'
  confidence?: number // 가이드라인: confidence 필드
  limitations?: string[] // 가이드라인: limitations 필드
  recommendedActions?: string[] // 가이드라인: recommended_actions 배열 전체
  estimatedCost?: string
  similarCases?: number
  costEffectiveness?: {
    roi: number
    expectedComplaintReduction: number
    expectedIndexImprovement: number
    paybackPeriod?: string
  }
  timePattern?: {
    recommendedHours: number[]
    recommendedDays: string[]
  }
  relatedSignals?: {
    human: boolean
    geo: boolean
    population: boolean
    pigeon?: boolean
  }
}

const ActionRecommendations = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchActionCards = async () => {
      try {
        setLoading(true)
        setError(null)
        const today = new Date().toISOString().split('T')[0]
        const response = await apiClient.getActionCards({ date: today })
        
        console.log('💡 ActionRecommendations 응답:', response)
        
        // 응답 구조에 따라 유연하게 처리
        let dataArray: any[] = []
        if (Array.isArray(response)) {
          dataArray = response
        } else if (response && Array.isArray(response.data)) {
          dataArray = response.data
        } else if (response && response.success && Array.isArray(response.data)) {
          dataArray = response.data
        }
        
        // 응답 데이터를 Recommendation 형식으로 변환
        // 가이드라인 응답 형식: [{card_id, unit_id, date, title, why, recommended_actions, tags, confidence, limitations}]
        const formatted = dataArray.map((item: any) => ({
          id: item.card_id || item.unit_id || '',
          location: item.unit_id || '',
          title: item.title || '', // 가이드라인: title 필드 사용
          interventionType: item.recommended_actions?.[0] || '개입 필요',
          description: item.why || '',
          expectedImpact: '개선 예상',
          urgency: item.confidence > 0.7 ? 'immediate' : item.confidence > 0.5 ? 'short-term' : 'medium-term',
          confidence: item.confidence, // 가이드라인: confidence 필드
          limitations: item.limitations || [], // 가이드라인: limitations 필드
          recommendedActions: item.recommended_actions || [], // 가이드라인: recommended_actions 배열 전체
          similarCases: undefined,
          costEffectiveness: undefined,
          timePattern: undefined,
          relatedSignals: {
            human: item.tags?.includes('odor') || item.tags?.includes('trash'),
            geo: false,
            population: item.tags?.includes('night_spike'),
            pigeon: false
          }
        }))
        setRecommendations(formatted)
        if (formatted.length === 0) {
          console.log('ℹ️ ActionRecommendations: 데이터가 없습니다. 백엔드에 해당 날짜의 액션 카드가 없을 수 있습니다.')
        }
      } catch (err) {
        console.error('개입 권고사항 데이터 로드 실패:', err)
        setError('데이터를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchActionCards()
  }, [])

  if (loading) {
    return (
      <div className="action-recommendations">
        <div className="section-header">
          <h2 className="heading-2">개입 권고사항</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center' }}>로딩 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="action-recommendations">
        <div className="section-header">
          <h2 className="heading-2">개입 권고사항</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-600)' }}>
          {error}
        </div>
      </div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <div className="action-recommendations">
        <div className="section-header">
          <h2 className="heading-2">개입 권고사항</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-600)' }}>
          데이터가 없습니다.
        </div>
      </div>
    )
  }

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'immediate':
        return '즉시'
      case 'short-term':
        return '단기'
      case 'medium-term':
        return '중기'
      default:
        return urgency
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'immediate':
        return 'var(--chateau-green-600)'
      case 'short-term':
        return 'var(--chateau-green-500)'
      case 'medium-term':
        return 'var(--gray-500)'
      default:
        return 'var(--gray-500)'
    }
  }

  return (
    <div className="action-recommendations">
      <div className="section-header">
        <h2 className="heading-2">개입 권고사항</h2>
        <p className="body-small text-secondary mt-sm">
          데이터 기반 개입 유형 및 예상 효과 분석
        </p>
      </div>

      <div className="recommendations-grid">
        {recommendations.map((rec) => (
          <div key={rec.id} className="recommendation-card">
            <div className="recommendation-header">
              <div className="recommendation-meta">
                <span
                  className="urgency-badge"
                  style={{ color: getUrgencyColor(rec.urgency) }}
                >
                  {getUrgencyLabel(rec.urgency)}
                </span>
                {rec.confidence && (
                  <span className="confidence-badge" style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                    신뢰도: {(rec.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              {rec.similarCases && (
                <span className="similar-cases">
                  유사 사례 {rec.similarCases}건
                </span>
              )}
            </div>

            <h3 className="recommendation-location">{rec.title || rec.location}</h3>

            <p className="recommendation-description">{rec.description}</p>

            {rec.recommendedActions && rec.recommendedActions.length > 0 && (
              <div className="recommended-actions-list">
                <strong>권고 조치:</strong>
                <ul>
                  {rec.recommendedActions.map((action: string, idx: number) => (
                    <li key={idx}>{action}</li>
                  ))}
                </ul>
              </div>
            )}

            {rec.limitations && rec.limitations.length > 0 && (
              <div className="limitations-list">
                <strong>제한사항:</strong>
                <ul>
                  {rec.limitations.map((limitation: string, idx: number) => (
                    <li key={idx}>{limitation}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="recommendation-footer">
              <div className="impact-indicator">
                <span className="impact-label">예상 효과</span>
                <span className="impact-value">{rec.expectedImpact}</span>
              </div>
              {rec.estimatedCost && (
                <div className="cost-indicator">
                  <span className="cost-label">예상 비용</span>
                  <span className="cost-value">{rec.estimatedCost}</span>
                </div>
              )}
              {rec.costEffectiveness && (
                <div className="cost-effectiveness-section">
                  <div className="ce-header">
                    <span className="ce-title">비용-효과 분석</span>
                    <span className="roi-badge">ROI {rec.costEffectiveness.roi}%</span>
                  </div>
                  <div className="ce-details">
                    <div className="ce-item">
                      <span className="ce-label">예상 민원 감소율</span>
                      <span className="ce-value">{rec.costEffectiveness.expectedComplaintReduction}%</span>
                    </div>
                    <div className="ce-item">
                      <span className="ce-label">예상 지수 향상</span>
                      <span className="ce-value">+{rec.costEffectiveness.expectedIndexImprovement}점</span>
                    </div>
                    {rec.costEffectiveness.paybackPeriod && (
                      <div className="ce-item">
                        <span className="ce-label">회수 기간</span>
                        <span className="ce-value">{rec.costEffectiveness.paybackPeriod}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {rec.timePattern && (
                <div className="time-pattern-section">
                  <span className="pattern-label">권장 관리 시간</span>
                  <div className="pattern-info">
                    <span className="pattern-hours">
                      {rec.timePattern.recommendedHours.join(', ')}시
                    </span>
                    <span className="pattern-days">
                      {rec.timePattern.recommendedDays.join(', ')}요일
                    </span>
                  </div>
                </div>
              )}
              {rec.relatedSignals && (
                <div className="related-signals">
                  <span className="signals-label">관련 신호</span>
                  <div className="signals-tags">
                    {rec.relatedSignals.human && <span className="signal-tag human">Human</span>}
                    {rec.relatedSignals.geo && <span className="signal-tag geo">Geo</span>}
                    {rec.relatedSignals.population && <span className="signal-tag population">Population</span>}
                    {rec.relatedSignals.pigeon && <span className="signal-tag pigeon">비둘기</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ActionRecommendations



