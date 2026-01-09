import { useState, useEffect } from 'react'
import IndexCalculationModal from './IndexCalculationModal'
import { apiClient } from '../../utils/api'
import './PriorityQueue.css'

interface InspectionItem {
  id: string
  location: string
  lat: number
  lng: number
  comfortIndex: number
  priority: 'high' | 'medium' | 'low'
  rank?: number
  humanSignals: {
    complaints: number
    trend: 'increasing' | 'stable' | 'decreasing'
    recurrence: number
    timePattern?: {
      peakHours: number[]
      weekdayPattern: { [key: string]: number }
    }
  }
  geoSignals: {
    alleyStructure: string
    ventilation: string
    accessibility: string
    vulnerabilityScore: number
  }
  populationSignals?: {
    daytime: number
    nighttime: number
    changeRate: number
    trend: 'increasing' | 'stable' | 'decreasing'
  }
  pigeonSignals?: {
    detected: boolean
    intensity: 'high' | 'medium' | 'low' | null
    activityPattern?: {
      peakHours: number[]
      frequency: number
    }
    interpretation?: string
  }
  confounders?: {
    feeding: boolean
    seasonal: boolean
    commercial: boolean
    weather: boolean
    events: boolean
  }
  crossValidation?: {
    humanGeoMatch: number
    humanPopulationMatch: number
    allSignalsMatch: number
    blindSpotRisk: 'high' | 'medium' | 'low'
  }
  priorityReason?: {
    summary: string
    factors: string[]
    signalRiseRate: number
    structuralVulnerability: number
  }
  dataSource?: {
    human: { source: string; reliability: 'high' | 'medium' | 'low'; lastUpdate: string }
    geo: { source: string; reliability: 'high' | 'medium' | 'low'; lastUpdate: string }
    population?: { source: string; reliability: 'high' | 'medium' | 'low'; lastUpdate: string }
    pigeon?: { source: string; reliability: 'high' | 'medium' | 'low'; lastUpdate: string }
  }
  expertValidation?: {
    verified: boolean
    confoundersReviewed: boolean
    source?: string
  }
  lastInspection?: string
}

