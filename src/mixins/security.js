export const securityMixin = {
  mounted() {
    this.initAntiInspection()
  },
  beforeUnmount() {
    this.cleanupAntiInspection()
  },
  methods: {
    cleanupAntiInspection() {
      // Remove event listeners
      document.removeEventListener('contextmenu', this.preventContextMenu);
      document.removeEventListener('keydown', this.preventDevTools);
    },
    
    initAntiInspection() {
      // Disable right-click context menu (except for input fields)
      document.addEventListener('contextmenu', this.preventContextMenu);
      
      // Disable F12, Ctrl+Shift+I, Ctrl+U, etc.
      document.addEventListener('keydown', this.preventDevTools);
      
      // Disable text selection
      document.body.style.webkitUserSelect = 'none';
      document.body.style.mozUserSelect = 'none';
      document.body.style.msUserSelect = 'none';
      document.body.style.userSelect = 'none';
      
      // Disable drag
      document.body.style.webkitUserDrag = 'none';
      
      // Clear console
      if (typeof console !== 'undefined') {
        console.clear();
        console.log('%cStop!', 'color: red; font-size: 50px; font-weight: bold;');
        console.log('%cThis is a browser feature intended for developers. Do not enter or paste code here.', 'color: red; font-size: 16px;');
      }
    },
    
    preventContextMenu(e) {
      // Allow right-click on any input or textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return true;
      }
      
      e.preventDefault();
      e.stopPropagation();
      return false;
    },
    
    preventDevTools(e) {
      // Allow Ctrl+V, Ctrl+C, Ctrl+X, Ctrl+A in input and textarea elements
      if ((e.ctrlKey && [86, 67, 88, 65].includes(e.keyCode)) && 
          (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return true;
      }
      
      // F12
      if (e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Ctrl+Shift+I (Dev Tools)
      if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Ctrl+Shift+C (Inspect Element)
      if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.keyCode === 85) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Ctrl+S (Save As)
      if (e.ctrlKey && e.keyCode === 83) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Block these everywhere except input fields
      // Ctrl+A (Select All)
      if (e.ctrlKey && e.keyCode === 65) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Ctrl+C (Copy)
      if (e.ctrlKey && e.keyCode === 67) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Ctrl+X (Cut)
      if (e.ctrlKey && e.keyCode === 88) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Ctrl+V (Paste)
      if (e.ctrlKey && e.keyCode === 86) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }
  }
}
