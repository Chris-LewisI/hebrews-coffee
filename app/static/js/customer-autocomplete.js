// Customer Autocomplete Functionality
class CustomerAutocomplete {
    constructor() {
        this.customerInput = document.getElementById('customer_name');
        this.suggestionsDiv = document.getElementById('customer-suggestions');
        this.customers = new Set();
        this.init();
    }

    init() {
        if (!this.customerInput || !this.suggestionsDiv) return;
        
        this.loadCustomers();
        this.setupEventListeners();
    }

    async loadCustomers() {
        try {
            const response = await fetch('/api/customers');
            if (response.ok) {
                const data = await response.json();
                this.customers = new Set(data.customers);
            }
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    }

    setupEventListeners() {
        this.customerInput.addEventListener('input', (e) => {
            this.handleInput(e.target.value);
        });

        this.customerInput.addEventListener('focus', (e) => {
            this.handleInput(e.target.value);
        });

        this.customerInput.addEventListener('blur', () => {
            // Delay hiding to allow clicking on suggestions
            setTimeout(() => this.hideSuggestions(), 150);
        });

        // Handle keyboard navigation
        this.customerInput.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });
    }

    handleInput(value) {
        if (value.length < 2) {
            this.hideSuggestions();
            return;
        }

        const matches = Array.from(this.customers)
            .filter(customer => customer.toLowerCase().includes(value.toLowerCase()))
            .slice(0, 5);

        if (matches.length > 0) {
            this.showSuggestions(matches, value);
        } else {
            this.hideSuggestions();
        }
    }

    showSuggestions(matches, inputValue) {
        this.suggestionsDiv.innerHTML = '';
        
        matches.forEach((customer, index) => {
            const item = document.createElement('a');
            item.className = 'dropdown-item';
            item.href = '#';
            item.textContent = customer;
            item.dataset.index = index;
            
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectCustomer(customer);
            });
            
            this.suggestionsDiv.appendChild(item);
        });
        
        this.suggestionsDiv.style.display = 'block';
        this.suggestionsDiv.style.position = 'absolute';
        this.suggestionsDiv.style.top = '100%';
        this.suggestionsDiv.style.left = '0';
        this.suggestionsDiv.style.right = '0';
        this.suggestionsDiv.style.zIndex = '1000';
    }

    hideSuggestions() {
        this.suggestionsDiv.style.display = 'none';
    }

    selectCustomer(customerName) {
        this.customerInput.value = customerName;
        this.hideSuggestions();
        this.loadCustomerHistory(customerName);
    }

    async loadCustomerHistory(customerName) {
        try {
            const response = await fetch(`/api/customer-history/${encodeURIComponent(customerName)}`);
            if (response.ok) {
                const data = await response.json();
                this.showCustomerHistory(data);
            }
        } catch (error) {
            console.error('Error loading customer history:', error);
        }
    }

    showCustomerHistory(data) {
        if (data.orders && data.orders.length > 0) {
            const lastOrder = data.orders[0];
            
            // Pre-fill form with last order preferences
            if (lastOrder.drink) {
                const drinkSelect = document.getElementById('drink');
                if (drinkSelect) {
                    drinkSelect.value = lastOrder.drink;
                }
            }
            
            if (lastOrder.milk) {
                const milkSelect = document.getElementById('milk');
                if (milkSelect) {
                    milkSelect.value = lastOrder.milk;
                }
            }
            
            if (lastOrder.syrup) {
                const syrupSelect = document.getElementById('syrup');
                if (syrupSelect) {
                    syrupSelect.value = lastOrder.syrup;
                }
            }
            
            if (lastOrder.foam) {
                const foamSelect = document.getElementById('foam');
                if (foamSelect) {
                    foamSelect.value = lastOrder.foam;
                }
            }
            
            if (lastOrder.temperature) {
                const tempSelect = document.getElementById('temperature');
                if (tempSelect) {
                    tempSelect.value = lastOrder.temperature;
                }
            }
            
            if (lastOrder.extra_shot) {
                const extraShotCheck = document.getElementById('extra_shot');
                if (extraShotCheck) {
                    extraShotCheck.checked = lastOrder.extra_shot;
                }
            }
            
            // Show notification
            this.showHistoryNotification(data.orders.length);
        }
    }

    showHistoryNotification(orderCount) {
        const notification = document.createElement('div');
        notification.className = 'alert alert-info alert-dismissible fade show';
        
        // Create elements safely without innerHTML
        const small = document.createElement('small');
        const strong = document.createElement('strong');
        strong.textContent = 'Returning customer!';
        
        small.appendChild(strong);
        small.appendChild(document.createTextNode(' Found '));
        small.appendChild(document.createTextNode(orderCount.toString()));
        small.appendChild(document.createTextNode(' previous order'));
        if (orderCount > 1) {
            small.appendChild(document.createTextNode('s'));
        }
        small.appendChild(document.createTextNode('. Form pre-filled with last order preferences.'));
        
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-close';
        closeButton.setAttribute('data-bs-dismiss', 'alert');
        
        notification.appendChild(small);
        notification.appendChild(closeButton);
        
        // Insert after the customer name input
        this.customerInput.parentNode.insertAdjacentElement('afterend', notification);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    handleKeydown(e) {
        const items = this.suggestionsDiv.querySelectorAll('.dropdown-item');
        if (items.length === 0) return;
        
        const activeItem = this.suggestionsDiv.querySelector('.dropdown-item.active');
        let activeIndex = activeItem ? parseInt(activeItem.dataset.index) : -1;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                activeIndex = (activeIndex + 1) % items.length;
                this.setActiveItem(items, activeIndex);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                activeIndex = activeIndex <= 0 ? items.length - 1 : activeIndex - 1;
                this.setActiveItem(items, activeIndex);
                break;
                
            case 'Enter':
                e.preventDefault();
                if (activeItem) {
                    this.selectCustomer(activeItem.textContent);
                }
                break;
                
            case 'Escape':
                this.hideSuggestions();
                break;
        }
    }

    setActiveItem(items, activeIndex) {
        items.forEach((item, index) => {
            if (index === activeIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CustomerAutocomplete();
});
