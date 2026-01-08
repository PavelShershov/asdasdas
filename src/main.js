// Import the necessary Camera Kit modules.
import {
    bootstrapCameraKit,
    createMediaStreamSource,
    Transform2D,
} from '@snap/camera-kit';

// Global variables
let cameraKit = null;
let session = null;
let currentLens = null;
let mediaStream = null;
let isARRunning = false;

// Function to initialize Camera Kit (without starting camera)
async function initCameraKit() {
    try {
        console.log('🚀 Initializing Camera Kit...');
        
        // Show initialization loading
        document.getElementById('loading').style.display = 'block';
        document.getElementById('loadingText').textContent = 'Инициализация AR...';
        
        // Bootstrap Camera Kit using your API token.
        cameraKit = await bootstrapCameraKit({
            apiToken: 'eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzY3ODk2OTUxLCJzdWIiOiJhMjgzMDFjOS0yZDBiLTRkNzktODcwNC0zMWMxYmQ3M2E1NjJ-U1RBR0lOR34zOGU0NWNlYS01ZmEyLTQ4MTAtYTM1Zi1jNmYxZTY1OTQ1ODAifQ.atiS_KPVKiGxq-pig3yoRkciUmr88LDb4ZINfeEXVz0'
        });
        
        console.log('✅ Camera Kit initialized');
        document.getElementById('loadingText').textContent = 'Создание сессии...';
        
        // Create a new CameraKit session.
        session = await cameraKit.createSession();
        console.log('✅ Session created');
        
        // Setup canvas for AR
        const canvas = document.getElementById('canvas');
        const liveCanvas = session.output.live;
        
        // Configure the live canvas
        liveCanvas.id = 'ar-canvas';
        liveCanvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
            display: none;
            background: #000;
        `;
        
        // Insert the live canvas before the original canvas
        if (canvas.parentNode) {
            canvas.parentNode.insertBefore(liveCanvas, canvas);
        }
        
        // Hide the original canvas
        canvas.style.display = 'none';
        
        // Store references
        window.arCanvas = liveCanvas;
        window.originalCanvas = canvas;
        
        // Load the specified lens group.
        document.getElementById('loadingText').textContent = 'Загрузка линз...';
        console.log('📦 Loading lens group...');
        
        const { lenses } = await cameraKit.lensRepository.loadLensGroups(['2947393c-a834-4b70-a1b0-9481b5ef5709']);
        console.log(`✅ Loaded ${lenses.length} lens(es)`);
        
        // Store the first lens
        currentLens = lenses[0];
        
        // Apply the lens to the session
        await session.applyLens(currentLens);
        console.log('✅ Lens applied');
        
        // Setup surface tracking events
        setupSurfaceTracking();
        
        // Hide loading
        document.getElementById('loading').style.display = 'none';
        
        console.log('✅ Camera Kit initialization complete');
        return true;
        
    } catch (error) {
        console.error('❌ Error initializing Camera Kit:', error);
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('startButton').style.display = 'block';
        
        showError('Ошибка инициализации AR: ' + error.message);
        return false;
    }
}

// Setup surface tracking events
function setupSurfaceTracking() {
    if (!session) return;
    
    session.on('surfaceFound', () => {
        console.log('✅ Surface found!');
        document.getElementById('surfaceStatus').innerHTML = 
            '<span style="color: #00FF00;">✅ Поверхность найдена! Фигура размещена.</span>';
        document.getElementById('surfaceStatus').classList.add('surface-found');
        
        // Remove animation class after 2 seconds
        setTimeout(() => {
            document.getElementById('surfaceStatus').classList.remove('surface-found');
        }, 2000);
    });
    
    session.on('surfaceLost', () => {
        console.log('⚠️ Surface lost');
        document.getElementById('surfaceStatus').innerHTML = 
            '<span style="color: #FFFC00;">🔍 Ищем поверхность...</span>';
    });
    
    session.on('trackingStatusChanged', (status) => {
        console.log('📊 Tracking status:', status);
    });
}

// Function to start camera and AR experience
async function startCamera() {
    if (isARRunning) return;
    
    try {
        console.log('📷 Starting camera...');
        isARRunning = true;
        
        // Hide start button, show loading
        document.getElementById('startButton').style.display = 'none';
        document.getElementById('loading').style.display = 'block';
        document.getElementById('loadingText').textContent = 'Запрос доступа к камере...';
        document.getElementById('testCameraButton').style.display = 'none';
        document.getElementById('restartButton').style.display = 'none';
        
        // Request camera access
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 },
                frameRate: { ideal: 30 }
            }
        });
        
        console.log('✅ Camera access granted');
        document.getElementById('loadingText').textContent = 'Подключение камеры к AR...';
        
        // Test camera by creating a small preview (hidden)
        const testVideo = document.createElement('video');
        testVideo.srcObject = mediaStream;
        testVideo.autoplay = true;
        testVideo.muted = true;
        testVideo.playsInline = true;
        testVideo.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 80px;
            height: 80px;
            z-index: 9999;
            border-radius: 8px;
            border: 2px solid #00FF00;
            opacity: 0.7;
            display: none; /* Скрыт по умолчанию */
        `;
        document.body.appendChild(testVideo);
        
        // Create a CameraKit media stream source
        const source = createMediaStreamSource(mediaStream, { 
            cameraType: 'back',
            transform: { mirror: false }
        });
        
        // Set the source of the CameraKit session
        await session.setSource(source);
        console.log('✅ Camera source set');
        
        // Set render size
        const renderWidth = Math.max(window.innerWidth, 320);
        const renderHeight = Math.max(window.innerHeight, 240);
        session.source.setRenderSize(renderWidth, renderHeight);
        console.log(`📐 Render size: ${renderWidth}x${renderHeight}`);
        
        // Start the CameraKit session
        await session.play();
        console.log('▶️ Session playing');
        
        // Give time for rendering to start
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Show AR canvas
        if (window.arCanvas) {
            window.arCanvas.style.display = 'block';
            console.log('🎨 AR canvas displayed');
        }
        
        // Remove test video after 3 seconds
        setTimeout(() => {
            if (testVideo.parentNode) {
                testVideo.parentNode.removeChild(testVideo);
            }
        }, 3000);
        
        // Update UI
        document.getElementById('loading').style.display = 'none';
        document.getElementById('instructions').style.display = 'block';
        document.getElementById('restartButton').style.display = 'block';
        
        // Update instructions with camera status
        document.getElementById('surfaceStatus').innerHTML = 
            '<span style="color: #00FF00;">✅ Камера активна</span><br>' +
            '<small style="color: #aaa;">Наведите на поверхность</small>';
        
        // Handle window resize
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
        
        // Handle camera disconnection
        const videoTrack = mediaStream.getVideoTracks()[0];
        videoTrack.addEventListener('ended', handleCameraDisconnected);
        
        console.log('🎉 AR experience started successfully!');
        return true;
        
    } catch (error) {
        console.error('❌ Error starting camera:', error);
        isARRunning = false;
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('startButton').style.display = 'block';
        document.getElementById('testCameraButton').style.display = 'block';
        
        let errorMessage = 'Ошибка доступа к камере: ';
        
        switch(error.name) {
            case 'NotAllowedError':
                errorMessage = 'Доступ к камере запрещен.<br><small>Разрешите доступ в настройках браузера.</small>';
                break;
            case 'NotFoundError':
                errorMessage = 'Камера не найдена.<br><small>Устройство не имеет камеры или она отключена.</small>';
                break;
            case 'NotReadableError':
                errorMessage = 'Камера недоступна.<br><small>Другое приложение использует камеру.</small>';
                break;
            case 'OverconstrainedError':
                errorMessage = 'Неподдерживаемые параметры камеры.<br><small>Попробуйте другой браузер.</small>';
                break;
            default:
                errorMessage = `Ошибка: ${error.message}<br><small>Проверьте консоль для деталей.</small>`;
        }
        
        showError(errorMessage);
        return false;
    }
}

