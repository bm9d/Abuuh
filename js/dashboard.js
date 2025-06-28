// Dashboard functionality
let dashboardData = {
    products: [],
    orders: [],
    customers: [],
    stats: {}
};

let currentSection = 'overview';
let isEditingProduct = false;
let editingProductId = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

function initializeDashboard() {
    initializeNavigation();
    initializeModals();
    loadDashboardData();
    
    // Set initial section from URL hash
    const hash = window.location.hash.substring(1);
    if (hash && ['overview', 'products', 'orders', 'customers'].includes(hash)) {
        switchSection(hash);
    } else {
        switchSection('overview');
    }
}

function initializeNavigation() {
    const navLinks = document.querySelectorAll('.dashboard-nav__link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            switchSection(section);
        });
    });
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshData');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadDashboardData();
        });
    }
}

function switchSection(sectionName) {
    // Update navigation
    document.querySelectorAll('.dashboard-nav__link').forEach(link => {
        link.classList.remove('dashboard-nav__link--active');
    });
    
    const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeLink) {
        activeLink.classList.add('dashboard-nav__link--active');
    }
    
    // Update sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('dashboard-section--active');
    });
    
    const activeSection = document.getElementById(sectionName);
    if (activeSection) {
        activeSection.classList.add('dashboard-section--active');
    }
    
    currentSection = sectionName;
    window.location.hash = sectionName;
    
    // Load section-specific data
    loadSectionData(sectionName);
}

async function loadDashboardData() {
    try {
        showLoading();
        
        // Load data from Google Apps Script
        const data = await fetchDashboardData();
        dashboardData = data;
        
        // Render current section
        loadSectionData(currentSection);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Failed to load dashboard data', 'error');
    } finally {
        hideLoading();
    }
}

async function fetchDashboardData() {
    try {
        // This would integrate with Google Apps Script
        // For now, return empty data structure
        return {
            products: [],
            orders: [],
            customers: [],
            stats: {
                totalRevenue: 0,
                totalOrders: 0,
                totalCustomers: 0,
                avgOrderValue: 0,
                revenueChange: 0,
                ordersChange: 0,
                customersChange: 0,
                avgOrderChange: 0
            }
        };
    } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        throw error;
    }
}

function loadSectionData(section) {
    switch (section) {
        case 'overview':
            renderOverview();
            break;
        case 'products':
            renderProducts();
            break;
        case 'orders':
            renderOrders();
            break;
        case 'customers':
            renderCustomers();
            break;
    }
}

function renderOverview() {
    renderStats();
    renderRecentOrders();
    renderTopProducts();
}

function renderStats() {
    const stats = dashboardData.stats;
    
    updateStatCard('totalRevenue', formatCurrency(stats.totalRevenue), stats.revenueChange);
    updateStatCard('totalOrders', stats.totalOrders, stats.ordersChange);
    updateStatCard('totalCustomers', stats.totalCustomers, stats.customersChange);
    updateStatCard('avgOrderValue', formatCurrency(stats.avgOrderValue), stats.avgOrderChange);
}

function updateStatCard(statName, value, change) {
    const valueElement = document.getElementById(statName);
    const changeElement = document.getElementById(statName.replace('total', '').replace('avg', '') + 'Change');
    
    if (valueElement) {
        valueElement.textContent = value;
    }
    
    if (changeElement && change !== undefined) {
        const changeText = change >= 0 ? `+${change}%` : `${change}%`;
        changeElement.textContent = changeText;
        changeElement.className = `stats-card__change ${change >= 0 ? 'stats-card__change--positive' : 'stats-card__change--negative'}`;
    }
}

function renderRecentOrders() {
    const tbody = document.getElementById('recentOrdersBody');
    if (!tbody) return;
    
    const recentOrders = dashboardData.orders.slice(0, 5);
    
    if (recentOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No recent orders found</td></tr>';
        return;
    }
    
    tbody.innerHTML = recentOrders.map(order => `
        <tr>
            <td>${order.orderId}</td>
            <td>${order.customer?.firstName} ${order.customer?.lastName}</td>
            <td>${formatDate(order.orderDate)}</td>
            <td><span class="status-badge status-badge--${order.status}">${capitalize(order.status)}</span></td>
            <td>${formatCurrency(order.totals?.total || 0)}</td>
        </tr>
    `).join('');
}

