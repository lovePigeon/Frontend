import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { apiClient } from '../../utils/api'
import './TrendIndicators.css'

interface TrendData {
  period: string
  citywide: number
  improvement: number
}

const TrendIndicators = () => {
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await apiClient.getDashboardTrends({ period: 'quarter' })
        
        console.log('📊 TrendIndicators 응답:', response)
        
        // 응답 구조에 따라 유연하게 처리
        if (response && response.data && Array.isArray(response.data)) {
          setTrendData(response.data)
        } else if (Array.isArray(response)) {
          // 응답이 배열로 직접 올 경우
          setTrendData(response)
        } else if (response && response.success && response.data && Array.isArray(response.data)) {
          setTrendData(response.data)
        } else {
          console.warn('⚠️ TrendIndicators: 예상하지 못한 응답 구조:', response)
          setError('데이터를 불러올 수 없습니다.')
        }
      } catch (err) {
        console.error('❌ 추세 데이터 로드 실패:', err)
        setError('데이터를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchTrends()
  }, [])

  if (loading) {
    return (
      <div className="trend-indicators">
        <div className="section-header">
          <h2 className="heading-2">전체 추세 지표</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center' }}>로딩 중...</div>
      </div>
    )
  }

  if (error || trendData.length === 0) {
    return (
      <div className="trend-indicators">
        <div className="section-header">
          <h2 className="heading-2">전체 추세 지표</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-600)' }}>
          {error || '데이터가 없습니다.'}
        </div>
      </div>
    )
  }

  const currentIndex = trendData[trendData.length - 1].citywide
  const previousIndex = trendData.length > 1 ? trendData[trendData.length - 2].citywide : currentIndex
  const change = currentIndex - previousIndex
  const changePercent = previousIndex > 0 ? ((change / previousIndex) * 100).toFixed(1) : '0'

  return (
    <div className="trend-indicators">
      <div className="section-header">
        <h2 className="heading-2">전체 추세 지표</h2>
        <p className="body-small text-secondary mt-sm">
          도시 전역의 편의성 지수 변화 추이
        </p>
      </div>

      <div className="trend-content">
        <div className="trend-summary">
          <div className="summary-card">
            <div className="summary-label">현재 도시 편의성 지수</div>
            <div className="summary-value">{currentIndex}</div>
            <div className="summary-change positive">
              전 분기 대비 +{change}점 ({changePercent}% 증가)
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-label">지속적 개선</div>
            <div className="summary-description">
              지난 5개 분기 동안 꾸준한 개선 추세를 보이고 있습니다.
            </div>
          </div>
        </div>

        <div className="trend-chart-container">
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorCitywide" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--chateau-green-400)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--chateau-green-400)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--gray-200)"
              />
              <XAxis
                dataKey="period"
                stroke="var(--gray-600)"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="var(--gray-600)"
                style={{ fontSize: '12px' }}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--white)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '4px'
                }}
              />
              <Area
                type="monotone"
                dataKey="citywide"
                stroke="var(--chateau-green-600)"
                strokeWidth={2}
                fill="url(#colorCitywide)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default TrendIndicators