// Function to stop camera and clean up
async function stopCamera() {
    if (!isARRunning) return;
    
    try {
        console.log('🛑 Stopping camera...');
        isARRunning = false;
        
        // Pause session
        if (session) {
            await session.pause();
            console.log('⏸️ Session paused');
        }
        
        // Stop all media tracks
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => {
                track.stop();
                console.log('📴 Track stopped:', track.kind);
            });
            mediaStream = null;
        }
        
        // Hide AR canvas
        if (window.arCanvas) {
            window.arCanvas.style.display = 'none';
        }
        
        // Remove event listeners
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
        
        console.log('✅ Camera stopped and cleaned up');
        
    } catch (error) {
        console.error('❌ Error stopping camera:', error);
    }
}

// Handle window resize
function handleResize() {
    if (session && session.source) {
        // Small delay to ensure orientation change is complete
        setTimeout(() => {
            const width = Math.max(window.innerWidth, 320);
            const height = Math.max(window.innerHeight, 240);
            session.source.setRenderSize(width, height);
            console.log(`🔄 Resized to: ${width}x${height}`);
        }, 250);
    }
}

// Handle camera disconnection
function handleCameraDisconnected() {
    console.log('📴 Camera disconnected');
    showError('Камера была отключена.<br><small>Нажмите "Перезапустить AR".</small>');
    document.getElementById('restartButton').style.display = 'block';
    document.getElementById('instructions').style.display = 'none';
    if (window.arCanvas) {
        window.arCanvas.style.display = 'none';
    }
}

