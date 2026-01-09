import { useState, useEffect } from 'react'
import { ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { apiClient } from '../../utils/api'
import './TimePatternAnalysis.css'

interface TimePatternData {
  location: string
  hourPattern: { hour: number; complaints: number; population: number }[]
  dayPattern: { day: string; complaints: number }[]
  peakHours: number[]
  recommendedAction: string
}

const TimePatternAnalysis = () => {
  const [timePatternData, setTimePatternData] = useState<TimePatternData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)

  useEffect(() => {
    const fetchTimePattern = async () => {
      if (!selectedUnitId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const today = new Date().toISOString().split('T')[0]
        const response = await apiClient.getTimePattern(selectedUnitId, { date: today, period: 'week' })
        
        console.log('⏰ TimePatternAnalysis 응답:', response)
        
        if (response && (response.success || response.location)) {
          // 응답 데이터를 TimePatternData 형식으로 변환
          const formatted: TimePatternData = {
            location: response.location || '',
            hourPattern: response.hour_pattern || [],
            dayPattern: response.day_pattern || [],
            peakHours: response.peak_hours || [],
            recommendedAction: response.recommended_action || ''
          }
          setTimePatternData([formatted])
        } else {
          setError('데이터를 불러올 수 없습니다.')
        }
      } catch (err) {
        console.error('시간대별 패턴 데이터 로드 실패:', err)
        setError('데이터를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchTimePattern()
  }, [selectedUnitId])

  // TODO: unit_id 선택 UI 추가 필요
  // 임시로 첫 번째 우선순위 대기열 항목을 사용
  // PriorityQueue 컴포넌트에서 이미 로드한 데이터를 공유하는 것이 더 효율적
  // 현재는 unit_id를 props로 받거나 다른 방식으로 처리 필요
  useEffect(() => {
    let mounted = true
    const fetchFirstUnitId = async () => {
      if (selectedUnitId) return // 이미 unit_id가 있으면 중복 호출 방지
      
      try {
        const today = new Date().toISOString().split('T')[0]
        const response = await apiClient.getPriorityQueue({ date: today, top_n: 1 })
        if (mounted && Array.isArray(response) && response.length > 0) {
          setSelectedUnitId(response[0].unit_id)
        }
      } catch (err) {
        console.error('unit_id 로드 실패:', err)
      }
    }
    fetchFirstUnitId()
    
    return () => {
      mounted = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="time-pattern-analysis">
        <div className="section-header">
          <h2 className="heading-2">시간대별 패턴 분석</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center' }}>로딩 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="time-pattern-analysis">
        <div className="section-header">
          <h2 className="heading-2">시간대별 패턴 분석</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-600)' }}>
          {error}
        </div>
      </div>
    )
  }

  if (timePatternData.length === 0) {
    return (
      <div className="time-pattern-analysis">
        <div className="section-header">
          <h2 className="heading-2">시간대별 패턴 분석</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-600)' }}>
          지역을 선택해주세요.
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

      <div className="pattern-list">
        {timePatternData.map((data, index) => (
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
                    margin={{ top: 5, right: 80, left: 20, bottom: 5 }}
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
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="var(--gray-600)"
                      style={{ fontSize: '12px' }}
                      label={{ value: '생활인구', angle: 90, position: 'insideRight' }}
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
                      verticalAlign="middle" 
                      align="left"
                      wrapperStyle={{ paddingRight: '20px', left: 0 }}
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

