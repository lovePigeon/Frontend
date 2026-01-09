import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { apiClient } from '../../utils/api'
import './BeforeAfterTracking.css'

interface TrackingData {
  location: string
  interventionDate: string
  interventionType: string
  beforeData: { date: string; index: number }[]
  afterData: { date: string; index: number }[]
  improvement: number
}

const BeforeAfterTracking = () => {
  const [trackingData, setTrackingData] = useState<TrackingData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [interventionIds, setInterventionIds] = useState<string[]>([])

  useEffect(() => {
    const fetchCompletedInterventions = async () => {
      try {
        const response = await apiClient.getInterventions({ status: 'completed' })
        if (response.success && response.data && response.data.length > 0) {
          setInterventionIds(response.data.slice(0, 3).map((item: any) => item.intervention_id))
        }
      } catch (err) {
        console.error('완료된 개입 목록 로드 실패:', err)
      }
    }

    fetchCompletedInterventions()
  }, [])

  useEffect(() => {
    const fetchEffects = async () => {
      if (interventionIds.length === 0) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        const effects = await Promise.all(
          interventionIds.map(async (interventionId) => {
            try {
              const response = await apiClient.getInterventionEffect(interventionId, {
                baseline_weeks: 4,
                followup_weeks: 4
              })
              return response
            } catch (err) {
              console.error(`개입 효과 로드 실패 (${interventionId}):`, err)
              return null
            }
          })
        )

        console.log('📊 BeforeAfterTracking 응답:', effects)
        
        const validEffects = effects.filter(e => e !== null && (e.success || e.effect))
        
        if (validEffects.length > 0) {
          const formatted = validEffects.map((effect: any) => ({
            location: effect.intervention?.unit_id || '',
            interventionDate: effect.intervention?.start_date || '',
            interventionType: effect.intervention?.intervention_type || '개입',
            beforeData: effect.effect?.baseline_period?.data?.map((d: any) => ({
              date: d.date?.split('-').slice(0, 2).join('-') || '',
              index: d.uci_score || 0
            })) || [],
            afterData: effect.effect?.followup_period?.data?.map((d: any) => ({
              date: d.date?.split('-').slice(0, 2).join('-') || '',
              index: d.uci_score || 0
            })) || [],
            improvement: effect.effect?.improvement || 0
          }))
          setTrackingData(formatted)
        } else {
          setError('효과 데이터를 불러올 수 없습니다.')
        }
      } catch (err) {
        console.error('개입 효과 데이터 로드 실패:', err)
        setError('데이터를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchEffects()
  }, [interventionIds])

  if (loading) {
    return (
      <div className="before-after-tracking">
        <div className="section-header">
          <h2 className="heading-2">개입 전후 효과 추적</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center' }}>로딩 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="before-after-tracking">
        <div className="section-header">
          <h2 className="heading-2">개입 전후 효과 추적</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-600)' }}>
          {error}
        </div>
      </div>
    )
  }

  if (trackingData.length === 0) {
    return (
      <div className="before-after-tracking">
        <div className="section-header">
          <h2 className="heading-2">개입 전후 효과 추적</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-600)' }}>
          데이터가 없습니다.
        </div>
      </div>
    )
  }

  const formatChartData = (data: TrackingData) => {
    const combined = [
      ...data.beforeData.map((d) => ({ ...d, type: '개입 전' })),
      ...data.afterData.map((d) => ({ ...d, type: '개입 후' }))
    ]
    return combined
  }

  return (
    <div className="before-after-tracking">
      <div className="section-header">
        <h2 className="heading-2">개입 전후 효과 추적</h2>
        <p className="body-small text-secondary mt-sm">
          과거 개입 사례의 효과 측정 및 검증 결과
        </p>
      </div>

      <div className="tracking-list">
        {trackingData.map((data, index) => (
          <div key={index} className="tracking-item">
            <div className="tracking-header">
              <div>
                <h3 className="heading-4">{data.location}</h3>
                <div className="tracking-meta">
                  <span className="intervention-date">
                    개입일: {data.interventionDate}
                  </span>
                  <span className="intervention-type-badge">
                    {data.interventionType}
                  </span>
                </div>
              </div>
              <div className="improvement-indicator">
                <span className="improvement-label">개선 효과</span>
                <span className="improvement-value">
                  +{data.improvement}점
                </span>
              </div>
            </div>

            <div className="tracking-chart">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={formatChartData(data)}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--gray-200)"
                  />
                  <XAxis
                    dataKey="date"
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
                  <Line
                    type="monotone"
                    dataKey="index"
                    stroke="var(--chateau-green-600)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--chateau-green-600)', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="tracking-legend">
              <div className="legend-item">
                <div className="legend-line before"></div>
                <span>개입 전</span>
              </div>
              <div className="legend-item">
                <div className="legend-line after"></div>
                <span>개입 후</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default BeforeAfterTracking



