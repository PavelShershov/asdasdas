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

// Function to initialize Camera Kit (without starting camera)
async function initCameraKit() {
    try {
        console.log('Initializing Camera Kit...');
        
        // Bootstrap Camera Kit using your API token.
        cameraKit = await bootstrapCameraKit({
            apiToken: 'eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzY3ODk2OTUxLCJzdWIiOiJhMjgzMDFjOS0yZDBiLTRkNzktODcwNC0zMWMxYmQ3M2E1NjJ-U1RBR0lOR34zOGU0NWNlYS01ZmEyLTQ4MTAtYTM1Zi1jNmYxZTY1OTQ1ODAifQ.atiS_KPVKiGxq-pig3yoRkciUmr88LDb4ZINfeEXVz0'
        });
        
        console.log('Camera Kit initialized');

        // Create a new CameraKit session.
        session = await cameraKit.createSession();
        console.log('Session created');

        // Replace the `canvas` element with the live output from the CameraKit session.
        const canvas = document.getElementById('canvas');
        canvas.replaceWith(session.output.live);
        
        // Store reference to the canvas
        window.canvasElement = session.output.live;
        
        // Load the specified lens group.
        console.log('Loading lens group...');
        const { lenses } = await cameraKit.lensRepository.loadLensGroups(['2947393c-a834-4b70-a1b0-9481b5ef5709']);
        console.log(`Loaded ${lenses.length} lenses`);
        
        // Store the first lens
        currentLens = lenses[0];
        
        // Apply the lens to the session
        await session.applyLens(currentLens);
        console.log('Lens applied');
        
        return true;
    } catch (error) {
        console.error('Error initializing Camera Kit:', error);
        showError('Ошибка инициализации AR: ' + error.message);
        return false;
    }
}

// Function to start camera and AR experience
async function startCamera() {
    try {
        console.log('Starting camera...');
        
        // Show loading
        document.getElementById('loading').style.display = 'block';
        
        // Get the user's media stream.
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        console.log('Camera access granted');
        
        // Create a CameraKit media stream source from the user's media stream.
        const source = createMediaStreamSource(
            mediaStream, { cameraType: 'back' }
        );
        
        // Set the source of the CameraKit session.
        await session.setSource(source);
        console.log('Camera source set');
        
        // Set the render size of the CameraKit session to the size of the browser window.
        session.source.setRenderSize(window.innerWidth, window.innerHeight);
        
        // Start the CameraKit session.
        await session.play();
        console.log('Session playing');
        
        // Hide loading, show canvas and instructions
        document.getElementById('loading').style.display = 'none';
        document.getElementById('canvas').style.display = 'block';
        document.getElementById('instructions').style.display = 'block';
        
        // Hide start button
        document.getElementById('startButton').style.display = 'none';
        
        // Add orientation change listener
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
        
        // Add error listener for camera stream
        mediaStream.getVideoTracks()[0].addEventListener('ended', handleCameraDisconnected);
        
        return true;
    } catch (error) {
        console.error('Error starting camera:', error);
        
        // Hide loading
        document.getElementById('loading').style.display = 'none';
        
        // Show start button again
        document.getElementById('startButton').style.display = 'block';
        
        // Handle specific errors
        let errorMessage = 'Ошибка доступа к камере: ';
        
        switch(error.name) {
            case 'NotAllowedError':
                errorMessage = 'Доступ к камере запрещен. Разрешите доступ в настройках браузера.';
                break;
            case 'NotFoundError':
                errorMessage = 'Камера не найдена. Убедитесь, что устройство имеет камеру.';
                break;
            case 'NotReadableError':
                errorMessage = 'Камера занята другим приложением. Закройте другие приложения, использующие камеру.';
                break;
            case 'OverconstrainedError':
                errorMessage = 'Требуемые параметры камеры не поддерживаются.';
                break;
            default:
                errorMessage += error.message;
        }
        
        showError(errorMessage);
        return false;
    }
}

// Function to stop camera and clean up
async function stopCamera() {
    try {
        console.log('Stopping camera...');
        
        // Stop session
        if (session) {
            await session.pause();
        }
        
        // Stop all media tracks
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
        }
        
        // Remove event listeners
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
        
        // Hide canvas and instructions
        document.getElementById('canvas').style.display = 'none';
        document.getElementById('instructions').style.display = 'none';
        
        // Show start button
        document.getElementById('startButton').style.display = 'block';
        
        mediaStream = null;
        console.log('Camera stopped');
    } catch (error) {
        console.error('Error stopping camera:', error);
    }
}

// Handle window resize
function handleResize() {
    if (session && session.source) {
        // Small delay to ensure orientation change is complete
        setTimeout(() => {
            session.source.setRenderSize(window.innerWidth, window.innerHeight);
        }, 100);
    }
}

// Handle camera disconnection
function handleCameraDisconnected() {
    console.log('Camera disconnected');
    showError('Камера была отключена. Нажмите "Запустить AR" для повторного подключения.');
    stopCamera();
}

// Show error message
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 10000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded');
    
    // Check camera support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError('Ваш браузер не поддерживает камеру. Пожалуйста, обновите браузер.');
        document.getElementById('startButton').disabled = true;
        document.getElementById('startButton').textContent = '❌ Не поддерживается';
        return;
    }
    
    // Check for secure context (HTTPS)
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        showError('Для работы AR требуется HTTPS соединение.');
    }
    
    // Initialize Camera Kit
    const initialized = await initCameraKit();
    
    if (!initialized) {
        document.getElementById('startButton').disabled = true;
        document.getElementById('startButton').textContent = '❌ Ошибка инициализации';
        return;
    }
    
    // Set up start button
    const startButton = document.getElementById('startButton');
    startButton.addEventListener('click', startCamera);
    
    // Make functions available globally for HTML onclick handlers
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
            console.log('Permission query not supported:', e);
        }
    }
    
    // Add fade-in animation to elements
    setTimeout(() => {
        startButton.classList.add('fade-in');
    }, 100);
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden && mediaStream) {
        // Page is hidden, pause session to save resources
        if (session) {
            session.pause();
        }
    } else if (!document.hidden && mediaStream) {
        // Page is visible again, resume session
        if (session) {
            session.play();
        }
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
    }
});

// Export functions for potential module use
export { initCameraKit, startCamera, stopCamera };
