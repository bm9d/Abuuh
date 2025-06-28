// Products page functionality
let currentProducts = [];
let filteredProducts = [];
let currentPage = 1;
let productsPerPage = 12;
let currentSort = 'default';
let currentFilters = {
    brands: [],
    scents: [],
    priceMin: 0,
    priceMax: 500,
    search: ''
};

document.addEventListener('DOMContentLoaded', function() {
    initializeProductsPage();
});

function initializeProductsPage() {
    loadProducts();
    initializeFilters();
    initializeToolbar();
    initializePagination();
    
    // Load URL parameters
    loadUrlParameters();
}

async function loadProducts() {
    try {
        showLoading();
        
        // Load products from Google Apps Script
        const products = await fetchProducts();
        currentProducts = products;
        filteredProducts = [...products];
        
        if (products.length > 0) {
            renderProducts();
            populateFilters();
            updateProductsCount();
        } else {
            showNoProducts();
        }
        
    } catch (error) {
        console.error('Error loading products:', error);
        showProductsError();
    } finally {
        hideLoading();
    }
}

async function fetchProducts() {
    try {
        // This would integrate with Google Apps Script to fetch products
        // For now, return empty array to show proper empty state
        return [];
    } catch (error) {
        console.error('Failed to fetch products:', error);
        throw error;
    }
}

function renderProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;

    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const pageProducts = filteredProducts.slice(startIndex, endIndex);

    if (pageProducts.length === 0) {
        showNoProducts();
        return;
    }

    const isListView = productsGrid.classList.contains('products-grid--list');
    
    productsGrid.innerHTML = pageProducts.map(product => `
        <div class="product-card" data-product-id="${product.id}">
            <a href="product-detail.html?id=${product.id}" class="product-card__link">
                <div class="product-card__image">
                    <img src="${product.image_url || ''}" alt="${product.name}" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <svg class="product-image-placeholder" style="display: none;" width="200" height="250" viewBox="0 0 200 250">
                        <rect width="200" height="250" fill="#f5f5f5" stroke="#ddd"/>
                        <text x="100" y="125" text-anchor="middle" fill="#999" font-size="12">Product Image</text>
                    </svg>
                </div>
                <div class="product-card__content">
                    <h3 class="product-card__title">${product.name}</h3>
                    <p class="product-card__brand">${product.brand}</p>
                    <p class="product-card__scent">${product.scent_family}</p>
                    <p class="product-card__price">${formatCurrency(product.price)}</p>
                    ${isListView ? `<p class="product-card__description">${truncate(product.description || '', 100)}</p>` : ''}
                    <button class="btn btn--secondary btn--small add-to-cart-btn" 
                            data-product-id="${product.id}"
                            onclick="event.preventDefault(); event.stopPropagation(); addProductToCart('${product.id}', this);">
                        Add to Cart
                    </button>
                </div>
            </a>
        </div>
    `).join('');

    updatePagination();
}

function addProductToCart(productId, button) {
    const productCard = button.closest('.product-card');
    if (!productCard) return;

    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;

    addToCartWithDetails(productId, product);
}

function showNoProducts() {
    const productsGrid = document.getElementById('productsGrid');
    const noProducts = document.getElementById('noProducts');
    
    if (productsGrid) {
        productsGrid.innerHTML = '';
    }
    
    if (noProducts) {
        noProducts.style.display = 'block';
    }
}

function showProductsError() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;

    productsGrid.innerHTML = `
        <div class="products-error">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Unable to load products</h3>
            <p>Please try again later or refresh the page</p>
            <button onclick="loadProducts()" class="btn btn--primary">Retry</button>
        </div>
    `;
}

