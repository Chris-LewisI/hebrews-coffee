// Order Management Enhancement Script
class OrderManager {
    constructor() {
        this.lastOrderCount = 0;
        this.soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
        this.init();
    }

    init() {
        this.createSoundToggle();
        this.checkForNewOrders();
        setInterval(() => this.checkForNewOrders(), 5000);
    }

    createSoundToggle() {
        const navbar = document.querySelector('.navbar-nav');
        if (navbar) {
            const soundToggle = document.createElement('li');
            soundToggle.className = 'nav-item';
            soundToggle.innerHTML = `
                <button class="nav-link btn btn-link" onclick="orderManager.toggleSound()" style="border: none; background: none;">
                    <span id="soundIcon">${this.soundEnabled ? '🔊' : '🔇'}</span> Sound
                </button>
            `;
            navbar.appendChild(soundToggle);
        }
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem('soundEnabled', this.soundEnabled);
        document.getElementById('soundIcon').textContent = this.soundEnabled ? '🔊' : '🔇';
    }

    playNotificationSound() {
        if (!this.soundEnabled) return;
        
        // Create a simple beep sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    async checkForNewOrders() {
        try {
            const response = await fetch('/api/order-count');
            if (response.ok) {
                const data = await response.json();
                if (this.lastOrderCount > 0 && data.pending > this.lastOrderCount) {
                    this.playNotificationSound();
                    this.showNotification('New order received!');
                }
                this.lastOrderCount = data.pending;
                this.updateOrderBadges(data);
            }
        } catch (error) {
            console.error('Error checking for new orders:', error);
        }
    }

    showNotification(message) {
        // Create a toast notification
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            z-index: 9999;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    updateOrderBadges(data) {
        // Update navigation badges if they exist
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            if (link.textContent.includes('Current Orders')) {
                const badge = link.querySelector('.badge') || document.createElement('span');
                badge.className = 'badge bg-primary ms-1';
                badge.textContent = data.pending + data.in_progress;
                if (!link.querySelector('.badge')) {
                    link.appendChild(badge);
                }
            }
        });
    }
}

// CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .wait-time-urgent { 
        background-color: #dc3545 !important; 
        color: white !important; 
        font-weight: bold;
        animation: pulse 2s infinite;
    }
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
    }
`;
document.head.appendChild(style);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.orderManager = new OrderManager();
});
