// New efficient real-time order management for the main page
class MainPageOrderManager {
    constructor() {
        this.orderDisplayManager = null;
        this.unsubscribe = null;
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        const pendingOrdersContainer = document.querySelector('.pending-orders');
        if (!pendingOrdersContainer) return;

        // Clear existing content and add loading state
        pendingOrdersContainer.innerHTML = `
            <div class="text-center text-muted py-4" id="loading-state">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                Loading active orders...
            </div>
        `;

        // Check if dependencies are available
        if (!window.realTimeManager || typeof OrderDisplayManager === 'undefined') {
            setTimeout(() => this.setup(), 500);
            return;
        }

        // Create order display manager
        this.orderDisplayManager = new OrderDisplayManager('.pending-orders');

        // Subscribe to real-time order updates
        this.unsubscribe = window.realTimeManager.subscribe('orders', 
            (data) => this.handleOrderUpdate(data),
            {
                endpoint: '/api/orders/pending',
                interval: 10000, // Increase to 10 seconds to reduce flicker
                params: { status: 'active' }
            }
        );
    }

    handleOrderUpdate(data) {
        const loadingState = document.getElementById('loading-state');
        if (loadingState) {
            loadingState.remove();
        }

        if (data.orders && data.orders.length > 0) {
            this.orderDisplayManager.updateOrders(data);
        } else {
            this.orderDisplayManager.showEmptyState();
        }
    }

    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}

// Initialize when script loads
const mainPageOrderManager = new MainPageOrderManager();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    mainPageOrderManager.cleanup();
});

// Backward compatibility - keep refreshOrders function for any existing code
window.refreshOrders = function() {
    if (window.realTimeManager) {
        window.realTimeManager.forceRefresh('orders');
    }
};
