// Auto-print functionality for labels
class AutoPrint {
    
    static printLabel(orderId) {
        console.log('Auto-printing label for order:', orderId);
        
        // Open PDF in new window with auto-print behavior
        const printWindow = window.open(`/create_label/${orderId}`, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
        
        if (printWindow) {
            let loadCheckInterval = null;
            let hasTriggeredPrint = false;
            
            // Function to clean up intervals
            const cleanup = () => {
                if (loadCheckInterval) {
                    clearInterval(loadCheckInterval);
                    loadCheckInterval = null;
                }
            };
            
            // Function to trigger print safely
            const triggerPrint = () => {
                if (hasTriggeredPrint || !printWindow || printWindow.closed) {
                    return;
                }
                
                hasTriggeredPrint = true;
                
                try {
                    printWindow.focus();
                    printWindow.print();
                    console.log('Print triggered successfully');
                } catch (e) {
                    console.error('Print failed:', e);
                }
            };
            
            // Wait for the window to load, then trigger print
            loadCheckInterval = setInterval(() => {
                try {
                    // Check if window is closed first
                    if (printWindow.closed) {
                        cleanup();
                        return;
                    }
                    
                    if (printWindow.document && printWindow.document.readyState === 'complete') {
                        clearInterval(loadCheckInterval);
                        loadCheckInterval = null;
                        
                        // Wait a bit more for PDF to fully render
                        setTimeout(() => {
                            if (!printWindow.closed) {
                                triggerPrint();
                            }
                        }, 1000);
                    }
                } catch (e) {
                    // Window might be cross-origin or closed, fallback to timeout
                    if (loadCheckInterval) {
                        clearInterval(loadCheckInterval);
                        loadCheckInterval = null;
                    }
                    
                    setTimeout(() => {
                        if (!printWindow.closed) {
                            triggerPrint();
                        }
                    }, 2000);
                }
            }, 100);
            
            // Cleanup interval after 15 seconds if still running
            setTimeout(() => {
                cleanup();
            }, 15000);
            
        } else {
            // If popup was blocked, show a message
            alert('Please allow popups for this site to enable auto-printing, or manually open the label link.');
        }
    }
}

// Make it globally available
window.AutoPrint = AutoPrint;

// Convenience function for global use
window.printLabel = function(orderId) {
    AutoPrint.printLabel(orderId);
};
