# 도시 편의성 분석 대시보드

정책 의사결정을 위한 도시 분석 대시보드 및 시민용 공개 뷰

## 프로젝트 구조

```
frontend/
├── src/
│   ├── components/
│   │   ├── admin/          # 관리자 대시보드 컴포넌트
│   │   │   ├── PriorityQueue.tsx
│   │   │   ├── LocationMap.tsx
│   │   │   ├── ActionRecommendations.tsx
│   │   │   └── BeforeAfterTracking.tsx
│   │   ├── public/         # 시민용 공개 뷰 컴포넌트
│   │   │   ├── TrendIndicators.tsx
│   │   │   ├── RegionalTrendMap.tsx
│   │   │   ├── ImprovementStatus.tsx
│   │   │   └── ReportingGuide.tsx
│   │   └── Layout.tsx      # 레이아웃 및 네비게이션
│   ├── pages/
│   │   ├── AdminDashboard.tsx
│   │   └── PublicView.tsx
│   ├── styles/
│   │   └── design-system.css  # 디자인 시스템
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── vite.config.ts
```

## 디자인 시스템

### 색상 팔레트
- **Primary**: Chateau Green (도시 편의성 강조, 긍정적 신호)
- **Neutral**: 흰색, 회색 계열 (대부분의 배경 및 텍스트)

### 타이포그래피
- 모든 제목과 헤딩: `letter-spacing: -1px` 적용
- 명확한 계층 구조를 통한 시각적 구분

### 레이아웃 원칙
- 넉넉한 여백과 공간
- 섹션 기반 레이아웃 (카드 그리드 최소화)
- Apple 스타일의 미니멀한 디자인

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 환경 변수 설정 (선택사항)
# .env 파일을 생성하고 Mapbox 토큰을 설정하세요
# VITE_MAPBOX_TOKEN=your_token_here
# 토큰이 없어도 기본 공개 토큰으로 동작합니다

# 개발 서버 실행
npm run dev

# 빌드
npm run build
```

## 주요 기능

### 관리자 대시보드
- **우선순위 검사 대기열**: 도시 편의성 지수 기반 순위별 검사 목록
  - 위치별 지도 시각화 (우선순위별 색상 구분)
  - 지도와 리스트 상호작용 (클릭 시 하이라이트)
- **개입 권고사항**: 데이터 기반 개입 유형 및 예상 효과 분석
- **개입 전후 효과 추적**: 과거 개입 사례의 효과 측정 및 검증

### 시민용 공개 뷰
- **전체 추세 지표**: 도시 전역의 편의성 지수 변화 추이
- **지역별 현황**: 구 단위 지역별 상태 지도 (정확한 핫스팟 노출 없음)
- **개선 현황**: 진행 중인 도시 편의성 개선 사업 현황
- **민원 신고 안내**: 간단한 절차로 문제 신고 가능

## 기술 스택

- React 18
- TypeScript
- Vite
- React Router
- Recharts (차트 라이브러리)
- Mapbox GL JS (지도 시각화)

## 디자인 철학

이 대시보드는 일반적인 관리자 대시보드가 아닌 **정책 의사결정 도구**입니다.

- Apple 공식 웹사이트 스타일의 차분하고 자신감 있는 미니멀 디자인
- 타이포그래피와 간격을 통한 강한 계층 구조
- 넉넉한 여백
- 절제되었지만 의도적인 색상 사용
- 무거운 테두리나 박스형 UI 최소화

학술/정책 발표에서 신뢰할 수 있는 시각적 품질을 목표로 합니다.

