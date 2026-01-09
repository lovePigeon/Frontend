import { useState, useEffect } from 'react'
import IndexCalculationModal from './IndexCalculationModal'
import apiClient, { getTodayDateString, getDateRangeForRetry } from '../../utils/api'
import './PriorityQueue.css'

// API 응답 타입
interface PriorityQueueItem {
  rank: number
  unit_id: string
  name: string
  uci_score: number
  uci_grade: 'A' | 'B' | 'C' | 'D' | 'E'
  why_summary: string
  key_drivers?: Array<{
    signal: string
    value: number
  }>
}

// 컴포넌트 내부에서 사용하는 타입 (기존 구조 유지)
interface InspectionItem {
  id: string
  location: string
  lat: number
  lng: number
  comfortIndex: number
  priority: 'high' | 'medium' | 'low'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(undefined)
  const [showIndexModal, setShowIndexModal] = useState(false)
  const [selectedItemForModal, setSelectedItemForModal] = useState<InspectionItem | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString())

  // API 응답을 InspectionItem으로 변환
  const transformApiResponse = (apiItems: PriorityQueueItem[]): InspectionItem[] => {
    return apiItems.map((item) => {
      // UCI 점수에 따라 우선순위 결정 (높을수록 나쁨)
      let priority: 'high' | 'medium' | 'low' = 'low'
      if (item.uci_score >= 70) priority = 'high'
      else if (item.uci_score >= 50) priority = 'medium'

      // key_drivers에서 요인 추출
      const factors = item.key_drivers?.map(driver => {
        const signalNames: { [key: string]: string } = {
          'complaint_odor_growth': '악취 민원 증가',
          'night_ratio': '야간 집중도',
          'complaint_trash_growth': '쓰레기 민원 증가',
          'population_increase': '생활인구 증가'
        }
        return signalNames[driver.signal] || driver.signal
      }) || []

      return {
        id: item.unit_id,
        location: item.name,
        lat: 0, // API에서 제공되지 않으면 0으로 설정
        lng: 0,
        comfortIndex: item.uci_score,
        priority,
        humanSignals: {
          complaints: 0, // API에서 제공되지 않음
          trend: 'increasing',
          recurrence: 0
        },
        geoSignals: {
          alleyStructure: '정보 없음',
          ventilation: '정보 없음',
          accessibility: '정보 없음',
          vulnerabilityScore: 0
        },
        priorityReason: {
          summary: item.why_summary,
          factors,
          signalRiseRate: 0,
          structuralVulnerability: 0
        }
      }
    })
  }

  // 우선순위 큐 데이터 로드
  useEffect(() => {
    const loadPriorityQueue = async () => {
      setLoading(true)
      setError(null)

      // 최근 7일 재시도 로직
      const dateRange = getDateRangeForRetry(7)
      let lastError: Error | null = null
      let connectionFailed = false

      for (const date of dateRange) {
        try {
          console.log(`📅 우선순위 큐 조회 시도: ${date}`)
          const response = await apiClient.getPriorityQueue({
            date,
            top_n: 20
          })

          // 응답 구조 디버깅
          console.log(`📦 API 응답 원본 (날짜: ${date}):`, response)
          console.log(`📦 응답 타입:`, typeof response)
          console.log(`📦 배열 여부:`, Array.isArray(response))
          if (response && typeof response === 'object') {
            console.log(`📦 응답 키:`, Object.keys(response))
            console.log(`📦 응답 전체:`, JSON.stringify(response, null, 2))
          }

          // 응답이 배열인지 확인
          let queueItems: PriorityQueueItem[] = []
          if (Array.isArray(response)) {
            queueItems = response
            console.log(`✅ 배열 형식 응답 감지: ${queueItems.length}개 항목`)
          } else if (response && typeof response === 'object' && 'data' in response) {
            // success/data 구조인 경우
            queueItems = (response as any).data || []
            console.log(`✅ success/data 구조 응답 감지: ${queueItems.length}개 항목`)
          } else if (response && typeof response === 'object' && Array.isArray((response as any).items)) {
            queueItems = (response as any).items
            console.log(`✅ items 배열 구조 응답 감지: ${queueItems.length}개 항목`)
          } else {
            console.warn(`⚠️ 알 수 없는 응답 구조:`, response)
          }

          console.log(`📊 파싱된 queueItems:`, queueItems)
          console.log(`📊 queueItems.length:`, queueItems.length)

          if (queueItems.length > 0) {
            console.log(`✅ 우선순위 큐 데이터 로드 성공: ${queueItems.length}개 항목 (날짜: ${date})`)
            const transformedItems = transformApiResponse(queueItems)
            setItems(transformedItems)
            setSelectedDate(date)
            if (transformedItems.length > 0) {
              setSelectedLocationId(transformedItems[0].id)
            }
            setLoading(false)
            return
          } else {
            console.log(`⚠️ 데이터 없음 (날짜: ${date}), 다음 날짜 시도...`)
            console.log(`⚠️ 응답이 빈 배열이거나 파싱 실패`)
          }
        } catch (err) {
          console.error(`❌ 날짜 ${date} 조회 실패:`, err)
          
          // 연결 실패를 감지하면 즉시 중단
          if (err instanceof Error && (err as any).isConnectionError) {
            connectionFailed = true
            lastError = err
            console.error('🔴 백엔드 서버 연결 실패 - 재시도 중단')
            break // 즉시 루프 종료
          }
          
          // 연결 실패 메시지를 포함하는 경우도 감지
          if (err instanceof Error && err.message.includes('연결 실패')) {
            connectionFailed = true
            lastError = err
            console.error('🔴 백엔드 서버 연결 실패 - 재시도 중단')
            break
          }
          
          lastError = err instanceof Error ? err : new Error(String(err))
          
          // 400 에러는 날짜 형식 문제일 수 있으므로 다음 날짜 시도
          if (err instanceof Error && err.message.includes('400')) {
            continue
          }
          
          // 500 에러는 서버 문제이므로 재시도 의미 없음
          if (err instanceof Error && err.message.includes('500')) {
            break
          }
        }
      }

      // 에러 메시지 설정
      if (connectionFailed && lastError) {
        setError(
          lastError.message || 
          '백엔드 서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.'
        )
      } else if (lastError) {
        setError(lastError.message || '우선순위 큐 데이터를 불러올 수 없습니다.')
      } else {
        setError('최근 7일간 데이터를 찾을 수 없습니다.')
      }
      setLoading(false)
    }

    loadPriorityQueue()
  }, [])

  // 선택된 항목이 변경되면 상세 정보 로드 (필요한 경우)
  useEffect(() => {
    if (selectedLocationId && items.length > 0) {
      // 상세 정보는 필요시 추가로 로드할 수 있음
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

  const selectedItem = items.find(item => item.id === selectedLocationId)

  if (loading) {
    return (
      <div className="priority-queue">
        <div className="section-header">
          <h2 className="heading-2">우선순위 검사 대기열</h2>
          <p className="body-small text-secondary mt-sm">
            도시 편의성 지수와 신호 분석을 기반으로 한 순위별 검사 목록
          </p>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="priority-queue">
        <div className="section-header">
          <h2 className="heading-2">우선순위 검사 대기열</h2>
          <p className="body-small text-secondary mt-sm">
            도시 편의성 지수와 신호 분석을 기반으로 한 순위별 검사 목록
          </p>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--error-color, #dc2626)' }}>❌ {error}</p>
          <p className="body-small text-secondary mt-sm">
            백엔드 서버가 실행 중인지 확인하고, 데이터가 존재하는지 확인해주세요.
          </p>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="priority-queue">
        <div className="section-header">
          <h2 className="heading-2">우선순위 검사 대기열</h2>
          <p className="body-small text-secondary mt-sm">
            도시 편의성 지수와 신호 분석을 기반으로 한 순위별 검사 목록
          </p>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="body-large text-secondary">데이터가 없습니다.</p>
          <p className="body-small text-secondary mt-sm">
            선택된 날짜({selectedDate})에 대한 우선순위 큐 데이터가 없습니다.
          </p>
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
          {selectedDate && (
            <span style={{ marginLeft: '0.5rem' }}>(날짜: {selectedDate})</span>
          )}
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
                onClick={() => setSelectedLocationId(item.id)}
              >
                <div className="queue-card-rank">{index + 1}</div>
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
                {items.findIndex(item => item.id === selectedLocationId) + 1}
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

