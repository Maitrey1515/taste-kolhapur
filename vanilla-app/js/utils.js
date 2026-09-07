/**
 * DOM Utility functions for TasteKolhapur Vanilla
 */

// Simple toaster
export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <span>${message}</span>
    </div>
  `;
  
  container.appendChild(toast);
  
  // Animate in
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Remove after 3s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
  document.body.appendChild(container);
  return container;
}

// Global Loading Spinner overlay
export function showGlobalLoading(show = true) {
  let spinner = document.getElementById('global-spinner');
  if (show) {
    if (!spinner) {
      spinner = document.createElement('div');
      spinner.id = 'global-spinner';
      spinner.style.cssText = 'position: fixed; inset: 0; background: rgba(255,255,255,0.8); z-index: 9998; display: flex; align-items: center; justify-content: center;';
      spinner.innerHTML = `<div class="animate-spin" style="width: 40px; height: 40px; border: 4px solid #f3f4f6; border-top-color: #fb923c; border-radius: 50%;"></div>`;
      document.body.appendChild(spinner);
    }
    spinner.style.display = 'flex';
  } else if (spinner) {
    spinner.style.display = 'none';
  }
}

// Convert Tailwind's clsx logic roughly
export function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}
