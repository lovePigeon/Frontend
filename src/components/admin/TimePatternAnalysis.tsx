import { useState, useEffect } from 'react'
import { ComposedChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { apiClient, getTodayDateString } from '../../utils/api'
import './TimePatternAnalysis.css'

interface TimePatternData {
  location: string
  hourPattern: { hour: number; complaints: number; population: number }[]
  dayPattern: { day: string; complaints: number }[]
  peakHours: number[]
  recommendedAction: string
}

const mockTimePatternData: TimePatternData[] = [
  {
    location: '서울시 강남구 역삼동 123-45',
    hourPattern: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      complaints: i >= 20 && i <= 23 ? Math.floor(Math.random() * 8) + 5 : Math.floor(Math.random() * 3),
      population: i >= 20 && i <= 23 ? Math.floor(Math.random() * 200) + 800 : Math.floor(Math.random() * 100) + 200
    })),
    dayPattern: [
      { day: '월', complaints: 3 },
      { day: '화', complaints: 4 },
      { day: '수', complaints: 5 },
      { day: '목', complaints: 4 },
      { day: '금', complaints: 3 },
      { day: '토', complaints: 2 },
      { day: '일', complaints: 3 }
    ],
    peakHours: [20, 21, 22, 23],
    recommendedAction: '야간 집중 관리 필요 (20-23시)'
  },
  {
    location: '서울시 마포구 상암동 67-89',
    hourPattern: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      complaints: i >= 19 && i <= 21 ? Math.floor(Math.random() * 6) + 3 : Math.floor(Math.random() * 2),
      population: i >= 19 && i <= 21 ? Math.floor(Math.random() * 150) + 600 : Math.floor(Math.random() * 80) + 150
    })),
    dayPattern: [
      { day: '월', complaints: 2 },
      { day: '화', complaints: 3 },
      { day: '수', complaints: 3 },
      { day: '목', complaints: 3 },
      { day: '금', complaints: 2 },
      { day: '토', complaints: 2 },
      { day: '일', complaints: 3 }
    ],
    peakHours: [19, 20, 21],
    recommendedAction: '저녁 시간대 관리 강화 (19-21시)'
  }
]

// API 응답 타입 정의 (추정 - 실제 API 응답 구조에 맞게 조정 필요)
interface TimePatternApiResponse {
  unit_id: string
  hour_pattern?: Array<{ hour: number; complaints?: number; population?: number }>
  day_pattern?: Array<{ day: string; complaints?: number }>
  peak_hours?: number[]
  recommended_action?: string
}

// API 응답을 TimePatternData로 변환하는 함수
const mapApiResponseToTimePatternData = (apiItem: TimePatternApiResponse): TimePatternData => {
  // API에서 unit_id로 위치 정보 조회 필요 (현재는 unit_id를 그대로 사용)
  const location = apiItem.unit_id || '위치 정보 없음'
  
  // hour_pattern이 있으면 사용, 없으면 더미데이터 생성
  const hourPattern = apiItem.hour_pattern 
    ? apiItem.hour_pattern.map(h => ({
        hour: h.hour,
        complaints: h.complaints || 0,
        population: h.population || 0,
      }))
    : Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        complaints: 0,
        population: 0,
      }))

  // day_pattern이 있으면 사용, 없으면 더미데이터 생성
  const dayPattern = apiItem.day_pattern
    ? apiItem.day_pattern.map(d => ({
        day: d.day,
        complaints: d.complaints || 0,
      }))
    : [
        { day: '월', complaints: 0 },
        { day: '화', complaints: 0 },
        { day: '수', complaints: 0 },
        { day: '목', complaints: 0 },
        { day: '금', complaints: 0 },
        { day: '토', complaints: 0 },
        { day: '일', complaints: 0 },
      ]

  return {
    location,
    hourPattern,
    dayPattern,
    peakHours: apiItem.peak_hours || [],
    recommendedAction: apiItem.recommended_action || '패턴 분석 중',
  }
}

