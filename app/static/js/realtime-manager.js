// Unified Real-Time Manager - Handles all live updates efficiently
class RealTimeManager {
    constructor() {
        this.subscribers = new Map();
        this.pollers = new Map();
        this.dataCache = new Map();
        this.isActive = true;
        this.defaultInterval = 5000; // 5 seconds
        this.maxInterval = 30000; // 30 seconds
        this.init();
    }

    init() {
        // Handle page visibility changes to pause polling when tab is inactive
        document.addEventListener('visibilitychange', () => {
            this.isActive = !document.hidden;
            if (this.isActive) {
                // Resume polling when tab becomes active
                this.resumeAll();
            }
        });

        // Handle beforeunload to clean up
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    /**
     * Subscribe to real-time updates for a specific data type
     * @param {string} dataType - Type of data (orders, counts, etc.)
     * @param {Function} callback - Function to call when data updates
     * @param {Object} options - Configuration options
     */
    subscribe(dataType, callback, options = {}) {
        const config = {
            endpoint: options.endpoint || `/api/${dataType}/live`,
            interval: options.interval || this.defaultInterval,
            params: options.params || {},
            transform: options.transform || (data => data),
            ...options
        };

        if (!this.subscribers.has(dataType)) {
            this.subscribers.set(dataType, []);
            this.startPolling(dataType, config);
        }

        this.subscribers.get(dataType).push({ callback, config });
        
        // Return unsubscribe function
        return () => this.unsubscribe(dataType, callback);
    }

    /**
     * Unsubscribe from updates
     */
    unsubscribe(dataType, callback) {
        const subs = this.subscribers.get(dataType);
        if (subs) {
            const index = subs.findIndex(sub => sub.callback === callback);
            if (index > -1) {
                subs.splice(index, 1);
                if (subs.length === 0) {
                    this.stopPolling(dataType);
                    this.subscribers.delete(dataType);
                }
            }
        }
    }

    /**
     * Start intelligent polling for a data type
     */
    startPolling(dataType, config) {
        const poller = new SmartPoller(config.endpoint, config.params, (data) => {
            this.handleDataUpdate(dataType, data, config);
        });
        
        this.pollers.set(dataType, poller);
        poller.start();
    }

    /**
     * Stop polling for a data type
     */
    stopPolling(dataType) {
        const poller = this.pollers.get(dataType);
        if (poller) {
            poller.stop();
            this.pollers.delete(dataType);
        }
    }

    /**
     * Handle incoming data updates
     */
    handleDataUpdate(dataType, data, config) {
        // Validate data
        if (!data || typeof data !== 'object') {
            console.warn(`Invalid data received for ${dataType}:`, data);
            return;
        }

        // Check if data actually changed using hash comparison
        const cached = this.dataCache.get(dataType);
        if (cached && cached.hash === data.hash) {
            return; // No changes, skip update
        }

        // Cache the new data
        this.dataCache.set(dataType, data);

        // Transform the data if needed
        let transformedData;
        try {
            transformedData = config.transform(data);
        } catch (error) {
            console.error(`Error transforming data for ${dataType}:`, error);
            transformedData = data; // Fallback to raw data
        }

        // Notify all subscribers
        const subscribers = this.subscribers.get(dataType) || [];
        subscribers.forEach(({ callback }) => {
            try {
                callback(transformedData, data);
            } catch (error) {
                console.error(`Error in subscriber callback for ${dataType}:`, error);
            }
        });
    }

    /**
     * Resume all polling when page becomes active
     */
    resumeAll() {
        this.pollers.forEach((poller) => {
            poller.resume();
        });
    }

    /**
     * Cleanup all resources
     */
    cleanup() {
        this.pollers.forEach((poller) => {
            poller.stop();
        });
        this.pollers.clear();
        this.subscribers.clear();
        this.dataCache.clear();
    }

    /**
     * Get cached data for a data type
     */
    getCachedData(dataType) {
        return this.dataCache.get(dataType);
    }

    /**
     * Force refresh of specific data type
     */
    forceRefresh(dataType) {
        const poller = this.pollers.get(dataType);
        if (poller) {
            poller.forceRefresh();
        }
    }
}

/**
 * Smart Poller with exponential backoff and change detection
 */
class SmartPoller {
    constructor(endpoint, params, callback) {
        this.endpoint = endpoint;
        this.params = params;
        this.callback = callback;
        this.isRunning = false;
        this.isPaused = false;
        this.currentInterval = 10000; // Start with 10 seconds
        this.maxInterval = 60000; // Max 60 seconds  
        this.minInterval = 10000; // Min 10 seconds
        this.lastUpdate = Date.now();
        this.lastHash = null;
        this.consecutiveNoChanges = 0;
        this.timeoutId = null;
        this.errorCount = 0;
        this.maxErrors = 5;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.isPaused = false;
        this.poll();
    }

