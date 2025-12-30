import { useState } from 'react'
import LocationMap from './LocationMap'
import './PriorityQueue.css'

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
  }
  geoSignals: {
    alleyStructure: string
    ventilation: string
    accessibility: string
  }
  lastInspection?: string
}

const mockData: InspectionItem[] = [
  {
    id: '1',
    location: '서울시 강남구 역삼동 123-45',
    lat: 37.5012,
    lng: 127.0396,
    comfortIndex: 32,
    priority: 'high',
    humanSignals: {
      complaints: 24,
      trend: 'increasing',
      recurrence: 8
    },
    geoSignals: {
      alleyStructure: '좁음',
      ventilation: '불량',
      accessibility: '제한적'
    },
    lastInspection: '2024-01-15'
  },
  {
    id: '2',
    location: '서울시 마포구 상암동 67-89',
    lat: 37.5663,
    lng: 126.9019,
    comfortIndex: 45,
    priority: 'high',
    humanSignals: {
      complaints: 18,
      trend: 'increasing',
      recurrence: 6
    },
    geoSignals: {
      alleyStructure: '보통',
      ventilation: '보통',
      accessibility: '양호'
    },
    lastInspection: '2024-01-20'
  },
  {
    id: '3',
    location: '서울시 종로구 명륜동 12-34',
    lat: 37.5825,
    lng: 126.9982,
    comfortIndex: 58,
    priority: 'medium',
    humanSignals: {
      complaints: 12,
      trend: 'stable',
      recurrence: 4
    },
    geoSignals: {
      alleyStructure: '넓음',
      ventilation: '양호',
      accessibility: '양호'
    },
    lastInspection: '2024-01-10'
  },
  {
    id: '4',
    location: '서울시 송파구 잠실동 56-78',
    lat: 37.5133,
    lng: 127.1028,
    comfortIndex: 72,
    priority: 'low',
    humanSignals: {
      complaints: 5,
      trend: 'decreasing',
      recurrence: 2
    },
    geoSignals: {
      alleyStructure: '넓음',
      ventilation: '양호',
      accessibility: '양호'
    },
    lastInspection: '2024-01-25'
  }
]

const PriorityQueue = () => {
  const [items] = useState<InspectionItem[]>(mockData)
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>()

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

  const mapLocations = items.map((item) => ({
    id: item.id,
    location: item.location,
    lat: item.lat,
    lng: item.lng,
    comfortIndex: item.comfortIndex,
    priority: item.priority
  }))

  return (
    <div className="priority-queue">
      <div className="section-header">
        <h2 className="heading-2">우선순위 검사 대기열</h2>
        <p className="body-small text-secondary mt-sm">
          도시 편의성 지수와 신호 분석을 기반으로 한 순위별 검사 목록
        </p>
      </div>

      <div className="queue-map-section">
        <LocationMap
          locations={mapLocations}
          selectedLocationId={selectedLocationId}
          onLocationClick={(location) => {
            setSelectedLocationId(location.id)
            const element = document.getElementById(`queue-item-${location.id}`)
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}
        />
      </div>

      <div className="queue-list">
        {items.map((item, index) => (
          <div
            key={item.id}
            id={`queue-item-${item.id}`}
            className={`queue-item ${selectedLocationId === item.id ? 'selected' : ''}`}
            onClick={() => setSelectedLocationId(item.id)}
          >
            <div className="queue-item-rank">
              <span className="rank-number">{index + 1}</span>
            </div>
            <div className="queue-item-content">
              <div className="queue-item-header">
                <h3 className="heading-4">{item.location}</h3>
                <div className="queue-item-badges">
                  <span
                    className={`priority-badge priority-${item.priority}`}
                  >
                    {getPriorityLabel(item.priority)}
                  </span>
                  <span className="index-badge">
                    편의성 지수: {item.comfortIndex}
                  </span>
                </div>
              </div>

              <div className="queue-item-details">
                <div className="detail-group">
                  <h4 className="detail-label">인간 신호</h4>
                  <div className="detail-values">
                    <span className="detail-value">
                      민원: <strong>{item.humanSignals.complaints}건</strong>
                    </span>
                    <span className="detail-value">
                      추세:{' '}
                      <strong
                        style={{ color: getTrendColor(item.humanSignals.trend) }}
                      >
                        {getTrendLabel(item.humanSignals.trend)}
                      </strong>
                    </span>
                    <span className="detail-value">
                      재발: <strong>{item.humanSignals.recurrence}회</strong>
                    </span>
                  </div>
                </div>

                <div className="detail-group">
                  <h4 className="detail-label">지리 신호</h4>
                  <div className="detail-values">
                    <span className="detail-value">
                      골목 구조: {item.geoSignals.alleyStructure}
                    </span>
                    <span className="detail-value">
                      환기: {item.geoSignals.ventilation}
                    </span>
                    <span className="detail-value">
                      접근성: {item.geoSignals.accessibility}
                    </span>
                  </div>
                </div>

                {item.lastInspection && (
                  <div className="detail-group">
                    <span className="detail-value text-tertiary">
                      최종 검사: {item.lastInspection}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PriorityQueue