function initializeFilters() {
    // Clear filters button
    const clearFilters = document.getElementById('clearFilters');
    if (clearFilters) {
        clearFilters.addEventListener('click', clearAllFilters);
    }

    // Price range sliders
    const priceMin = document.getElementById('priceMin');
    const priceMax = document.getElementById('priceMax');
    const priceMinValue = document.getElementById('priceMinValue');
    const priceMaxValue = document.getElementById('priceMaxValue');

    if (priceMin && priceMax) {
        priceMin.addEventListener('input', function() {
            const min = parseInt(this.value);
            const max = parseInt(priceMax.value);
            
            if (min >= max) {
                this.value = max - 10;
            }
            
            if (priceMinValue) {
                priceMinValue.textContent = this.value;
            }
            
            currentFilters.priceMin = parseInt(this.value);
            applyFilters();
        });

        priceMax.addEventListener('input', function() {
            const min = parseInt(priceMin.value);
            const max = parseInt(this.value);
            
            if (max <= min) {
                this.value = min + 10;
            }
            
            if (priceMaxValue) {
                priceMaxValue.textContent = this.value;
            }
            
            currentFilters.priceMax = parseInt(this.value);
            applyFilters();
        });
    }

    // Filters toggle for mobile
    const filtersToggle = document.getElementById('filtersToggle');
    const filtersPanel = document.getElementById('filtersPanel');
    
    if (filtersToggle && filtersPanel) {
        filtersToggle.addEventListener('click', function() {
            filtersPanel.classList.toggle('active');
        });
    }
}

function populateFilters() {
    populateBrandFilters();
    populateScentFilters();
}

function populateBrandFilters() {
    const brandsContainer = document.getElementById('brandFilters');
    if (!brandsContainer) return;

    const brands = [...new Set(currentProducts.map(p => p.brand))].sort();
    
    brandsContainer.innerHTML = brands.map(brand => `
        <div class="filter-checkbox">
            <input type="checkbox" id="brand-${slugify(brand)}" value="${brand}" 
                   onchange="handleBrandFilter('${brand}', this.checked)">
            <label for="brand-${slugify(brand)}">${brand}</label>
        </div>
    `).join('');
}

function populateScentFilters() {
    const scentsContainer = document.getElementById('scentFilters');
    if (!scentsContainer) return;

    const scents = [...new Set(currentProducts.map(p => p.scent_family))].sort();
    
    scentsContainer.innerHTML = scents.map(scent => `
        <div class="filter-checkbox">
            <input type="checkbox" id="scent-${slugify(scent)}" value="${scent}" 
                   onchange="handleScentFilter('${scent}', this.checked)">
            <label for="scent-${slugify(scent)}">${scent}</label>
        </div>
    `).join('');
}

function handleBrandFilter(brand, checked) {
    if (checked) {
        if (!currentFilters.brands.includes(brand)) {
            currentFilters.brands.push(brand);
        }
    } else {
        currentFilters.brands = currentFilters.brands.filter(b => b !== brand);
    }
    
    applyFilters();
}

function handleScentFilter(scent, checked) {
    if (checked) {
        if (!currentFilters.scents.includes(scent)) {
            currentFilters.scents.push(scent);
        }
    } else {
        currentFilters.scents = currentFilters.scents.filter(s => s !== scent);
    }
    
    applyFilters();
}

function applyFilters() {
    filteredProducts = currentProducts.filter(product => {
        // Brand filter
        if (currentFilters.brands.length > 0 && !currentFilters.brands.includes(product.brand)) {
            return false;
        }
        
        // Scent filter
        if (currentFilters.scents.length > 0 && !currentFilters.scents.includes(product.scent_family)) {
            return false;
        }
        
        // Price filter
        if (product.price < currentFilters.priceMin || product.price > currentFilters.priceMax) {
            return false;
        }
        
        // Search filter
        if (currentFilters.search) {
            const searchTerm = currentFilters.search.toLowerCase();
            const searchableText = `${product.name} ${product.brand} ${product.scent_family} ${product.description || ''}`.toLowerCase();
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }
        
        return true;
    });
    
    // Apply current sort
    applySorting();
    
    // Reset to first page
    currentPage = 1;
    
    // Update display
    renderProducts();
    updateProductsCount();
}