function renderTopProducts() {
    const container = document.getElementById('topProducts');
    if (!container) return;
    
    // Calculate top products from orders
    const productSales = {};
    dashboardData.orders.forEach(order => {
        if (order.items) {
            order.items.forEach(item => {
                if (!productSales[item.id]) {
                    productSales[item.id] = {
                        ...item,
                        totalSold: 0,
                        revenue: 0
                    };
                }
                productSales[item.id].totalSold += item.quantity;
                productSales[item.id].revenue += item.price * item.quantity;
            });
        }
    });
    
    const topProducts = Object.values(productSales)
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, 5);
    
    if (topProducts.length === 0) {
        container.innerHTML = '<div class="top-products__empty"><p>No sales data available</p></div>';
        return;
    }
    
    container.innerHTML = topProducts.map(product => `
        <div class="top-product">
            <div class="top-product__image">
                <img src="${product.image_url || ''}" alt="${product.name}" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <svg style="display: none;" width="50" height="60" viewBox="0 0 50 60">
                    <rect width="50" height="60" fill="#f5f5f5" stroke="#ddd"/>
                    <text x="25" y="30" text-anchor="middle" fill="#999" font-size="8">Product</text>
                </svg>
            </div>
            <div class="top-product__details">
                <div class="top-product__name">${product.name}</div>
                <div class="top-product__brand">${product.brand}</div>
            </div>
            <div class="top-product__sales">${product.totalSold} sold</div>
        </div>
    `).join('');
}