const TimePatternAnalysis = () => {
  const [patternData, setPatternData] = useState<TimePatternData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // API에서 데이터 가져오기
  useEffect(() => {
    const fetchTimePattern = async () => {
      try {
        setLoading(true)
        setError(null)
        const date = getTodayDateString()
        
        // 우선순위 큐에서 상위 지역들의 unit_id를 가져와서 각각의 패턴 조회
        // 현재는 우선순위 큐의 상위 2개 지역만 조회 (실제로는 더 많은 지역 조회 가능)
        const priorityQueue = await apiClient.getPriorityQueue({ date, top_n: 2 }) as any[]
        
        // 우선순위 큐 응답 로그 출력
        console.log('📊 [시간대별 패턴 분석] 우선순위 큐 응답:', {
          endpoint: '/api/v1/priority-queue',
          date,
          queueCount: Array.isArray(priorityQueue) ? priorityQueue.length : 0,
          queueData: priorityQueue
        })
        
        if (Array.isArray(priorityQueue) && priorityQueue.length > 0) {
          const patternPromises = priorityQueue.slice(0, 2).map(async (item) => {
            try {
              const unitId = item.unit_id || item._id
              const pattern = await apiClient.getTimePattern(unitId, { date }) as TimePatternApiResponse
              
              // 각 지역별 시간 패턴 API 응답 로그 출력
              console.log(`📈 [시간대별 패턴 분석] 지역별 패턴 응답 (${unitId}):`, {
                endpoint: `/api/v1/dashboard/time-pattern`,
                unitId,
                date,
                rawData: pattern
              })
              
              return mapApiResponseToTimePatternData({ ...pattern, unit_id: item.unit_id || item.name || item._id })
            } catch (err) {
              console.warn(`⚠️ 시간 패턴 조회 실패 (${item.unit_id}):`, err)
              return null
            }
          })
          
          const patterns = (await Promise.all(patternPromises)).filter((p): p is TimePatternData => p !== null)
          
          // 매핑된 패턴 데이터 로그 출력
          console.log('✅ [시간대별 패턴 분석] 매핑 완료:', {
            patternCount: patterns.length,
            patterns: patterns,
            samplePattern: patterns[0] || null
          })
          
          if (patterns.length > 0) {
            setPatternData(patterns)
          } else {
            // API 응답이 비어있거나 형식이 다를 경우 더미데이터 사용
            console.warn('⚠️ API 응답이 비어있거나 형식이 다릅니다. 더미데이터를 사용합니다.')
            setPatternData(mockTimePatternData)
          }
        } else {
          // 우선순위 큐가 비어있으면 더미데이터 사용
          setPatternData(mockTimePatternData)
        }
      } catch (err) {
        console.error('❌ 시간 패턴 분석 데이터 로딩 실패:', err)
        setError(err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했습니다.')
        // 에러 발생 시 더미데이터로 fallback
        setPatternData(mockTimePatternData)
      } finally {
        setLoading(false)
      }
    }

    fetchTimePattern()
  }, [])

  if (loading) {
    return (
      <div className="time-pattern-analysis">
        <div className="section-header">
          <h2 className="heading-2">시간대별 패턴 분석</h2>
          <p className="body-small text-secondary mt-sm">
            민원 발생 시간대와 생활인구 패턴을 분석하여 최적의 관리 시점을 제안합니다
          </p>
        </div>
        <div className="loading-state">
          <p className="body-medium text-secondary">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="time-pattern-analysis">
      <div className="section-header">
        <h2 className="heading-2">시간대별 패턴 분석</h2>
        <p className="body-small text-secondary mt-sm">
          민원 발생 시간대와 생활인구 패턴을 분석하여 최적의 관리 시점을 제안합니다
        </p>
      </div>

      {error && (
        <div className="error-state" style={{ padding: '16px', marginBottom: '16px', backgroundColor: 'var(--gray-100)', borderRadius: '4px' }}>
          <p className="body-small" style={{ color: 'var(--chateau-green-600)' }}>
            ⚠️ {error} (더미데이터로 표시 중)
          </p>
        </div>
      )}

      <div className="pattern-list">
        {patternData.map((data, index) => (
          <div key={index} className="pattern-item">
            <div className="pattern-header">
              <h3 className="heading-4">{data.location}</h3>
              <div className="recommended-action">
                <span className="action-badge">{data.recommendedAction}</span>
              </div>
            </div>

            <div className="pattern-charts">
              <div className="chart-section">
                <h4 className="chart-title">시간대별 민원 및 생활인구</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart 
                    data={data.hourPattern}
                    margin={{ top: 10, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                    <XAxis 
                      dataKey="hour" 
                      stroke="var(--gray-600)"
                      style={{ fontSize: '12px' }}
                      label={{ value: '시간', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="var(--gray-600)"
                      style={{ fontSize: '12px' }}
                      label={{ value: '민원 건수', angle: -90, position: 'insideLeft' }}
                      domain={[0, 'dataMax + 2']}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="var(--gray-600)"
                      style={{ fontSize: '12px' }}
                      label={{ value: '생활인구', angle: 90, position: 'insideRight' }}
                      domain={[0, 'dataMax + 100']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--white)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px'
                      }}
                    />
                    <Bar 
                      yAxisId="left"
                      dataKey="complaints" 
                      fill="var(--chateau-green-600)" 
                      name="민원 건수"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      yAxisId="right"
                      dataKey="population" 
                      fill="var(--chateau-green-300)" 
                      name="생활인구"
                      radius={[4, 4, 0, 0]}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      align="center"
                      wrapperStyle={{ paddingTop: '20px' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="peak-hours-indicator">
                  <span className="peak-label">피크 시간대:</span>
                  <div className="peak-hours">
                    {data.peakHours.map(hour => (
                      <span key={hour} className="peak-hour-badge">{hour}시</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="chart-section">
                <h4 className="chart-title">요일별 민원 패턴</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.dayPattern}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                    <XAxis 
                      dataKey="day" 
                      stroke="var(--gray-600)"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="var(--gray-600)"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--white)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px'
                      }}
                    />
                    <Bar 
                      dataKey="complaints" 
                      fill="var(--chateau-green-500)" 
                      name="민원 건수"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TimePatternAnalysis

