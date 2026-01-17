/**
 * Install Prompt Handler
 * Handles custom PWA install prompt for mobile devices
 */

const INSTALL_DISMISSED_KEY = 'installPromptDismissed';
const INSTALL_DISMISSED_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

let deferredPrompt = null;

/**
 * Check if the app is running in standalone mode (already installed)
 */
export function isAppInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

/**
 * Check if the device is mobile
 */
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Check if user has dismissed the install prompt recently
 */
export function isInstallDismissed() {
  const dismissedTime = localStorage.getItem(INSTALL_DISMISSED_KEY);
  if (!dismissedTime) return false;
  
  const now = Date.now();
  const dismissedAt = parseInt(dismissedTime, 10);
  
  // Check if 7 days have passed
  if (now - dismissedAt > INSTALL_DISMISSED_DURATION) {
    localStorage.removeItem(INSTALL_DISMISSED_KEY);
    return false;
  }
  
  return true;
}

/**
 * Mark install prompt as dismissed
 */
export function dismissInstallPrompt() {
  localStorage.setItem(INSTALL_DISMISSED_KEY, Date.now().toString());
  hideInstallBanner();
}

/**
 * Check if it's iOS device
 */
export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

/**
 * Show the install banner
 */
export function showInstallBanner() {
  const existingBanner = document.getElementById('install-banner');
  if (existingBanner) return;

  const banner = document.createElement('div');
  banner.id = 'install-banner';
  banner.className = 'install-banner';
  
  if (isIOS()) {
    banner.innerHTML = `
      <div class="install-banner__content">
        <div class="install-banner__icon">
          <img src="images/logo.png" alt="CityCare" />
        </div>
        <div class="install-banner__text">
          <strong>Install CityCare App</strong>
          <p>Ketuk <i class="fas fa-share-square"></i> lalu "Add to Home Screen"</p>
        </div>
        <button id="install-banner-close" class="install-banner__close" aria-label="Tutup">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
  } else {
    banner.innerHTML = `
      <div class="install-banner__content">
        <div class="install-banner__icon">
          <img src="images/logo.png" alt="CityCare" />
        </div>
        <div class="install-banner__text">
          <strong>Install CityCare App</strong>
          <p>Akses lebih cepat & notifikasi langsung</p>
        </div>
        <div class="install-banner__actions">
          <button id="install-banner-install" class="install-banner__btn install-banner__btn--primary">
            Install
          </button>
          <button id="install-banner-close" class="install-banner__close" aria-label="Tutup">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `;
  }

  document.body.appendChild(banner);

  // Add event listeners
  const closeBtn = document.getElementById('install-banner-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', dismissInstallPrompt);
  }

  const installBtn = document.getElementById('install-banner-install');
  if (installBtn) {
    installBtn.addEventListener('click', triggerInstall);
  }

  // Animate in
  requestAnimationFrame(() => {
    banner.classList.add('install-banner--visible');
  });
}

/**
 * Hide the install banner
 */
export function hideInstallBanner() {
  const banner = document.getElementById('install-banner');
  if (banner) {
    banner.classList.remove('install-banner--visible');
    setTimeout(() => {
      banner.remove();
    }, 300);
  }
}

/**
 * Trigger the native install prompt
 */
export async function triggerInstall() {
  if (!deferredPrompt) {
    console.log('[InstallPrompt] No deferred prompt available');
    return;
  }

  // Show the native install prompt
  deferredPrompt.prompt();

  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`[InstallPrompt] User response: ${outcome}`);

  // Clear the deferred prompt
  deferredPrompt = null;

  // Hide the banner
  hideInstallBanner();
}

/**
 * Initialize the install prompt handler
 */
export function initInstallPrompt() {
  // Don't show if already installed
  if (isAppInstalled()) {
    console.log('[InstallPrompt] App already installed');
    return;
  }

  // Don't show on desktop
  if (!isMobileDevice()) {
    console.log('[InstallPrompt] Not a mobile device');
    return;
  }

  // Don't show if recently dismissed
  if (isInstallDismissed()) {
    console.log('[InstallPrompt] Install prompt was recently dismissed');
    return;
  }

  // Listen for the beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    
    // Store the event for later use
    deferredPrompt = e;
    
    console.log('[InstallPrompt] beforeinstallprompt event captured');
    
    // Show our custom install banner
    showInstallBanner();
  });

  // For iOS, show the banner after a short delay
  if (isIOS()) {
    setTimeout(() => {
      if (!isAppInstalled() && !isInstallDismissed()) {
        showInstallBanner();
      }
    }, 3000);
  }

  // Listen for successful installation
  window.addEventListener('appinstalled', () => {
    console.log('[InstallPrompt] App was installed');
    hideInstallBanner();
    deferredPrompt = null;
  });
}
