<template>
  <div v-if="showBanner" class="cookie-banner">
    <div class="cookie-overlay" @click="handleOverlayClick">
      <div class="cookie-content" @click.stop>
        <div class="cookie-text">
          <h2>How we use cookies and your consent</h2>
          <p>We use cookies and similar technologies ('Cookies') on our websites and apps to improve them, measure their performance, understand our audience and enhance the user experience. On some sites and apps, we also use Cookies to show ads based on users' browsing activities and interests on the site and other sites. Click 'Manage Cookies' below to learn what Cookies we use on this site and why. You can always change your consent preferences using the 'Manage Cookies' tool at the bottom of the screen (available as a link instead of a button on some sites). This includes rejecting some or all Cookies, except those that are strictly necessary for the site to work.</p>
        </div>
        
        <div class="cookie-actions">
          <button @click="showCustomize" class="manage-btn">Manage cookies</button>
          <button @click="rejectAll" class="reject-btn">Reject All</button>
          <button @click="acceptAll" class="accept-btn">Accept cookies</button>
        </div>
      </div>
    </div>
    
    <!-- Customize Modal -->
    <div v-if="showCustomizeModal" class="customize-modal-overlay" @click="closeCustomize">
      <div class="customize-modal" @click.stop>
        <div class="customize-header">
          <h2>Manage Preferences</h2>
          <button @click="closeCustomize" class="close-btn">&times;</button>
        </div>
        
        <div class="customize-content">
          <div class="cookie-category">
            <div class="category-header">
              <div class="category-info">
                <h3>Essential cookies</h3>
                <p>These cookies are necessary for the website to function and cannot be switched off.</p>
              </div>
              <div class="category-toggle">
                <div class="toggle-switch disabled">
                  <div class="toggle-slider active"></div>
                </div>
                <span class="toggle-label">Always active</span>
              </div>
            </div>
          </div>
          
          <div class="cookie-category">
            <div class="category-header">
              <div class="category-info">
                <h3>Performance cookies</h3>
                <p>These cookies allow us to collect anonymous statistics to understand how visitors use our website and improve performance.</p>
              </div>
              <div class="category-toggle">
                <div class="toggle-switch" :class="{ active: preferences.performance }" @click="togglePerformance">
                  <div class="toggle-slider" :class="{ active: preferences.performance }"></div>
                </div>
                <span class="toggle-label">{{ preferences.performance ? 'Active' : 'Inactive' }}</span>
              </div>
            </div>
          </div>
          
          <div class="cookie-category">
            <div class="category-header">
              <div class="category-info">
                <h3>Functional cookies</h3>
                <p>These cookies enable enhanced functionality and personalization, such as remembering your preferences.</p>
              </div>
              <div class="category-toggle">
                <div class="toggle-switch" :class="{ active: preferences.functional }" @click="toggleFunctional">
                  <div class="toggle-slider" :class="{ active: preferences.functional }"></div>
                </div>
                <span class="toggle-label">{{ preferences.functional ? 'Active' : 'Inactive' }}</span>
              </div>
            </div>
          </div>
          
          <div class="cookie-category">
            <div class="category-header">
              <div class="category-info">
                <h3>Advertising cookies</h3>
                <p>These cookies are used to deliver relevant advertisements and marketing content based on your interests.</p>
              </div>
              <div class="category-toggle">
                <div class="toggle-switch" :class="{ active: preferences.advertising }" @click="toggleAdvertising">
                  <div class="toggle-slider" :class="{ active: preferences.advertising }"></div>
                </div>
                <span class="toggle-label">{{ preferences.advertising ? 'Active' : 'Inactive' }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="customize-actions">
          <button @click="saveCustomPreferences" class="save-btn">Save preferences</button>
          <button @click="acceptAllFromCustomize" class="accept-all-btn">Accept all</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CookieBanner',
  data() {
    return {
      showBanner: true,
      showCustomizeModal: false,
      preferences: {
        essential: true,
        performance: false,
        functional: false,
        advertising: false
      }
    }
  },
  mounted() {
    const cookieConsent = this.getCookie('cookieConsent');
    if (cookieConsent) {
      this.showBanner = false;
      const consent = JSON.parse(cookieConsent);
      this.$emit('cookie-consent', consent);
    }
    
    // Prevent body scroll when banner is shown
    if (this.showBanner) {
      document.body.style.overflow = 'hidden';
    }
  },
  beforeUnmount() {
    // Restore body scroll
    document.body.style.overflow = '';
  },
  methods: {
    handleOverlayClick() {
      // Optional: Don't close on overlay click for better UX
      // You can uncomment the line below if you want to allow closing on overlay click
      // this.rejectAll();
    },
    
    // Updated cookie utility method with Secure flag
    setCookie(name, value, days = 365) {
      const expires = new Date();
      expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
      const secure = location.protocol === 'https:' ? ';Secure' : '';
      document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax${secure}`;
    },
    
    getCookie(name) {
      const nameEQ = name + "=";
      const ca = document.cookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
          return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
      }
      return null;
    },
    
    deleteCookie(name) {
      const secure = location.protocol === 'https:' ? ';Secure' : '';
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/;SameSite=Lax${secure}`;
    },
    
    acceptAll() {
      const consent = {
        accepted: true,
        timestamp: new Date().toISOString(),
        preferences: {
          essential: true,
          performance: true,
          functional: true,
          advertising: true
        }
      };
      this.saveConsent(consent);
    },
    
    rejectAll() {
      const consent = {
        accepted: false,
        timestamp: new Date().toISOString(),
        preferences: {
          essential: true,
          performance: false,
          functional: false,
          advertising: false
        }
      };
      this.saveConsent(consent);
    },
    
    showCustomize() {
      this.showCustomizeModal = true;
    },
    
    closeCustomize() {
      this.showCustomizeModal = false;
    },
    
    togglePerformance() {
      this.preferences.performance = !this.preferences.performance;
    },
    
    toggleFunctional() {
      this.preferences.functional = !this.preferences.functional;
    },
    
    toggleAdvertising() {
      this.preferences.advertising = !this.preferences.advertising;
    },
    
    saveCustomPreferences() {
      const consent = {
        accepted: this.preferences.performance || this.preferences.functional || this.preferences.advertising,
        timestamp: new Date().toISOString(),
        preferences: { ...this.preferences }
      };
      this.saveConsent(consent);
      this.closeCustomize();
    },
    
    acceptAllFromCustomize() {
      this.preferences.performance = true;
      this.preferences.functional = true;
      this.preferences.advertising = true;
      this.saveCustomPreferences();
    },
    
    saveConsent(consent) {
      // Save to both cookie and localStorage for compatibility
      this.setCookie('cookieConsent', JSON.stringify(consent), 365);
      localStorage.setItem('cookieConsent', JSON.stringify(consent));
      
      // Set individual preference cookies
      if (consent.preferences.performance) {
        this.setCookie('performance_cookies', 'true', 365);
      } else {
        this.deleteCookie('performance_cookies');
      }
      
      if (consent.preferences.functional) {
        this.setCookie('functional_cookies', 'true', 365);
      } else {
        this.deleteCookie('functional_cookies');
      }
      
      if (consent.preferences.advertising) {
        this.setCookie('advertising_cookies', 'true', 365);
      } else {
        this.deleteCookie('advertising_cookies');
      }
      
      // Always set essential cookies
      this.setCookie('essential_cookies', 'true', 365);
      
      this.showBanner = false;
      document.body.style.overflow = ''; // Restore body scroll
      this.$emit('cookie-consent', consent);
    }
  }
}
</script>

