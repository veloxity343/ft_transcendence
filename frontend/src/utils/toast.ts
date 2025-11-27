export type ToastType = 'success' | 'error' | 'info' | 'warning';

export function showToast(message: string, type: ToastType = 'success', duration: number = 3000): void {
  const toast = document.createElement('div');
  
  const bgColors = {
    success: 'bg-game-accent text-game-darker',
    error: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white',
    warning: 'bg-yellow-500 text-game-darker',
  };
  
  toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${bgColors[type]} font-medium animate-slide-in`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease-in-out';
    
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}