// Show error message
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.innerHTML = message;
    errorElement.style.display = 'block';
    
    // Auto-hide after 8 seconds
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 8000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM loaded');
    
    // Check camera support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        document.getElementById('startButton').disabled = true;
        document.getElementById('startButton').textContent = '❌ Не поддерживается';
        document.getElementById('testCameraButton').style.display = 'block';
        return;
    }
    
    // Initialize Camera Kit
    const initialized = await initCameraKit();
    
    if (!initialized) {
        document.getElementById('startButton').disabled = true;
        document.getElementById('startButton').textContent = '❌ Ошибка инициализации';
        document.getElementById('testCameraButton').style.display = 'block';
        return;
    }
    
    // Set up start button
    const startButton = document.getElementById('startButton');
    startButton.addEventListener('click', startCamera);
    
    // Make functions available globally
    window.startAR = startCamera;
    window.stopAR = stopCamera;
    
    // Check if camera permission was already granted
    if (navigator.permissions && navigator.permissions.query) {
        try {
            const permissionStatus = await navigator.permissions.query({ name: 'camera' });
            
            if (permissionStatus.state === 'granted') {
                startButton.textContent = '🎮 Камера разрешена - Запустить AR';
                startButton.classList.add('pulse');
            }
            
            permissionStatus.onchange = function() {
                if (this.state === 'granted') {
                    startButton.textContent = '🎮 Камера разрешена - Запустить AR';
                    startButton.classList.add('pulse');
                } else {
                    startButton.textContent = '🎮 Запустить AR';
                    startButton.classList.remove('pulse');
                }
            };
        } catch (e) {
            console.log('ℹ️ Permission query not supported:', e);
        }
    }
    
    console.log('✅ Setup complete. Ready for AR!');
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden && mediaStream && isARRunning) {
        console.log('👁️ Page hidden, pausing AR');
        if (session) {
            session.pause();
        }
    } else if (!document.hidden && mediaStream && isARRunning) {
        console.log('👁️ Page visible, resuming AR');
        if (session) {
            session.play();
        }
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        console.log('🧹 Cleaned up on page unload');
    }
});

// Export for module use
export { initCameraKit, startCamera, stopCamera };