function clearAllFilters() {
    currentFilters = {
        brands: [],
        scents: [],
        priceMin: 0,
        priceMax: 500,
        search: ''
    };
    
    // Reset filter UI
    document.querySelectorAll('#brandFilters input, #scentFilters input').forEach(input => {
        input.checked = false;
    });
    
    const priceMin = document.getElementById('priceMin');
    const priceMax = document.getElementById('priceMax');
    if (priceMin) priceMin.value = 0;
    if (priceMax) priceMax.value = 500;
    
    const priceMinValue = document.getElementById('priceMinValue');
    const priceMaxValue = document.getElementById('priceMaxValue');
    if (priceMinValue) priceMinValue.textContent = '0';
    if (priceMaxValue) priceMaxValue.textContent = '500';
    
    applyFilters();
}

function initializeToolbar() {
    // Sort functionality
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            currentSort = this.value;
            applySorting();
            renderProducts();
        });
    }

    // View toggle
    const viewToggleBtns = document.querySelectorAll('.view-toggle__btn');
    const productsGrid = document.getElementById('productsGrid');
    
    viewToggleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const view = this.dataset.view;
            
            // Update button states
            viewToggleBtns.forEach(b => b.classList.remove('view-toggle__btn--active'));
            this.classList.add('view-toggle__btn--active');
            
            // Update grid class
            if (productsGrid) {
                if (view === 'list') {
                    productsGrid.classList.add('products-grid--list');
                } else {
                    productsGrid.classList.remove('products-grid--list');
                }
                
                renderProducts();
            }
        });
    });
}

function applySorting() {
    switch (currentSort) {
        case 'name-asc':
            filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name-desc':
            filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
            break;
        case 'price-asc':
            filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            filteredProducts.sort((a, b) => b.price - a.price);
            break;
        default:
            // Keep original order
            break;
    }
}

function updateProductsCount() {
    const productsCount = document.getElementById('productsCount');
    if (productsCount) {
        const count = filteredProducts.length;
        productsCount.textContent = `${count} product${count !== 1 ? 's' : ''}`;
    }
    
    const noProducts = document.getElementById('noProducts');
    if (noProducts) {
        noProducts.style.display = filteredProducts.length === 0 ? 'block' : 'none';
    }
}

function initializePagination() {
    // Pagination will be updated in updatePagination()
}

function updatePagination() {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;

    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = '';
    
    // Previous button
    if (currentPage > 1) {
        paginationHTML += `<button class="pagination__btn" onclick="goToPage(${currentPage - 1})">Previous</button>`;
    }
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        paginationHTML += `<button class="pagination__btn" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination__ellipsis">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage ? ' pagination__btn--active' : '';
        paginationHTML += `<button class="pagination__btn${isActive}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="pagination__ellipsis">...</span>`;
        }
        paginationHTML += `<button class="pagination__btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }
    
    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `<button class="pagination__btn" onclick="goToPage(${currentPage + 1})">Next</button>`;
    }
    
    paginationContainer.innerHTML = paginationHTML;
}

function goToPage(page) {
    currentPage = page;
    renderProducts();
    scrollToElement('.products-toolbar', 100);
}

function loadUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Load search parameter
    const search = urlParams.get('search');
    if (search) {
        currentFilters.search = search;
        
        // Update search input if it exists
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = search;
        }
    }
    
    // Load category parameter
    const category = urlParams.get('category');
    if (category) {
        currentFilters.scents = [capitalize(category)];
    }
    
    // Apply filters if any were loaded
    if (search || category) {
        applyFilters();
    }
}

// Global functions for pagination
window.goToPage = goToPage;
window.handleBrandFilter = handleBrandFilter;
window.handleScentFilter = handleScentFilter;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadProducts,
        applyFilters,
        clearAllFilters,
        applySorting,
        goToPage
    };
}