const PriorityQueue = () => {
  const [items, setItems] = useState<InspectionItem[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(undefined)
  const [showIndexModal, setShowIndexModal] = useState(false)
  const [selectedItemForModal, setSelectedItemForModal] = useState<InspectionItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItemDetail, setSelectedItemDetail] = useState<InspectionItem | null>(null)

  const fetchItemDetail = async (unitId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const response: any = await apiClient.getComfortIndexByUnit(unitId, today)
      
      if (response) {
        // 상세 정보를 InspectionItem 형식으로 변환
        const detail: InspectionItem = {
          id: response.unit_id || unitId,
          location: response.unit_id || unitId,
          lat: 37.5665,
          lng: 126.9780,
          comfortIndex: response.uci_score || 0,
          priority: response.uci_grade === 'E' ? 'high' : response.uci_grade === 'D' ? 'medium' : 'low',
          humanSignals: {
            complaints: 0,
            trend: 'stable',
            recurrence: 0
          },
          geoSignals: {
            alleyStructure: '보통',
            ventilation: '보통',
            accessibility: '보통',
            vulnerabilityScore: response.components?.geo_score ? (1 - response.components.geo_score) * 10 : 5
          },
          ...(response.explain && {
            priorityReason: {
              summary: response.explain.why_summary || '',
              factors: response.explain.key_drivers?.map((d: any) => d.signal || '') || [],
              signalRiseRate: 0,
              structuralVulnerability: 0
            }
          })
        }
        setSelectedItemDetail(detail)
      }
    } catch (err) {
      console.error('상세 정보 로드 실패:', err)
    }
  }

  useEffect(() => {
    const fetchPriorityQueue = async () => {
      try {
        setLoading(true)
        setError(null)
        const today = new Date().toISOString().split('T')[0]
        const response: any = await apiClient.getPriorityQueue({ date: today, top_n: 20 })
        
        console.log('📋 PriorityQueue 응답:', response)
        
        // 응답 구조에 따라 유연하게 처리
        let dataArray: any[] = []
        if (Array.isArray(response)) {
          dataArray = response
        } else if (response && Array.isArray(response.data)) {
          dataArray = response.data
        } else if (response && response.success && Array.isArray(response.data)) {
          dataArray = response.data
        }
        
        // 응답 데이터를 InspectionItem 형식으로 변환
        // 가이드라인 응답 형식: [{rank, unit_id, name, uci_score, uci_grade, why_summary, key_drivers}]
        const formatted = dataArray.map((item: any, index: number) => ({
          id: item.unit_id || `item-${index}`,
          location: item.name || `지역 ${item.unit_id}`,
          lat: 37.5665, // 기본값, 실제 데이터에 따라 수정 필요
          lng: 126.9780, // 기본값, 실제 데이터에 따라 수정 필요
          comfortIndex: item.uci_score || 0,
          priority: item.uci_grade === 'E' ? 'high' : item.uci_grade === 'D' ? 'medium' : 'low',
          rank: item.rank || index + 1, // 가이드라인: rank 필드 사용
          humanSignals: {
            complaints: 0,
            trend: 'stable',
            recurrence: 0
          },
          geoSignals: {
            alleyStructure: '보통',
            ventilation: '보통',
            accessibility: '보통',
            vulnerabilityScore: 5
          },
          // key_drivers에서 신호 정보 추출 가능
          ...(item.key_drivers && {
            priorityReason: {
              summary: item.why_summary || '',
              factors: item.key_drivers.map((d: any) => d.signal || ''),
              signalRiseRate: 0,
              structuralVulnerability: 0
            }
          })
        }))
        setItems(formatted)
        if (formatted.length > 0) {
          setSelectedLocationId(formatted[0].id)
          await fetchItemDetail(formatted[0].id)
        } else {
          console.log('ℹ️ PriorityQueue: 데이터가 없습니다. 백엔드에 해당 날짜의 데이터가 없을 수 있습니다.')
        }
      } catch (err) {
        console.error('우선순위 대기열 데이터 로드 실패:', err)
        setError('데이터를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchPriorityQueue()
  }, [])

  useEffect(() => {
    if (selectedLocationId) {
      const item = items.find(i => i.id === selectedLocationId)
      if (item) {
        fetchItemDetail(item.id)
      }
    }
  }, [selectedLocationId, items])

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return '높음'
      case 'medium':
        return '보통'
      case 'low':
        return '낮음'
      default:
        return priority
    }
  }

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return '증가'
      case 'stable':
        return '유지'
      case 'decreasing':
        return '감소'
      default:
        return trend
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'var(--chateau-green-600)'
      case 'stable':
        return 'var(--gray-500)'
      case 'decreasing':
        return 'var(--chateau-green-400)'
      default:
        return 'var(--gray-500)'
    }
  }

  const handleIndexClick = (item: InspectionItem) => {
    setSelectedItemForModal(item)
    setShowIndexModal(true)
  }

  const selectedItem = selectedItemDetail || items.find(item => item.id === selectedLocationId)

  if (loading) {
    return (
      <div className="priority-queue">
        <div className="section-header">
          <h2 className="heading-2">우선순위 검사 대기열</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center' }}>로딩 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="priority-queue">
        <div className="section-header">
          <h2 className="heading-2">우선순위 검사 대기열</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-600)' }}>
          {error}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="priority-queue">
        <div className="section-header">
          <h2 className="heading-2">우선순위 검사 대기열</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-600)' }}>
          데이터가 없습니다.
        </div>
      </div>
    )
  }

  return (
    <div className="priority-queue">
      <div className="section-header">
        <h2 className="heading-2">우선순위 검사 대기열</h2>
        <p className="body-small text-secondary mt-sm">
          도시 편의성 지수와 신호 분석을 기반으로 한 순위별 검사 목록
        </p>
      </div>

      <div className="queue-visualization">
        <div className="queue-cards">
          {items.map((item, index) => {
            const locationParts = item.location.split(' ')
            const district = locationParts.length > 2 ? locationParts[2] : locationParts[1] || item.location
            return (
              <div
                key={item.id}
                className={`queue-card ${selectedLocationId === item.id ? 'active' : ''}`}
                onClick={async () => {
                  setSelectedLocationId(item.id)
                  await fetchItemDetail(item.id)
                }}
              >
                <div className="queue-card-rank">{item.rank || index + 1}</div>
                <div className="queue-card-content">
                  <div className="queue-card-location">{district}</div>
                  <div className="queue-card-info">
                    <span className={`priority-badge priority-${item.priority}`}>
                      {getPriorityLabel(item.priority)}
                    </span>
                    <span className="queue-card-index">지수: {item.comfortIndex}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selectedItem && (
        <div className="queue-detail-view">
          <div className="queue-detail-header">
            <div className="queue-detail-title">
              <span className="queue-detail-rank">
                {selectedItem.rank || items.findIndex(item => item.id === selectedLocationId) + 1}
              </span>
              <h3 className="heading-4">{selectedItem.location}</h3>
            </div>
            <div className="queue-item-badges">
              <span
                className={`priority-badge priority-${selectedItem.priority}`}
              >
                {getPriorityLabel(selectedItem.priority)}
              </span>
              <span 
                className="index-badge clickable"
                onClick={() => handleIndexClick(selectedItem)}
                title="지수 계산 근거 보기"
              >
                편의성 지수: {selectedItem.comfortIndex}
              </span>
              {selectedItem.expertValidation?.verified && (
                <span className="expert-badge" title={selectedItem.expertValidation.source}>
                  전문가 검증
                </span>
              )}
              {selectedItem.pigeonSignals?.detected && (
                <span className="pigeon-badge" title="비둘기 신호 감지됨">
                  생태 신호
                </span>
              )}
            </div>
          </div>

          <div className="queue-item-details">
            <div className="priority-confounders-row">
              {selectedItem.priorityReason && (
                <div className="detail-group priority-reason">
                  <h4 className="detail-label">우선순위 결정 근거</h4>
                  <p className="priority-summary">{selectedItem.priorityReason.summary}</p>
                  <div className="priority-factors">
                    {selectedItem.priorityReason.factors.map((factor, idx) => (
                      <span key={idx} className="factor-tag">{factor}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedItem.confounders && Object.values(selectedItem.confounders).some(v => v) && (
                <div className="detail-group confounders">
                  <h4 className="detail-label">교란요인</h4>
                  <div className="confounder-tags">
                    {selectedItem.confounders.feeding && <span className="confounder-tag warning">급이</span>}
                    {selectedItem.confounders.seasonal && <span className="confounder-tag warning">계절성</span>}
                    {selectedItem.confounders.commercial && <span className="confounder-tag warning">상권</span>}
                    {selectedItem.confounders.weather && <span className="confounder-tag warning">기상</span>}
                    {selectedItem.confounders.events && <span className="confounder-tag warning">이벤트</span>}
                  </div>
                  {selectedItem.expertValidation?.confoundersReviewed && (
                    <small className="confounder-note">국립생태원 자문 반영됨</small>
                  )}
                </div>
              )}
            </div>

            <div className="signals-container">
              <div className="detail-group">
                <h4 className="detail-label">
                  인간 신호
                  {selectedItem.dataSource?.human && (
                    <span className="data-source-badge" title={`출처: ${selectedItem.dataSource.human.source}, 신뢰도: ${selectedItem.dataSource.human.reliability}`}>
                      {selectedItem.dataSource.human.reliability === 'high' ? '✓' : '○'}
                    </span>
                  )}
                </h4>
                <div className="detail-values">
                  <span className="detail-value">
                    민원: <strong>{selectedItem.humanSignals.complaints}건</strong>
                  </span>
                  <span className="detail-value">
                    추세:{' '}
                    <strong
                      style={{ color: getTrendColor(selectedItem.humanSignals.trend) }}
                    >
                      {getTrendLabel(selectedItem.humanSignals.trend)}
                    </strong>
                  </span>
                  <span className="detail-value">
                    재발: <strong>{selectedItem.humanSignals.recurrence}회</strong>
                  </span>
                  {selectedItem.humanSignals.timePattern && (
                    <span className="detail-value">
                      피크 시간: <strong>{selectedItem.humanSignals.timePattern.peakHours.join(', ')}시</strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="detail-group">
                <h4 className="detail-label">
                  지리 신호
                  {selectedItem.dataSource?.geo && (
                    <span className="data-source-badge" title={`출처: ${selectedItem.dataSource.geo.source}, 신뢰도: ${selectedItem.dataSource.geo.reliability}`}>
                      {selectedItem.dataSource.geo.reliability === 'high' ? '✓' : '○'}
                    </span>
                  )}
                </h4>
                <div className="detail-values">
                  <span className="detail-value">
                    골목 구조: {selectedItem.geoSignals.alleyStructure}
                  </span>
                  <span className="detail-value">
                    환기: {selectedItem.geoSignals.ventilation}
                  </span>
                  <span className="detail-value">
                    접근성: {selectedItem.geoSignals.accessibility}
                  </span>
                  <span className="detail-value">
                    취약도 점수: <strong>{selectedItem.geoSignals.vulnerabilityScore}/10</strong>
                  </span>
                </div>
              </div>

              {selectedItem.populationSignals && (
                <div className="detail-group">
                  <h4 className="detail-label">
                    생활인구 신호
                    {selectedItem.dataSource?.population && (
                      <span className="data-source-badge" title={`출처: ${selectedItem.dataSource.population.source}, 신뢰도: ${selectedItem.dataSource.population.reliability}`}>
                        {selectedItem.dataSource.population.reliability === 'high' ? '✓' : '○'}
                      </span>
                    )}
                  </h4>
                  <div className="detail-values">
                    <span className="detail-value">
                      주간: <strong>{selectedItem.populationSignals.daytime.toLocaleString()}명</strong>
                    </span>
                    <span className="detail-value">
                      야간: <strong>{selectedItem.populationSignals.nighttime.toLocaleString()}명</strong>
                    </span>
                    <span className="detail-value">
                      변화율: <strong style={{ color: selectedItem.populationSignals.changeRate > 0 ? 'var(--chateau-green-600)' : 'var(--gray-500)' }}>
                        {selectedItem.populationSignals.changeRate > 0 ? '+' : ''}{selectedItem.populationSignals.changeRate.toFixed(1)}%
                      </strong>
                    </span>
                    <span className="detail-value">
                      추세:{' '}
                      <strong
                        style={{ color: getTrendColor(selectedItem.populationSignals.trend) }}
                      >
                        {getTrendLabel(selectedItem.populationSignals.trend)}
                      </strong>
                    </span>
                  </div>
                </div>
              )}

              {selectedItem.pigeonSignals && (
                <div className="detail-group pigeon-signals">
                  <h4 className="detail-label">
                    비둘기 신호 (해석 레이어)
                    {selectedItem.dataSource?.pigeon && (
                      <span className="data-source-badge" title={`출처: ${selectedItem.dataSource.pigeon.source}, 신뢰도: ${selectedItem.dataSource.pigeon.reliability}`}>
                        {selectedItem.dataSource.pigeon.reliability === 'high' ? '✓' : '○'}
                      </span>
                    )}
                  </h4>
                  {selectedItem.pigeonSignals.detected ? (
                    <div className="pigeon-detected">
                      <div className="pigeon-status">
                        <span className="pigeon-intensity">
                          강도: <strong>{selectedItem.pigeonSignals.intensity === 'high' ? '높음' : selectedItem.pigeonSignals.intensity === 'medium' ? '보통' : '낮음'}</strong>
                        </span>
                        {selectedItem.pigeonSignals.activityPattern && (
                          <span className="pigeon-frequency">
                            활동 빈도: <strong>{selectedItem.pigeonSignals.activityPattern.frequency}회/일</strong>
                          </span>
                        )}
                      </div>
                      {selectedItem.pigeonSignals.interpretation && (
                        <p className="pigeon-interpretation">{selectedItem.pigeonSignals.interpretation}</p>
                      )}
                      <div className="pigeon-note">
                        <small>비둘기 신호는 Core 지표의 보조 검증 레이어로 활용됩니다.</small>
                      </div>
                    </div>
                  ) : (
                    <div className="pigeon-not-detected">
                      <p className="pigeon-interpretation">
                        {selectedItem.pigeonSignals.interpretation || '비둘기 신호 없음. Core 지표만으로 우선순위 결정됨.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedItem.crossValidation && (
              <div className="detail-group cross-validation">
                <h4 className="detail-label">신호 교차 검증</h4>
                <div className="validation-scores">
                  <div className="validation-score">
                    <span className="score-label">Human-Geo 일치도</span>
                    <div className="score-bar">
                      <div 
                        className="score-fill" 
                        style={{ width: `${selectedItem.crossValidation.humanGeoMatch}%` }}
                      />
                      <span className="score-value">{selectedItem.crossValidation.humanGeoMatch}%</span>
                    </div>
                  </div>
                  <div className="validation-score">
                    <span className="score-label">Human-Population 일치도</span>
                    <div className="score-bar">
                      <div 
                        className="score-fill" 
                        style={{ width: `${selectedItem.crossValidation.humanPopulationMatch}%` }}
                      />
                      <span className="score-value">{selectedItem.crossValidation.humanPopulationMatch}%</span>
                    </div>
                  </div>
                  <div className="validation-score">
                    <span className="score-label">전체 신호 일치도</span>
                    <div className="score-bar">
                      <div 
                        className="score-fill" 
                        style={{ width: `${selectedItem.crossValidation.allSignalsMatch}%` }}
                      />
                      <span className="score-value">{selectedItem.crossValidation.allSignalsMatch}%</span>
                    </div>
                  </div>
                </div>
                {selectedItem.crossValidation.blindSpotRisk === 'high' && (
                  <div className="blindspot-warning">
                    <strong>사각지대 위험 높음</strong> - 추가 조사 권장
                  </div>
                )}
              </div>
            )}

            {selectedItem.lastInspection && (
              <div className="detail-group">
                <span className="detail-value text-tertiary">
                  최종 검사: {selectedItem.lastInspection}
                </span>
              </div>
            )}

            {selectedItem.humanSignals.timePattern && (
              <div className="expanded-details">
                <div className="time-pattern-section">
                  <h5 className="pattern-title">시간대별 패턴</h5>
                  <div className="time-pattern-chart">
                    {Array.from({ length: 24 }, (_, i) => (
                      <div key={i} className="hour-bar">
                        <div 
                          className={`hour-fill ${selectedItem.humanSignals.timePattern!.peakHours.includes(i) ? 'peak' : ''}`}
                          style={{ 
                            height: selectedItem.humanSignals.timePattern!.peakHours.includes(i) ? '100%' : '30%' 
                          }}
                        />
                        <span className="hour-label">{i}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showIndexModal && selectedItemForModal && (
        <IndexCalculationModal
          item={selectedItemForModal}
          onClose={() => {
            setShowIndexModal(false)
            setSelectedItemForModal(null)
          }}
        />
      )}
    </div>
  )
}

export default PriorityQueue