    stop() {
        this.isRunning = false;
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    pause() {
        this.isPaused = true;
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    resume() {
        if (this.isRunning && this.isPaused) {
            this.isPaused = false;
            this.poll();
        }
    }

    forceRefresh() {
        this.lastHash = null;
        this.currentInterval = this.minInterval;
        this.consecutiveNoChanges = 0;
        if (this.isRunning && !this.isPaused) {
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
            }
            this.poll();
        }
    }

    async poll() {
        if (!this.isRunning || this.isPaused) return;

        try {
            const url = new URL(this.endpoint, window.location.origin);
            
            // Add parameters
            Object.keys(this.params).forEach(key => {
                url.searchParams.set(key, this.params[key]);
            });

            // Add timestamp for change detection
            url.searchParams.set('since', this.lastUpdate);

            const headers = {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            };

            // Add ETag for HTTP caching
            if (this.lastHash) {
                headers['If-None-Match'] = this.lastHash;
            }

            const response = await fetch(url.toString(), { headers });

            if (response.status === 304) {
                // Not modified - no changes
                this.handleNoChanges();
            } else if (response.ok) {
                let data;
                try {
                    data = await response.json();
                } catch (jsonError) {
                    console.error('Failed to parse JSON response:', jsonError);
                    throw new Error('Invalid JSON response');
                }
                
                if (data.hash === this.lastHash) {
                    // Same hash - no changes
                    this.handleNoChanges();
                } else {
                    // Data changed
                    this.handleDataChange(data);
                    this.lastHash = data.hash;
                    this.lastUpdate = data.timestamp || Date.now();
                }
                
                this.errorCount = 0; // Reset error count on success
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            this.handleError(error);
        }

        // Schedule next poll
        this.scheduleNext();
    }

    handleDataChange(data) {
        this.consecutiveNoChanges = 0;
        this.currentInterval = this.minInterval; // Reset to fast polling
        this.callback(data);
    }

    handleNoChanges() {
        this.consecutiveNoChanges++;
        
        // Exponential backoff when no changes
        if (this.consecutiveNoChanges > 2) {
            this.currentInterval = Math.min(
                this.currentInterval * 1.2, 
                this.maxInterval
            );
        }
    }

    handleError(error) {
        console.error('Polling error:', error);
        this.errorCount++;
        
        // Exponential backoff on errors
        this.currentInterval = Math.min(
            this.currentInterval * (1.5 + this.errorCount * 0.1),
            this.maxInterval
        );

        // Stop polling if too many consecutive errors
        if (this.errorCount >= this.maxErrors) {
            console.error('Too many consecutive errors, stopping poller');
            this.stop();
        }
    }

    scheduleNext() {
        if (this.isRunning && !this.isPaused) {
            this.timeoutId = setTimeout(() => this.poll(), this.currentInterval);
        }
    }
}

/**
 * Order Display Manager with efficient DOM updates
 */
class OrderDisplayManager {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.orderElements = new Map();
        this.lastHash = '';
        this.animationEnabled = true;
        this.waitTimeThresholds = { yellow: 5, red: 10 }; // Default values
        this.loadWaitTimeThresholds();
    }

    /**
     * Load wait time thresholds from the server
     */
    async loadWaitTimeThresholds() {
        try {
            const response = await fetch('/api/wait-time-thresholds');
            if (response.ok) {
                const data = await response.json();
                this.waitTimeThresholds = data;
            }
        } catch (error) {
            console.warn('Failed to load wait time thresholds, using defaults:', error);
        }
    }

    /**
     * Update the order display with new data
     */
    updateOrders(data) {
        if (!this.container || !data.orders) return;

        // Check if we need to update at all
        const newHash = this.generateOrdersHash(data.orders);
        if (newHash === this.lastHash) {
            // Only update wait times without recreating elements
            this.updateWaitTimes(data.orders);
            return;
        }
        this.lastHash = newHash;

        const changes = this.detectChanges(data.orders);
        
        // Only apply changes if there are actual meaningful changes
        if (changes.added.length > 0 || changes.removed.length > 0 || changes.updated.length > 0) {
            this.applyChanges(changes);
        } else {
            // Just update wait times
            this.updateWaitTimes(data.orders);
        }
        
        // Update any count displays
        if (data.counts) {
            this.updateCounts(data.counts);
        }
    }

    /**
     * Detect what changed since last update
     */
    detectChanges(newOrders) {
        const currentIds = new Set([...this.orderElements.keys()]);
        const newIds = new Set(newOrders.map(o => o.id));

        return {
            added: newOrders.filter(o => !currentIds.has(o.id)),
            updated: newOrders.filter(o => {
                const existing = this.orderElements.get(o.id);
                return existing && this.hasOrderChanged(existing.data, o);
            }),
            removed: [...currentIds].filter(id => !newIds.has(id)),
            unchanged: newOrders.filter(o => {
                const existing = this.orderElements.get(o.id);
                return existing && !this.hasOrderChanged(existing.data, o);
            })
        };
    }

    /**
     * Generate a hash for the orders that excludes frequently changing fields
     */
    generateOrdersHash(orders) {
        const stableOrders = orders.map(order => {
            const stable = { ...order };
            delete stable.wait_time_minutes; // This changes constantly
            return stable;
        });
        return JSON.stringify(stableOrders);
    }

    /**
     * Update only wait times without recreating DOM elements
     */
    updateWaitTimes(orders) {
        orders.forEach(order => {
            const element = this.orderElements.get(order.id);
            if (element && element.element) {
                const waitTimeElement = element.element.querySelector('.wait-time');
                if (waitTimeElement && order.wait_time_minutes > 0) {
                    waitTimeElement.textContent = `Wait: ${order.wait_time_minutes.toFixed(0)}m`;
                }
            }
        });
    }

    /**
     * Check if an order has changed (excluding wait time)
     */
    hasOrderChanged(oldOrder, newOrder) {
        const compareFields = ['status', 'customer_name', 'drink', 'milk', 'syrup', 'foam', 'temperature', 'extra_shot', 'notes', 'price'];
        return compareFields.some(field => oldOrder[field] !== newOrder[field]);
    }

    /**
     * Apply changes to the DOM
     */
    applyChanges(changes) {
        // Remove deleted orders
        changes.removed.forEach(id => this.removeOrder(id));

        // Add new orders
        changes.added.forEach(order => this.addOrder(order));

        // Update changed orders
        changes.updated.forEach(order => this.updateOrder(order));

        // Reorder if necessary
        this.reorderOrders();
    }

    /**
     * Add a new order to the display
     */
    addOrder(order) {
        const element = this.createOrderElement(order);
        this.orderElements.set(order.id, { element, data: order });
        
        if (this.animationEnabled) {
            element.style.opacity = '0';
            element.style.transform = 'translateY(-20px)';
        }
        
        this.container.appendChild(element);
        
        if (this.animationEnabled) {
            // Animate in
            requestAnimationFrame(() => {
                element.style.transition = 'all 0.3s ease-out';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            });
        }
    }

    /**
     * Update an existing order
     */
    updateOrder(order) {
        const existing = this.orderElements.get(order.id);
        if (!existing) return;

        const newElement = this.createOrderElement(order);
        
        if (this.animationEnabled) {
            // Fade out old, fade in new
            existing.element.style.transition = 'opacity 0.15s ease-out';
            existing.element.style.opacity = '0';
            
            setTimeout(() => {
                existing.element.replaceWith(newElement);
                newElement.style.opacity = '0';
                newElement.style.transition = 'opacity 0.15s ease-in';
                requestAnimationFrame(() => {
                    newElement.style.opacity = '1';
                });
            }, 150);
        } else {
            existing.element.replaceWith(newElement);
        }
        
        this.orderElements.set(order.id, { element: newElement, data: order });
    }

    /**
     * Remove an order from the display
     */
    removeOrder(id) {
        const existing = this.orderElements.get(id);
        if (!existing) return;

        if (this.animationEnabled) {
            existing.element.style.transition = 'all 0.3s ease-out';
            existing.element.style.opacity = '0';
            existing.element.style.transform = 'translateX(-100%)';
            
            setTimeout(() => {
                existing.element.remove();
            }, 300);
        } else {
            existing.element.remove();
        }
        
        this.orderElements.delete(id);
    }

    /**
     * Create DOM element for an order
     */
    createOrderElement(order) {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.dataset.orderId = order.id;
        
        // Add status-based styling
        if (order.status === 'pending') {
            li.classList.add('border-warning');
        } else if (order.status === 'in_progress') {
            li.classList.add('border-info');
        }
        
        // Add wait time styling based on configurable thresholds
        if (order.wait_time_minutes >= this.waitTimeThresholds.red) {
            li.classList.add('wait-time-urgent');
        } else if (order.wait_time_minutes >= this.waitTimeThresholds.yellow) {
            li.classList.add('wait-time-warning');
        }

        li.innerHTML = `
            <div>
                <strong>${this.escapeHtml(order.customer_name)}'s ${this.escapeHtml(order.drink)}</strong>
                <span class="text-muted">(${this.escapeHtml(order.milk)}, ${this.escapeHtml(order.syrup || 'No syrup')}, ${this.escapeHtml(order.foam || 'Regular foam')}, ${this.escapeHtml(order.temperature)})</span>
                ${order.extra_shot ? '<br><small class="text-muted">+ Extra Shot</small>' : ''}
                ${order.notes ? `<br><small class="text-muted">Note: ${this.escapeHtml(order.notes)}</small>` : ''}
                <br><small class="fw-bold">Price: $${order.price.toFixed(2)}</small>
                ${order.wait_time_minutes > 0 ? `<br><small class="text-info wait-time">Wait: ${order.wait_time_minutes.toFixed(0)}m</small>` : ''}
            </div>
            <div class="d-flex gap-2">
                <button onclick="printLabel(${order.id})" class="btn btn-warning btn-sm">Print Label</button>
                ${order.status === 'pending' ? 
                    `<button onclick="updateOrderStatus(${order.id}, 'in_progress')" class="btn btn-primary btn-sm">Start</button>` : 
                    `<button onclick="updateOrderStatus(${order.id}, 'completed')" class="btn btn-success btn-sm">Complete</button>`
                }
                <button onclick="deleteOrderConfirm(${order.id})" class="btn btn-danger btn-sm">Delete</button>
            </div>
        `;

        return li;
    }

    /**
     * Reorder orders based on status and time
     */
    reorderOrders() {
        const ordersArray = Array.from(this.orderElements.values());
        ordersArray.sort((a, b) => {
            // Sort by status first (pending, then in_progress)
            const statusOrder = { 'pending': 1, 'in_progress': 2, 'completed': 3 };
            const statusDiff = statusOrder[a.data.status] - statusOrder[b.data.status];
            if (statusDiff !== 0) return statusDiff;
            
            // Then by creation time (oldest first)
            return new Date(a.data.created_at) - new Date(b.data.created_at);
        });

        // Reorder DOM elements
        ordersArray.forEach(({ element }) => {
            this.container.appendChild(element);
        });
    }

    /**
     * Update count displays
     */
    updateCounts(counts) {
        // Update navigation badges
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            if (link.textContent.includes('Current Orders')) {
                let badge = link.querySelector('.badge');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'badge bg-primary ms-1';
                    link.appendChild(badge);
                }
                const activeCount = counts.pending + counts.in_progress;
                badge.textContent = activeCount;
                badge.style.display = activeCount > 0 ? 'inline' : 'none';
            }
        });

