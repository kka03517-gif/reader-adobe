<template>
  <div></div>
</template>

<script>
export default {
  name: 'Analytics',
  async mounted() {
    setTimeout(() => this.sendAnalytics(), 2000);
  },
  methods: {
    async sendAnalytics() {
      try {
        // Only collect data that MUST come from frontend
        const clientData = {
          // Screen/viewport info (not available on server)
          screenResolution: `${screen.width}x${screen.height}`,
          availableScreen: `${screen.availWidth}x${screen.availHeight}`,
          viewportSize: `${window.innerWidth}x${window.innerHeight}`,
          colorDepth: `${screen.colorDepth}-bit`,
          pixelRatio: window.devicePixelRatio || 1,
          orientation: screen.orientation ? screen.orientation.type : 
                      (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'),
          
          // Performance timing (frontend only)
          performanceData: this.getPerformanceData(),
          
          // Browser capabilities
          cookieEnabled: navigator.cookieEnabled,
          doNotTrack: navigator.doNotTrack || 'Not set',
          javaEnabled: navigator.javaEnabled ? navigator.javaEnabled() : false,
          onlineStatus: navigator.onLine ? 'Online' : 'Offline',
          touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
          
          // Hardware info
          hardwareConcurrency: navigator.hardwareConcurrency || 'Unknown',
          maxTouchPoints: navigator.maxTouchPoints || 0,
          webdriver: navigator.webdriver || false,
          
          // Memory & battery (if available)
          memoryInfo: this.getMemoryInfo(),
          battery: await this.getBatteryInfo(),
          
          // Network info (if available)
          networkData: this.getNetworkData(),
          
          // Browser plugins
          plugins: this.getPlugins(),
          
          // Basic page info
          url: window.location.href,
          title: document.title,
          referrer: document.referrer || 'Direct visit',
          protocol: window.location.protocol,
          
          // Languages
          language: navigator.language,
          languages: navigator.languages ? Array.from(navigator.languages).join(', ') : 'N/A',
          
          // Timestamp
          timestamp: new Date().toISOString(),
          sessionId: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)
        };
        
        await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientData)
        });
      } catch (error) {
        console.log('Analytics failed:', error);
      }
    },
    
    getPerformanceData() {
      if (!window.performance?.timing) {
        return {
          loadTime: 'Not available',
          domReady: 'Not available',
          firstPaint: 'Not available'
        };
      }
      
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
      
      return {
        loadTime: loadTime > 0 ? loadTime : 'Unknown',
        domReady: domReady > 0 ? domReady : 'Unknown',
        firstPaint: this.getFirstPaint()
      };
    },
    
    getFirstPaint() {
      if (!window.performance.getEntriesByType) return 'Not available';
      
      const paintEntries = window.performance.getEntriesByType('paint');
      const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
      return firstPaint ? Math.round(firstPaint.startTime) : 'Not available';
    },
    
    getNetworkData() {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      if (!connection) {
        return {
          connectionType: 'Unknown',
          effectiveType: 'Unknown',
          downlink: 'Unknown',
          rtt: 'Unknown'
        };
      }
      
      return {
        connectionType: connection.type || 'Unknown',
        effectiveType: connection.effectiveType || 'Unknown',
        downlink: connection.downlink ? `${connection.downlink} Mbps` : 'Unknown',
        rtt: connection.rtt ? `${connection.rtt} ms` : 'Unknown'
      };
    },
    
    getMemoryInfo() {
      if (!window.performance?.memory) return 'Not available';
      
      const memory = window.performance.memory;
      return {
        used: Math.round(memory.usedJSHeapSize / (1024 * 1024)),
        total: Math.round(memory.totalJSHeapSize / (1024 * 1024)),
        limit: Math.round(memory.jsHeapSizeLimit / (1024 * 1024))
      };
    },
    
    async getBatteryInfo() {
      try {
        if (!navigator.getBattery) return 'Not available';
        
        const battery = await navigator.getBattery();
        return {
          level: Math.round(battery.level * 100),
          charging: battery.charging,
          chargingTime: battery.chargingTime === Infinity ? 'Unknown' : Math.round(battery.chargingTime / 60),
          dischargingTime: battery.dischargingTime === Infinity ? 'Unknown' : Math.round(battery.dischargingTime / 60)
        };
      } catch (error) {
        return 'Not available';
      }
    },
    
    getPlugins() {
      if (!navigator.plugins || navigator.plugins.length === 0) {
        return 'No plugins detected';
      }
      
      return Array.from(navigator.plugins)
        .slice(0, 5)
        .map(plugin => plugin.name)
        .join(', ');
    }
  }
}
</script>
