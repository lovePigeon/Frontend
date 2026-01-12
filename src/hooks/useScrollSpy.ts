import { useEffect, useState, RefObject } from 'react'

interface UseScrollSpyOptions {
  /**
   * 섹션 refs 객체
   * 예: { section1: ref1, section2: ref2 }
   */
  sections: Record<string, RefObject<HTMLElement>>
  /**
   * 활성화 기준점 (viewport 상단 기준 비율, 0-1)
   * 기본값: 0.25 (25% 지점)
   */
  threshold?: number
  /**
   * 루트 마진 (px)
   * 기본값: -100 (상단 100px 여유)
   */
  rootMargin?: string
}

/**
 * IntersectionObserver를 사용한 scroll-spy 훅
 * 
 * @example
 * const sections = {
 *   priority: useRef<HTMLElement>(null),
 *   recommendations: useRef<HTMLElement>(null)
 * }
 * const activeSection = useScrollSpy({ sections })
 */
export function useScrollSpy({
  sections,
  threshold = 0.25,
  rootMargin = '-100px 0px -50% 0px'
}: UseScrollSpyOptions): string | null {
  const [activeSection, setActiveSection] = useState<string | null>(null)

  useEffect(() => {
    const sectionEntries = Object.entries(sections)
      .map(([key, ref]) => ({ key, element: ref.current }))
      .filter(({ element }) => element !== null) as Array<{
      key: string
      element: HTMLElement
    }>

    if (sectionEntries.length === 0) return

    // IntersectionObserver 옵션
    const observerOptions: IntersectionObserverInit = {
      root: null, // viewport
      rootMargin,
      threshold: [0, threshold, 0.5, 1] // 여러 임계값으로 더 정확한 감지
    }

    // 각 섹션의 가시성과 위치를 추적
    const sectionStates = new Map<string, {
      isIntersecting: boolean
      intersectionRatio: number
      top: number
    }>()

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const sectionKey = sectionEntries.find(
          ({ element }) => element === entry.target
        )?.key

        if (!sectionKey) return

        sectionStates.set(sectionKey, {
          isIntersecting: entry.isIntersecting,
          intersectionRatio: entry.intersectionRatio,
          top: entry.boundingClientRect.top
        })
      })

      // 가장 많이 보이는 섹션 찾기
      const visibleSections = Array.from(sectionStates.entries())
        .filter(([_, state]) => state.isIntersecting)
        .sort((a, b) => {
          // 1. intersectionRatio가 높은 순
          if (Math.abs(a[1].intersectionRatio - b[1].intersectionRatio) > 0.1) {
            return b[1].intersectionRatio - a[1].intersectionRatio
          }
          // 2. viewport 상단에 가까운 순 (더 위에 있는 것)
          return Math.abs(a[1].top) - Math.abs(b[1].top)
        })

      if (visibleSections.length > 0) {
        // 가장 많이 보이는 섹션을 활성화
        const [activeKey] = visibleSections[0]
        setActiveSection(activeKey)
      } else {
        // 보이는 섹션이 없으면, 가장 가까운 섹션 찾기
        const allSections = Array.from(sectionStates.entries())
          .map(([key, state]) => ({
            key,
            distance: Math.abs(state.top)
          }))
          .sort((a, b) => a.distance - b.distance)

        if (allSections.length > 0) {
          setActiveSection(allSections[0].key)
        }
      }
    }, observerOptions)

    // 모든 섹션 관찰 시작
    sectionEntries.forEach(({ element }) => {
      observer.observe(element)
    })

    // 초기 활성 섹션 설정 (페이지 로드 시)
    const updateInitialActive = () => {
      const viewportTop = window.scrollY
      const viewportHeight = window.innerHeight
      const triggerPoint = viewportTop + viewportHeight * threshold

      type SectionInfo = { key: string; distance: number }
      let closestSection: SectionInfo | null = null

      sectionEntries.forEach(({ key, element }) => {
        const rect = element.getBoundingClientRect()
        const sectionTop = viewportTop + rect.top
        const sectionBottom = sectionTop + rect.height

        // 섹션이 viewport 내에 있거나 trigger point를 지나갔는지 확인
        if (sectionTop <= triggerPoint && sectionBottom >= triggerPoint) {
          const distance = Math.abs(sectionTop - triggerPoint)
          if (!closestSection || distance < closestSection.distance) {
            closestSection = { key, distance }
          }
        }
      })

      if (closestSection) {
        setActiveSection((closestSection as SectionInfo).key)
      } else if (sectionEntries.length > 0) {
        // 기본적으로 첫 번째 섹션 활성화
        setActiveSection(sectionEntries[0].key)
      }
    }

    // 초기 설정
    updateInitialActive()

    // 스크롤 이벤트로 보완 (IntersectionObserver만으로는 부족할 수 있음)
    const handleScroll = () => {
      const viewportTop = window.scrollY
      const viewportHeight = window.innerHeight
      const triggerPoint = viewportTop + viewportHeight * threshold

      type BestSectionInfo = { key: string; distance: number; ratio: number }
      let bestSection: BestSectionInfo | null = null

      sectionEntries.forEach(({ key, element }) => {
        const rect = element.getBoundingClientRect()
        const sectionTop = viewportTop + rect.top
        const sectionBottom = sectionTop + rect.height
        const sectionHeight = rect.height

        // 섹션이 trigger point를 지나갔는지 확인
        if (sectionTop <= triggerPoint && sectionBottom >= triggerPoint) {
          // 섹션이 viewport에 얼마나 보이는지 계산
          const visibleTop = Math.max(0, viewportTop - sectionTop)
          const visibleBottom = Math.min(sectionHeight, viewportTop + viewportHeight - sectionTop)
          const visibleHeight = Math.max(0, visibleBottom - visibleTop)
          const visibleRatio = visibleHeight / sectionHeight

          const distance = Math.abs(sectionTop - triggerPoint)

          if (!bestSection || visibleRatio > bestSection.ratio || 
              (Math.abs(visibleRatio - bestSection.ratio) < 0.1 && distance < bestSection.distance)) {
            bestSection = { key, distance, ratio: visibleRatio }
          }
        }
      })

      if (bestSection) {
        setActiveSection((bestSection as BestSectionInfo).key)
      }
    }

    // 스크롤 이벤트 리스너 (throttle 적용)
    let scrollTimeout: number | null = null
    const throttledScroll = () => {
      if (scrollTimeout !== null) return
      scrollTimeout = window.setTimeout(() => {
        handleScroll()
        scrollTimeout = null
      }, 100)
    }

    window.addEventListener('scroll', throttledScroll, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', throttledScroll)
      if (scrollTimeout !== null) {
        window.clearTimeout(scrollTimeout)
      }
    }
  }, [sections, threshold, rootMargin])

  return activeSection
}