function renderProducts() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    
    if (dashboardData.products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No products found</td></tr>';
        return;
    }
    
    tbody.innerHTML = dashboardData.products.map(product => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <img src="${product.image_url || ''}" alt="${product.name}" class="product-image-small"
                         onerror="this.style.display='none';">
                    <div>
                        <div style="font-weight: 600;">${product.name}</div>
                        <div style="color: #666; font-size: 0.9rem;">${product.description ? truncate(product.description, 50) : ''}</div>
                    </div>
                </div>
            </td>
            <td>${product.brand}</td>
            <td>${formatCurrency(product.price)}</td>
            <td>${product.stock}</td>
            <td><span class="status-badge status-badge--${product.stock > 0 ? 'active' : 'inactive'}">${product.stock > 0 ? 'Active' : 'Out of Stock'}</span></td>
            <td>
                <div class="table-actions">
                    <button class="table-action table-action--edit" onclick="editProduct('${product.id}')">Edit</button>
                    <button class="table-action table-action--delete" onclick="deleteProduct('${product.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderOrders() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    
    if (dashboardData.orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No orders found</td></tr>';
        return;
    }
    
    tbody.innerHTML = dashboardData.orders.map(order => `
        <tr>
            <td>${order.orderId}</td>
            <td>${order.customer?.firstName} ${order.customer?.lastName}</td>
            <td>${formatDate(order.orderDate)}</td>
            <td>${order.items?.length || 0}</td>
            <td>${formatCurrency(order.totals?.total || 0)}</td>
            <td><span class="status-badge status-badge--${order.status}">${capitalize(order.status)}</span></td>
            <td>
                <div class="table-actions">
                    <button class="table-action table-action--view" onclick="viewOrder('${order.orderId}')">View</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderCustomers() {
    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;
    
    if (dashboardData.customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No customers found</td></tr>';
        return;
    }
    
    tbody.innerHTML = dashboardData.customers.map(customer => `
        <tr>
            <td>${customer.firstName} ${customer.lastName}</td>
            <td>${customer.email}</td>
            <td>${customer.orderCount || 0}</td>
            <td>${formatCurrency(customer.totalSpent || 0)}</td>
            <td>${customer.lastOrderDate ? formatDate(customer.lastOrderDate) : 'Never'}</td>
        </tr>
    `).join('');
}

function initializeModals() {
    // Product modal
    const addProductBtn = document.getElementById('addProductBtn');
    const productModal = document.getElementById('productModal');
    const productModalClose = document.getElementById('productModalClose');
    const productModalOverlay = document.getElementById('productModalOverlay');
    const productForm = document.getElementById('productForm');
    const productFormCancel = document.getElementById('productFormCancel');
    
    if (addProductBtn) {
        addProductBtn.addEventListener('click', function() {
            openProductModal();
        });
    }
    
    if (productModalClose) {
        productModalClose.addEventListener('click', closeProductModal);
    }
    
    if (productModalOverlay) {
        productModalOverlay.addEventListener('click', closeProductModal);
    }
    
    if (productFormCancel) {
        productFormCancel.addEventListener('click', closeProductModal);
    }
    
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
    }
}

function openProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');
    
    if (!modal || !title || !form) return;
    
    isEditingProduct = !!productId;
    editingProductId = productId;
    
    if (isEditingProduct) {
        title.textContent = 'Edit Product';
        const product = dashboardData.products.find(p => p.id === productId);
        if (product) {
            populateProductForm(product);
        }
    } else {
        title.textContent = 'Add Product';
        form.reset();
    }
    
    modal.classList.add('active');
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    
    if (modal) {
        modal.classList.remove('active');
    }
    
    if (form) {
        form.reset();
    }
    
    isEditingProduct = false;
    editingProductId = null;
}

function populateProductForm(product) {
    document.getElementById('productName').value = product.name || '';
    document.getElementById('productBrand').value = product.brand || '';
    document.getElementById('productPrice').value = product.price || '';
    document.getElementById('productStock').value = product.stock || '';
    document.getElementById('productScent').value = product.scent_family || '';
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productImage').value = product.image_url || '';
}

async function handleProductSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const productData = {
        id: editingProductId || generateId(),
        name: formData.get('name'),
        brand: formData.get('brand'),
        price: parseFloat(formData.get('price')),
        stock: parseInt(formData.get('stock')),
        scent_family: formData.get('scent_family'),
        description: formData.get('description'),
        image_url: formData.get('image_url')
    };
    
    try {
        showLoading();
        
        const success = await saveProduct(productData, isEditingProduct);
        
        if (success) {
            showNotification(`Product ${isEditingProduct ? 'updated' : 'added'} successfully!`, 'success');
            closeProductModal();
            loadDashboardData();
        } else {
            showNotification('Failed to save product. Please try again.', 'error');
        }
        
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('An error occurred while saving the product.', 'error');
    } finally {
        hideLoading();
    }
}

async function saveProduct(productData, isEdit) {
    try {
        // This would integrate with Google Apps Script
        // For demonstration, simulate successful save
        return new Promise((resolve) => {
            setTimeout(() => resolve(true), 1000);
        });
    } catch (error) {
        console.error('Failed to save product:', error);
        return false;
    }
}

async function editProduct(productId) {
    openProductModal(productId);
}

async function deleteProduct(productId) {
    const product = dashboardData.products.find(p => p.id === productId);
    if (!product) return;
    
    const confirmed = confirm(`Are you sure you want to delete "${product.name}"?`);
    if (!confirmed) return;
    
    try {
        showLoading();
        
        const success = await removeProduct(productId);
        
        if (success) {
            showNotification('Product deleted successfully!', 'success');
            loadDashboardData();
        } else {
            showNotification('Failed to delete product. Please try again.', 'error');
        }
        
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('An error occurred while deleting the product.', 'error');
    } finally {
        hideLoading();
    }
}

async function removeProduct(productId) {
    try {
        // This would integrate with Google Apps Script
        // For demonstration, simulate successful deletion
        return new Promise((resolve) => {
            setTimeout(() => resolve(true), 1000);
        });
    } catch (error) {
        console.error('Failed to delete product:', error);
        return false;
    }
}

function viewOrder(orderId) {
    const order = dashboardData.orders.find(o => o.orderId === orderId);
    if (!order) return;
    
    // Create a simple order view modal or navigate to order details page
    alert(`Order Details:\n\nOrder ID: ${order.orderId}\nCustomer: ${order.customer?.firstName} ${order.customer?.lastName}\nTotal: ${formatCurrency(order.totals?.total || 0)}\nStatus: ${order.status}`);
}

// Search functionality
function initializeSearch() {
    const productSearch = document.getElementById('productSearch');
    if (productSearch) {
        productSearch.addEventListener('input', debounce(function() {
            filterProducts(this.value);
        }, 300));
    }
}

function filterProducts(searchTerm) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    
    const filteredProducts = dashboardData.products.filter(product => {
        const searchableText = `${product.name} ${product.brand} ${product.description || ''}`.toLowerCase();
        return searchableText.includes(searchTerm.toLowerCase());
    });
    
    // Re-render table with filtered products
    const originalProducts = dashboardData.products;
    dashboardData.products = filteredProducts;
    renderProducts();
    dashboardData.products = originalProducts;
}

// Initialize search when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeSearch();
});

// Global functions for table actions
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.viewOrder = viewOrder;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeDashboard,
        switchSection,
        loadDashboardData,
        saveProduct,
        removeProduct
    };
}
