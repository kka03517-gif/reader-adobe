<template>
  <div v-if="isVisible" class="modal-overlay" @click="closeModal">
    <div class="modal-content terms-modal" @click.stop>
      <div class="modal-header">
        <h2>Terms of Use</h2>
        <button class="close-button" @click="closeModal">&times;</button>
      </div>
      <div class="modal-body">
        <div class="terms-content">
          <h3>1. Acceptance of Terms</h3>
          <p>By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement.</p>
          
          <h3>2. Use License</h3>
          <p>Permission is granted to temporarily download one copy of the materials on this website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
          <ul>
            <li>modify or copy the materials;</li>
            <li>use the materials for any commercial purpose or for any public display (commercial or non-commercial);</li>
            <li>attempt to decompile or reverse engineer any software contained on the website;</li>
            <li>remove any copyright or other proprietary notations from the materials.</li>
          </ul>
          
          <h3>3. Disclaimer</h3>
          <p>The materials on this website are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
          
          <h3>4. Limitations</h3>
          <p>In no event shall our company or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on this website, even if we or our authorized representative has been notified orally or in writing of the possibility of such damage.</p>
          
          <h3>5. Privacy Policy</h3>
          <p>Your privacy is important to us. We collect only the necessary information required for verification purposes and do not share your personal information with third parties without your consent.</p>
          
          <h3>6. Prohibited Uses</h3>
          <p>You may not use our service for any unlawful purpose or to violate any regulations, rules, or laws.</p>
          
          <h3>7. Revisions</h3>
          <p>We reserve the right to update these terms at any time without notice.</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="accept-button" @click="closeModal">I Understand</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TermsOfUseModal',
  props: {
    isVisible: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    closeModal() {
      this.$emit('close');
    }
  }
}
</script>

<style scoped>
/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-height: 80vh;
  width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.terms-modal {
  max-width: 700px;
}

.modal-header {
  padding: 20px 24px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
  padding-bottom: 16px;
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  color: #333;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.close-button {
  background: none !important;
  border: none !important;
  font-size: 24px !important;
  cursor: pointer;
  padding: 0 !important;
  width: 30px !important;
  height: 30px !important;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999 !important;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.close-button:hover {
  color: #333 !important;
  background-color: transparent !important;
}

.modal-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}

/* Light Theme Scrollbar */
.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Terms Content Styles */
.terms-content {
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
}

.terms-content h3 {
  color: #333;
  margin: 20px 0 10px 0;
  font-size: 16px;
}

.terms-content h3:first-child {
  margin-top: 0;
}

.terms-content p {
  color: #666;
  line-height: 1.6;
  margin-bottom: 16px;
  font-size: 14px;
}

.terms-content ul {
  color: #666;
  line-height: 1.6;
  margin-bottom: 16px;
  font-size: 14px;
  padding-left: 20px;
}

.terms-content li {
  margin-bottom: 4px;
}

.modal-footer {
  padding: 16px 24px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: center;
  gap: 12px;
}

.accept-button {
  padding: 8px 24px !important;
  border: none !important;
  border-radius: 6px !important;
  cursor: pointer;
  font-size: 14px !important;
  font-weight: 500;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  width: auto !important;
  max-width: 200px !important;
  height: auto !important;
  background-color: #2196F3 !important;
  color: white !important;
}

.accept-button:hover {
  background-color: #1976D2 !important;
}

/* Dark mode styles */
body.dark-mode .modal-content {
  background: #333;
  color: #d9d9d9;
}

body.dark-mode .modal-header {
  border-bottom-color: #555;
}

body.dark-mode .modal-header h2 {
  color: #d9d9d9;
}

body.dark-mode .modal-footer {
  border-top-color: #555;
}

body.dark-mode .terms-content h3 {
  color: #d9d9d9;
}

body.dark-mode .terms-content p,
body.dark-mode .terms-content ul,
body.dark-mode .terms-content li {
  color: #bbb;
}

body.dark-mode .accept-button {
  background-color: #4693ff !important;
  color: white !important;
}

body.dark-mode .accept-button:hover {
  background-color: #2979FF !important;
}

body.dark-mode .close-button {
  color: #bbb !important;
}

body.dark-mode .close-button:hover {
  color: #d9d9d9 !important;
  background-color: transparent !important;
}

/* Dark Theme Scrollbar */
body.dark-mode .modal-body::-webkit-scrollbar {
  width: 8px;
}

body.dark-mode .modal-body::-webkit-scrollbar-track {
  background: #444;
  border-radius: 4px;
}

body.dark-mode .modal-body::-webkit-scrollbar-thumb {
  background: #666;
  border-radius: 4px;
}

body.dark-mode .modal-body::-webkit-scrollbar-thumb:hover {
  background: #777;
}

/* Allow selection in terms content */
.terms-content {
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  user-select: text !important;
}

.terms-content::selection {
  background: #2196f3 !important;
  color: white !important;
}

.terms-content::-moz-selection {
  background: #2196f3 !important;
  color: white !important;
}
</style>
