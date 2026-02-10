<template>
  <div v-if="isVisible" class="modal-overlay" @click="closeModal">
    <div class="modal-content report-modal" @click.stop>
      <div class="modal-header">
        <h2>Report Abuse</h2>
        <button class="close-button" @click="closeModal">&times;</button>
      </div>
      <div class="modal-body">
        <p class="description">If you believe this content violates our terms of service or contains inappropriate material, please let us know.</p>
        
        <form @submit.prevent="submitReport">
          <div class="form-group">
            <label for="issue-type">Type of Issue:</label>
            <select id="issue-type" v-model="reportData.issueType" required>
              <option value="">Select an issue type</option>
              <option value="spam">Spam</option>
              <option value="phishing">Phishing/Fraud</option>
              <option value="harassment">Harassment</option>
              <option value="inappropriate">Inappropriate Content</option>
              <option value="copyright">Copyright Violation</option>
              <option value="security">Security Concern</option>
              <option value="malware">Malware/Virus</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="description">Description:</label>
            <textarea 
              id="description" 
              v-model="reportData.description" 
              placeholder="Please describe the issue in detail..."
              rows="4"
              required
              maxlength="1000"
            ></textarea>
            <small>{{ reportData.description.length }}/1000 characters</small>
          </div>
          
          <div class="form-group">
            <label for="reporter-email">Your Email (optional):</label>
            <input 
              type="email" 
              id="reporter-email" 
              v-model="reportData.email" 
              placeholder="your.email@example.com"
            />
            <small>We may contact you for additional information.</small>
          </div>

          <div class="form-group">
            <label for="url-evidence">URL or Evidence (optional):</label>
            <input 
              type="url" 
              id="url-evidence" 
              v-model="reportData.evidence" 
              placeholder="https://example.com/suspicious-page"
            />
          </div>
        </form>
        
        <div v-if="submitStatus === 'success'" class="success-message">
          <strong>Thank you for your report!</strong><br>
          Report ID: <code>{{ reportId }}</code>
        </div>
        
        <div v-if="submitStatus === 'error'" class="error-message">
          <strong>{{ errorMessage }}</strong>
        </div>
      </div>
      <div class="modal-footer">
        <button class="cancel-button" @click="closeModal">Cancel</button>
        <button 
          class="submit-button" 
          @click="submitReport"
          :disabled="isSubmitting || !reportData.issueType || !reportData.description || reportData.description.length < 10"
        >
          {{ isSubmitting ? 'Submitting...' : 'Submit Report' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ReportAbuseModal',
  props: {
    isVisible: { type: Boolean, default: false },
    referenceId: { type: String, default: '' }
  },
  data() {
    return {
      reportData: {
        issueType: '',
        description: '',
        email: '',
        evidence: ''
      },
      isSubmitting: false,
      submitStatus: null,
      reportId: null,
      errorMessage: ''
    }
  },
  methods: {
    closeModal() {
      this.resetForm()
      this.$emit('close')
    },
    
    resetForm() {
      this.reportData = { issueType: '', description: '', email: '', evidence: '' }
      this.submitStatus = null
      this.isSubmitting = false
      this.reportId = null
      this.errorMessage = ''
    },
    
    async submitReport() {
      if (!this.reportData.issueType || !this.reportData.description || this.reportData.description.length < 10) return
      
      this.isSubmitting = true
      this.submitStatus = null
      this.errorMessage = ''
      
      try {
        const response = await fetch('/api/report-abuse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...this.reportData,
            referenceId: this.referenceId
          })
        })
        
        const result = await response.json()
        
        if (response.ok && result.success) {
          this.reportId = result.reportId
          this.submitStatus = 'success'
          setTimeout(() => this.closeModal(), 3000)
        } else {
          throw new Error(result.error || 'Failed to submit report')
        }
        
      } catch (error) {
        this.errorMessage = error.message || 'Failed to submit report. Please try again.'
        this.submitStatus = 'error'
      } finally {
        this.isSubmitting = false
      }
    }
  }
}
</script>

<style scoped>
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

.report-modal {
  max-width: 500px;
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
  user-select: none;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  user-select: none;
}

.close-button:hover {
  color: #333;
}

.modal-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}

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

.description {
  color: #666;
  margin-bottom: 20px;
  line-height: 1.5;
  font-size: 14px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
  font-size: 14px;
  user-select: none;
}

.form-group select,
.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  user-select: text;
  box-sizing: border-box;
}

.form-group select:focus,
.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #2196F3;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-group small {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #999;
}

.success-message {
  background-color: #e8f5e8;
  color: #2e7d32;
  padding: 12px 16px;
  border-radius: 4px;
  margin-top: 16px;
  font-size: 14px;
}

.success-message code {
  background-color: rgba(46, 125, 50, 0.1);
  padding: 2px 4px;
  border-radius: 2px;
  font-family: monospace;
}

.error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 12px 16px;
  border-radius: 4px;
  margin-top: 16px;
  font-size: 14px;
}

.modal-footer {
  padding: 16px 24px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-button,
.submit-button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  user-select: none;
}

.cancel-button {
  background-color: #f5f5f5;
  color: #666;
}

.cancel-button:hover {
  background-color: #e0e0e0;
}

.submit-button {
  background-color: #2196F3;
  color: white;
}

.submit-button:hover:not(:disabled) {
  background-color: #1976D2;
}

.submit-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.form-group input::selection,
.form-group textarea::selection {
  background: #2196f3;
  color: white;
}
</style>
