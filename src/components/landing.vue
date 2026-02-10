<template>
  <div class="error-page">
    <h1>404 - Page Not Found</h1>
    <p>The page you're looking for doesn't exist or has been moved.</p>
  </div>
</template>
<script>
export default {
  mounted() {
    document.title = '404 Not Found';
  }
}
</script>
<style>
.error-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-family: Arial, sans-serif;
  color: #333;
}
</style>
