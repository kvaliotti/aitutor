// Analytics system for AI Tutoring Platform

export interface AnalyticsEvent {
  id: string;
  userId: string;
  type: 'page_view' | 'interaction' | 'performance' | 'achievement' | 'error';
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}

// Simple analytics store
class AnalyticsStore {
  private events: AnalyticsEvent[] = [];

  addEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>) {
    const analyticsEvent: AnalyticsEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.events.unshift(analyticsEvent);
    
    // Keep only recent events
    if (this.events.length > 1000) {
      this.events = this.events.slice(0, 1000);
    }

    return analyticsEvent.id;
  }

  getEvents(limit: number = 100): AnalyticsEvent[] {
    return this.events.slice(0, limit);
  }

  getMetrics() {
    const recentEvents = this.events.slice(0, 500);
    
    return {
      totalEvents: recentEvents.length,
      uniqueUsers: new Set(recentEvents.map(e => e.userId)).size,
      pageViews: recentEvents.filter(e => e.type === 'page_view').length,
      achievements: recentEvents.filter(e => e.type === 'achievement').length,
      errors: recentEvents.filter(e => e.type === 'error').length,
      averageResponseTime: this.calculateAverageResponseTime(recentEvents)
    };
  }

  private calculateAverageResponseTime(events: AnalyticsEvent[]): number {
    const performanceEvents = events.filter(e => e.type === 'performance' && e.value);
    if (performanceEvents.length === 0) return 0;
    
    const totalTime = performanceEvents.reduce((sum, e) => sum + (e.value || 0), 0);
    return Math.round(totalTime / performanceEvents.length);
  }
}

const analyticsStore = new AnalyticsStore();

// Tracking functions
export function trackPageView(userId: string, page: string, duration?: number) {
  return analyticsStore.addEvent({
    userId,
    type: 'page_view',
    category: 'navigation',
    action: 'page_view',
    label: page,
    value: duration
  });
}

export function trackInteraction(userId: string, category: string, action: string, label?: string) {
  return analyticsStore.addEvent({
    userId,
    type: 'interaction',
    category,
    action,
    label
  });
}

export function trackPerformance(userId: string, action: string, responseTime: number, endpoint?: string) {
  return analyticsStore.addEvent({
    userId,
    type: 'performance',
    category: 'performance',
    action,
    label: endpoint,
    value: responseTime
  });
}

export function trackAchievement(userId: string, achievementId: string, achievementName: string) {
  return analyticsStore.addEvent({
    userId,
    type: 'achievement',
    category: 'gamification',
    action: 'unlock',
    label: achievementId,
    metadata: { achievementName }
  });
}

export function getAnalyticsDashboard() {
  return {
    metrics: analyticsStore.getMetrics(),
    recentEvents: analyticsStore.getEvents(20)
  };
}

export { analyticsStore }; 