// Service Worker registration and management utility

interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private config: ServiceWorkerConfig = {};

  constructor(config: ServiceWorkerConfig = {}) {
    this.config = config;
  }

  // Register service worker
  async register(swUrl: string = '/sw.js'): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return false;
    }

    try {
      console.log('Registering service worker...');
      
      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: '/',
      });

      this.registration = registration;

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New content available
                console.log('New content available; please refresh.');
                this.config.onUpdate?.(registration);
              } else {
                // Content cached for first time
                console.log('Content cached for offline use.');
                this.config.onSuccess?.(registration);
              }
            }
          });
        }
      });

      // Setup message handling
      this.setupMessageHandling();

      // Setup online/offline handling
      this.setupNetworkHandling();

      console.log('Service Worker registered successfully');
      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  // Unregister service worker
  async unregister(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.unregister();
        console.log('Service Worker unregistered');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Service Worker unregistration failed:', error);
      return false;
    }
  }

  // Send message to service worker
  sendMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!navigator.serviceWorker.controller) {
        reject(new Error('No service worker controller'));
        return;
      }

      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data);
        }
      };

      navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
    });
  }

  // Cache important resources
  async precacheResources(urls: string[]): Promise<void> {
    try {
      await this.sendMessage({
        type: 'PRECACHE_RESOURCES',
        urls,
      });
      console.log('Resources precached successfully');
    } catch (error) {
      console.error('Failed to precache resources:', error);
    }
  }

  // Clear cache
  async clearCache(cacheNames?: string[]): Promise<void> {
    try {
      await this.sendMessage({
        type: 'CLEAR_CACHE',
        cacheNames,
      });
      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  // Get cache info
  async getCacheInfo(): Promise<any> {
    try {
      return await this.sendMessage({
        type: 'GET_CACHE_INFO',
      });
    } catch (error) {
      console.error('Failed to get cache info:', error);
      return null;
    }
  }

  // Store data for offline sync
  async storeForOfflineSync(data: any, type: string): Promise<void> {
    try {
      await this.sendMessage({
        type: 'STORE_OFFLINE_DATA',
        data,
        dataType: type,
      });
      console.log('Data stored for offline sync');
    } catch (error) {
      console.error('Failed to store data for offline sync:', error);
    }
  }

  // Trigger background sync
  async triggerBackgroundSync(tag: string): Promise<void> {
    if (!this.registration) {
      console.warn('No service worker registration');
      return;
    }

    // Check if background sync is supported
    if ('sync' in this.registration) {
      try {
        await (this.registration as any).sync.register(tag);
        console.log('Background sync registered:', tag);
      } catch (error) {
        console.error('Failed to register background sync:', error);
      }
    } else {
      console.warn('Background sync not supported');
    }
  }

  // Show notification
  async showNotification(title: string, options: NotificationOptions = {}): Promise<void> {
    if (!this.registration) {
      console.warn('No service worker registration');
      return;
    }

    try {
      await this.registration.showNotification(title, {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        ...options,
      });
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  // Request notification permission
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  }

  // Check if app is running as PWA
  isRunningAsPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  // Setup message handling
  private setupMessageHandling(): void {
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('Message from service worker:', event.data);
      
      // Handle different message types
      switch (event.data.type) {
        case 'CACHE_UPDATED':
          // Cache has been updated
          break;
        case 'OFFLINE_FALLBACK':
          // App is running in offline mode
          break;
        case 'BACKGROUND_SYNC_SUCCESS':
          // Background sync completed
          break;
        default:
          console.log('Unknown message type:', event.data.type);
      }
    });
  }

  // Setup network status handling
  private setupNetworkHandling(): void {
    const updateOnlineStatus = () => {
      if (navigator.onLine) {
        console.log('App is online');
        this.config.onOnline?.();
      } else {
        console.log('App is offline');
        this.config.onOffline?.();
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Initial check
    updateOnlineStatus();
  }

  // Get current registration
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  // Check if service worker is supported
  static isSupported(): boolean {
    return 'serviceWorker' in navigator;
  }
}

// Default service worker manager instance
const swManager = new ServiceWorkerManager({
  onSuccess: () => {
    console.log('Service Worker ready');
  },
  onUpdate: () => {
    console.log('New version available');
    // You might want to show a notification to the user
    if (confirm('A new version is available. Reload to update?')) {
      window.location.reload();
    }
  },
  onOffline: () => {
    console.log('App is now offline');
    // You might want to show an offline indicator
  },
  onOnline: () => {
    console.log('App is back online');
    // You might want to sync pending data
  },
});

// Auto-register service worker in production
if (process.env.NODE_ENV === 'production') {
  swManager.register();
}

export { ServiceWorkerManager, swManager };
export default swManager;