<style scoped>
/* Cookie Banner - Centered Modal Style */
.cookie-banner {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { 
    opacity: 0;
  }
  to { 
    opacity: 1;
  }
}

.cookie-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.cookie-content {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  animation: slideIn 0.3s ease-out;
  position: relative;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Text section */
.cookie-text {
  flex: 1;
}

.cookie-text h2 {
  margin: 0 0 16px 0;
  font-size: 22px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.3;
}

.cookie-text p {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: #4a4a4a;
}

/* Actions section */
.cookie-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cookie-actions button {
  padding: 14px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.2s ease;
  min-height: 48px;
  font-family: inherit;
  position: relative;
  overflow: hidden;
}

.manage-btn {
  background: #f8f9fa;
  color: #333;
  border: 2px solid #e9ecef;
}

.manage-btn:hover {
  background: #e9ecef;
  border-color: #dee2e6;
  transform: translateY(-1px);
}

.reject-btn {
  background: #6c757d;
  color: white;
}

.reject-btn:hover {
  background: #5a6268;
  transform: translateY(-1px);
}

.accept-btn {
  background: #007bff;
  color: white;
}

.accept-btn:hover {
  background: #0056b3;
  transform: translateY(-1px);
}

/* Customize Modal */
.customize-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.customize-modal {
  background: white;
  border-radius: 12px;
  max-width: 650px;
  width: 100%;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
  font-family: inherit;
  animation: slideIn 0.3s ease-out;
}

.customize-header {
  padding: 24px 32px 20px 32px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8f9fa;
}

.customize-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: #6c757d;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.close-btn:hover {
  color: #1a1a1a;
  background: #e9ecef;
}

