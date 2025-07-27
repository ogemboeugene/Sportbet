import { useState, useEffect, useCallback } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  memoryUsage: number;
  connectionType: string;
  isOnline: boolean;
}

interface WebVitals {
  fcp: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
}

export const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [webVitals, setWebVitals] = useState<WebVitals>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Measure Web Vitals
  const measureWebVitals = useCallback(() => {
    // First Contentful Paint
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          setWebVitals(prev => ({ ...prev, fcp: entry.startTime }));
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('Paint timing not supported');
    }

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      setWebVitals(prev => ({ ...prev, lcp: lastEntry.startTime }));
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('LCP not supported');
    }

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        setWebVitals(prev => ({ 
          ...prev, 
          fid: (entry as any).processingStart - entry.startTime 
        }));
      }
    });

    try {
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('FID not supported');
    }

    // Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0;
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      setWebVitals(prev => ({ ...prev, cls: clsValue }));
    });

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('CLS not supported');
    }
  }, []);

  // Get connection information
  const getConnectionInfo = useCallback(() => {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    return {
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
    };
  }, []);

  // Get memory usage
  const getMemoryUsage = useCallback(() => {
    const memory = (performance as any).memory;
    if (memory) {
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
      };
    }
    return null;
  }, []);

  // Measure page load performance
  const measurePageLoad = useCallback(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
      const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
      const responseTime = navigation.responseEnd - navigation.requestStart;
      
      return {
        loadTime,
        domContentLoaded,
        responseTime,
        dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcpConnect: navigation.connectEnd - navigation.connectStart,
        serverResponse: navigation.responseEnd - navigation.responseStart,
      };
    }
    
    return null;
  }, []);

  // Calculate performance score
  const calculatePerformanceScore = useCallback((vitals: WebVitals) => {
    let score = 100;
    
    // FCP scoring (good: <1.8s, needs improvement: 1.8-3.0s, poor: >3.0s)
    if (vitals.fcp !== null) {
      if (vitals.fcp > 3000) score -= 25;
      else if (vitals.fcp > 1800) score -= 10;
    }
    
    // LCP scoring (good: <2.5s, needs improvement: 2.5-4.0s, poor: >4.0s)
    if (vitals.lcp !== null) {
      if (vitals.lcp > 4000) score -= 25;
      else if (vitals.lcp > 2500) score -= 10;
    }
    
    // FID scoring (good: <100ms, needs improvement: 100-300ms, poor: >300ms)
    if (vitals.fid !== null) {
      if (vitals.fid > 300) score -= 25;
      else if (vitals.fid > 100) score -= 10;
    }
    
    // CLS scoring (good: <0.1, needs improvement: 0.1-0.25, poor: >0.25)
    if (vitals.cls !== null) {
      if (vitals.cls > 0.25) score -= 25;
      else if (vitals.cls > 0.1) score -= 10;
    }
    
    return Math.max(0, score);
  }, []);

  // Track user interactions
  const trackInteraction = useCallback((action: string, element: string, duration?: number) => {
    const interaction = {
      timestamp: Date.now(),
      action,
      element,
      duration: duration || 0,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Send to analytics (implement your analytics service)
    console.log('User interaction tracked:', interaction);
    
    // You could send this to your backend:
    // fetch('/api/analytics/interaction', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(interaction)
    // });
  }, []);

  // Monitor resource loading
  const monitorResources = useCallback(() => {
    const resources = performance.getEntriesByType('resource');
    const slowResources = resources.filter(resource => resource.duration > 1000);
    
    if (slowResources.length > 0) {
      console.warn('Slow resources detected:', slowResources);
    }
    
    return {
      totalResources: resources.length,
      slowResources: slowResources.length,
      averageLoadTime: resources.reduce((acc, r) => acc + r.duration, 0) / resources.length,
    };
  }, []);

  // Update performance metrics
  const updateMetrics = useCallback(() => {
    const pageLoad = measurePageLoad();
    const memory = getMemoryUsage();
    const connection = getConnectionInfo();
    
    const newMetrics: PerformanceMetrics = {
      loadTime: pageLoad?.loadTime || 0,
      firstContentfulPaint: webVitals.fcp || 0,
      largestContentfulPaint: webVitals.lcp || 0,
      firstInputDelay: webVitals.fid || 0,
      cumulativeLayoutShift: webVitals.cls || 0,
      memoryUsage: memory?.percentage || 0,
      connectionType: connection.effectiveType,
      isOnline,
    };
    
    setMetrics(newMetrics);
    
    // Monitor resources for warnings
    monitorResources();
  }, [webVitals, isOnline, measurePageLoad, getMemoryUsage, getConnectionInfo, monitorResources]);

  // Setup monitoring
  useEffect(() => {
    measureWebVitals();
    
    // Update metrics periodically
    const interval = setInterval(updateMetrics, 10000); // Every 10 seconds
    
    // Monitor online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial metrics update
    setTimeout(updateMetrics, 2000); // Wait 2 seconds for initial page load
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [measureWebVitals, updateMetrics]);

  // Get performance insights
  const getPerformanceInsights = useCallback(() => {
    if (!metrics) return null;
    
    const score = calculatePerformanceScore(webVitals);
    const insights = [];
    
    if (metrics.firstContentfulPaint > 1800) {
      insights.push('First Contentful Paint is slow. Consider optimizing critical resources.');
    }
    
    if (metrics.largestContentfulPaint > 2500) {
      insights.push('Largest Contentful Paint is slow. Optimize images and fonts.');
    }
    
    if (metrics.firstInputDelay > 100) {
      insights.push('First Input Delay is high. Optimize JavaScript execution.');
    }
    
    if (metrics.cumulativeLayoutShift > 0.1) {
      insights.push('Layout shifts detected. Set dimensions for images and ads.');
    }
    
    if (metrics.memoryUsage > 80) {
      insights.push('High memory usage detected. Check for memory leaks.');
    }
    
    return {
      score,
      insights,
      grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
    };
  }, [metrics, webVitals, calculatePerformanceScore]);

  return {
    metrics,
    webVitals,
    isOnline,
    trackInteraction,
    getPerformanceInsights,
    updateMetrics,
  };
};
