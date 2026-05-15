// Force cache registration
window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(() => {
      console.log('Service Worker registered successfully.');
    }).catch((err) => {
      console.error('Service Worker registration failed:', err);
    });
  }
});