.customize-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}

.cookie-category {
  margin-bottom: 28px;
  padding-bottom: 28px;
  border-bottom: 1px solid #e9ecef;
}

.cookie-category:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.category-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.category-info {
  flex: 1;
}

.category-info h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.category-info p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #6c757d;
}

.category-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.toggle-switch {
  width: 52px;
  height: 28px;
  background: #dee2e6;
  border-radius: 14px;
  position: relative;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.toggle-switch.active {
  background: #007bff;
}

.toggle-switch.disabled {
  background: #007bff;
  cursor: not-allowed;
}

.toggle-slider {
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.toggle-slider.active {
  transform: translateX(24px);
}

.toggle-label {
  font-size: 14px;
  color: #6c757d;
  font-weight: 500;
  min-width: 70px;
}

.customize-actions {
  padding: 20px 32px 24px 32px;
  border-top: 1px solid #e9ecef;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  background: #f8f9fa;
}

.save-btn,
.accept-all-btn {
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
  font-family: inherit;
  min-height: 44px;
}

.save-btn {
  background: #007bff;
  color: white;
  border: none;
}

.save-btn:hover {
  background: #0056b3;
  transform: translateY(-1px);
}

.accept-all-btn {
  background: transparent;
  color: #007bff;
  border: 2px solid #007bff;
}

.accept-all-btn:hover {
  background: #007bff;
  color: white;
  transform: translateY(-1px);
}

/* Responsive Design */

/* Large Desktop */
@media (min-width: 1200px) {
  .cookie-content {
    max-width: 700px;
    padding: 40px;
  }
  
  .cookie-text h2 {
    font-size: 24px;
  }
  
  .cookie-text p {
    font-size: 16px;
  }
  
  .cookie-actions {
    flex-direction: row;
    justify-content: flex-end;
  }
  
  .cookie-actions button {
    min-width: 140px;
  }
}

/* Desktop */
@media (min-width: 992px) and (max-width: 1199px) {
  .cookie-content {
    max-width: 650px;
  }
  
  .cookie-actions {
    flex-direction: row;
    justify-content: flex-end;
  }
  
  .cookie-actions button {
    min-width: 130px;
  }
}

/* Tablet */
@media (min-width: 768px) and (max-width: 991px) {
  .cookie-overlay {
    padding: 16px;
  }
  
  .cookie-content {
    max-width: 580px;
    padding: 28px;
  }
  
  .cookie-text h2 {
    font-size: 20px;
  }
  
  .cookie-text p {
    font-size: 14px;
  }
  
  .cookie-actions {
    flex-direction: column;
  }
  
  .customize-modal {
    max-width: 500px;
  }
  
  .category-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .category-toggle {
    align-self: flex-end;
  }
}

/* Mobile Large */
@media (min-width: 480px) and (max-width: 767px) {
  .cookie-overlay {
    padding: 12px;
  }
  
  .cookie-content {
    padding: 24px;
    border-radius: 8px;
    max-height: 85vh;
  }
  
  .cookie-text h2 {
    font-size: 18px;
    margin-bottom: 12px;
  }
  
  .cookie-text p {
    font-size: 14px;
    line-height: 1.5;
  }
  
  .cookie-actions button {
    font-size: 14px;
    min-height: 44px;
  }
  
  .customize-modal {
    margin: 12px;
    max-height: calc(100vh - 24px);
  }
  
  .customize-header,
  .customize-content,
  .customize-actions {
    padding-left: 24px;
    padding-right: 24px;
  }
  
  .category-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .category-toggle {
    align-self: flex-end;
  }
  
  .customize-actions {
    flex-direction: column;
  }
  
  .customize-actions button {
    width: 100%;
  }
}

/* Mobile Small */
@media (max-width: 479px) {
  .cookie-overlay {
    padding: 8px;
    align-items: flex-end;
  }
  
  .cookie-content {
    padding: 20px;
    border-radius: 8px 8px 0 0;
    max-height: 90vh;
    width: 100%;
    max-width: none;
  }
  
  .cookie-text h2 {
    font-size: 16px;
    margin-bottom: 12px;
    line-height: 1.2;
  }
  
  .cookie-text p {
    font-size: 13px;
    line-height: 1.4;
  }
  
  .cookie-actions {
    gap: 10px;
  }
  
  .cookie-actions button {
    font-size: 13px;
    padding: 12px 20px;
    min-height: 42px;
  }
  
  .customize-modal {
    margin: 0;
    border-radius: 12px 12px 0 0;
    max-height: 95vh;
    width: 100%;
    max-width: none;
  }
  
  .customize-header {
    padding: 20px 20px 16px 20px;
  }
  
  .customize-header h2 {
    font-size: 18px;
  }
  
  .customize-content {
    padding: 20px;
  }
  
  .customize-actions {
    padding: 16px 20px 20px 20px;
    flex-direction: column;
  }
  
  .customize-actions button {
    width: 100%;
    font-size: 13px;
  }
  
  .category-info h3 {
    font-size: 15px;
  }
  
  .category-info p {
    font-size: 13px;
  }
}

/* Very Small Mobile */
@media (max-width: 360px) {
  .cookie-content {
    padding: 16px;
  }
  
  .cookie-text h2 {
    font-size: 15px;
  }
  
  .cookie-text p {
    font-size: 12px;
  }
  
  .cookie-actions button {
    font-size: 12px;
    padding: 10px 16px;
    min-height: 40px;
  }
  
  .customize-header,
  .customize-content,
  .customize-actions {
    padding-left: 16px;
    padding-right: 16px;
  }
}

/* Landscape Mobile */
@media (max-height: 500px) and (orientation: landscape) {
  .cookie-overlay {
    align-items: center;
  }
  
  .cookie-content {
    max-height: 95vh;
    border-radius: 8px;
  }
  
  .customize-modal {
    max-height: 95vh;
    border-radius: 8px;
  }
}

/* High DPI Displays */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .toggle-slider {
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  }
}

/* Accessibility - Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .cookie-banner,
  .cookie-content,
  .customize-modal {
    animation: none;
  }
  
  .cookie-actions button,
  .toggle-switch,
  .toggle-slider {
    transition: none;
  }
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  .cookie-content {
    background: #1a1a1a;
    color: #ffffff;
  }
  
  .cookie-text h2 {
    color: #ffffff;
  }
  
  .cookie-text p {
    color: #b3b3b3;
  }
  
  .manage-btn {
    background: #2d2d2d;
    color: #ffffff;
    border-color: #404040;
  }
  
  .manage-btn:hover {
    background: #404040;
    border-color: #505050;
  }
  
  .customize-modal {
    background: #1a1a1a;
  }
  
  .customize-header {
    background: #2d2d2d;
    border-bottom-color: #404040;
  }
  
  .customize-header h2 {
    color: #ffffff;
  }
  
  .close-btn {
    color: #b3b3b3;
  }
  
  .close-btn:hover {
    color: #ffffff;
    background: #404040;
  }
  
  .category-info h3 {
    color: #ffffff;
  }
  
  .category-info p {
    color: #b3b3b3;
  }
  
  .cookie-category {
    border-bottom-color: #404040;
  }
  
  .customize-actions {
    background: #2d2d2d;
    border-top-color: #404040;
  }
}
</style>