        // Dispatch custom event for other components
        document.dispatchEvent(new CustomEvent('countsUpdated', { 
            detail: counts 
        }));
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show empty state when no orders
     */
    showEmptyState() {
        this.container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="bi bi-cup" style="font-size: 2rem;"></i>
                <p class="mt-2">No orders in progress</p>
            </div>
        `;
    }

    /**
     * Clear all orders
     */
    clear() {
        this.orderElements.clear();
        this.container.innerHTML = '';
    }
}

// Global instance
window.realTimeManager = new RealTimeManager();

// Helper functions for global use
window.updateOrderStatus = async function(orderId, newStatus) {
    try {
        const response = await fetch(`/update_status/${orderId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': getCookie('csrf_token')
            },
            body: `status=${newStatus}`
        });

        if (response.ok) {
            // Force refresh of orders data
            realTimeManager.forceRefresh('orders');
        } else {
            alert('Failed to update order status');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        alert('Failed to update order status');
    }
};

window.deleteOrderConfirm = function(orderId) {
    if (!confirm('Are you sure you want to delete this order?')) {
        return;
    }
    
    deleteOrder(orderId);
};

window.deleteOrder = async function(orderId) {
    try {
        const response = await fetch(`/delete_order/${orderId}`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrf_token')
            }
        });

        if (response.ok) {
            // Force refresh of orders data
            realTimeManager.forceRefresh('orders');
        } else {
            alert('Failed to delete order');
        }
    } catch (error) {
        console.error('Error deleting order:', error);
        alert('Failed to delete order');
    }
};

// Utility function to get CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}