function refreshOrders() {
  fetch('/in_progress')
    .then(response => response.text())
    .then(html => {
      const pendingOrdersContainer = document.querySelector('.pending-orders');
      if (pendingOrdersContainer) {
        // Clear existing content safely
        pendingOrdersContainer.textContent = '';
        
        // Create and add the header safely
        const header = document.createElement('h3');
        header.textContent = 'In Progress Orders';
        pendingOrdersContainer.appendChild(header);
        
        // Create a temporary container to parse the HTML safely
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Move all child nodes from temp container to the target container
        while (tempDiv.firstChild) {
          pendingOrdersContainer.appendChild(tempDiv.firstChild);
        }
      }
    })
    .catch(err => console.error('Error refreshing orders:', err));
}

document.addEventListener('DOMContentLoaded', () => {
  refreshOrders(); // optional: initial load
  setInterval(refreshOrders, 5000); // refresh every 5 seconds
});
