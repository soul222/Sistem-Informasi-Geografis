/**
 * Install Prompt Handler
 * Handles custom PWA install prompt for all devices
 */

const INSTALL_DISMISSED_KEY = 'installPromptDismissed';
const INSTALL_DISMISSED_DURATION = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

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
  ) || window.innerWidth <= 768;
}

/**
 * Check if user has dismissed the install prompt recently
 */
export function isInstallDismissed() {
  const dismissedTime = localStorage.getItem(INSTALL_DISMISSED_KEY);
  if (!dismissedTime) return false;
  
  const now = Date.now();
  const dismissedAt = parseInt(dismissedTime, 10);
  
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
 * Check if it's Safari browser
 */
export function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/**
 * Show the install banner
 */
export function showInstallBanner() {
  const existingBanner = document.getElementById('install-banner');
  if (existingBanner) return;

  console.log('[InstallPrompt] Showing install banner');

  const banner = document.createElement('div');
  banner.id = 'install-banner';
  banner.className = 'install-banner';
  
  if (isIOS() || (isSafari() && !deferredPrompt)) {
    // iOS/Safari doesn't support beforeinstallprompt
    banner.innerHTML = `
      <div class="install-banner__content">
        <div class="install-banner__icon">
          <img src="images/logo.png" alt="JagaKota" />
        </div>
        <div class="install-banner__text">
          <strong>📱 Install JagaKota</strong>
          <p>Ketuk <i class="fas fa-share-square"></i> lalu "Add to Home Screen"</p>
        </div>
        <button id="install-banner-close" class="install-banner__close" aria-label="Tutup">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
  } else {
    // Android/Chrome with beforeinstallprompt support
    banner.innerHTML = `
      <div class="install-banner__content">
        <div class="install-banner__icon">
          <img src="images/logo.png" alt="JagaKota" />
        </div>
        <div class="install-banner__text">
          <strong>📱 Install JagaKota</strong>
          <p>Akses lebih cepat & notifikasi real-time!</p>
        </div>
        <div class="install-banner__actions">
          <button id="install-banner-install" class="install-banner__btn install-banner__btn--primary">
            <i class="fas fa-download"></i> Install
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

  // Animate in after a small delay
  setTimeout(() => {
    banner.classList.add('install-banner--visible');
  }, 100);
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
    console.log('[InstallPrompt] No deferred prompt available, showing manual instructions');
    alert('Untuk menginstall aplikasi:\n\n1. Buka menu browser (⋮)\n2. Pilih "Install app" atau "Add to Home Screen"');
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
  console.log('[InstallPrompt] Initializing...');

  // Don't show if already installed
  if (isAppInstalled()) {
    console.log('[InstallPrompt] App already installed');
    return;
  }

  // Don't show if recently dismissed
  if (isInstallDismissed()) {
    console.log('[InstallPrompt] Install prompt was recently dismissed');
    return;
  }

  // Listen for the beforeinstallprompt event (Chrome/Android)
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    
    // Store the event for later use
    deferredPrompt = e;
    
    console.log('[InstallPrompt] beforeinstallprompt event captured');
    
    // Show our custom install banner
    showInstallBanner();
  });

  // For iOS/Safari or browsers without beforeinstallprompt, show banner after delay
  // Only show on mobile devices
  if (isMobileDevice()) {
    setTimeout(() => {
      if (!isAppInstalled() && !isInstallDismissed() && !document.getElementById('install-banner')) {
        console.log('[InstallPrompt] Showing fallback banner for mobile');
        showInstallBanner();
      }
    }, 2000); // Show after 2 seconds
  }

  // Listen for successful installation
  window.addEventListener('appinstalled', () => {
    console.log('[InstallPrompt] App was installed');
    hideInstallBanner();
    deferredPrompt = null;
  });
}

