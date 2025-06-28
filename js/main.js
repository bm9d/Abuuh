// Main application JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Initialize all components
    initializeHeader();
    initializeSearch();
    initializeFeaturedProducts();
    initializeNewsletter();
    initializeMobileMenu();
    updateCartCount();
}

// Header functionality
function initializeHeader() {
    const searchToggle = document.getElementById('searchToggle');
    const searchBar = document.getElementById('searchBar');
    const mobileToggle = document.getElementById('mobileToggle');
    const nav = document.querySelector('.header__nav');

    // Search toggle
    if (searchToggle && searchBar) {
        searchToggle.addEventListener('click', function() {
            searchBar.classList.toggle('active');
            
            if (searchBar.classList.contains('active')) {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    setTimeout(() => searchInput.focus(), 100);
                }
            }
        });

        // Close search when clicking outside
        document.addEventListener('click', function(e) {
            if (!searchBar.contains(e.target) && !searchToggle.contains(e.target)) {
                searchBar.classList.remove('active');
            }
        });
    }

    // Mobile menu toggle
    if (mobileToggle && nav) {
        mobileToggle.addEventListener('click', function() {
            nav.classList.toggle('active');
            
            // Update icon
            const icon = mobileToggle.querySelector('i');
            if (icon) {
                if (nav.classList.contains('active')) {
                    icon.className = 'fas fa-times';
                } else {
                    icon.className = 'fas fa-bars';
                }
            }
        });
    }
}

// Search functionality
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    if (searchInput && searchBtn) {
        // Debounced search
        const debouncedSearch = debounce(performSearch, 300);
        
        searchInput.addEventListener('input', function() {
            if (this.value.length >= 2) {
                debouncedSearch(this.value);
            }
        });

        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch(this.value);
            }
        });

        searchBtn.addEventListener('click', function() {
            performSearch(searchInput.value);
        });
    }
}

async function performSearch(query) {
    if (!query.trim()) return;

    try {
        showLoading();
        
        // In a real implementation, this would call the Google Apps Script
        // For now, redirect to products page with search parameter
        const searchUrl = `products.html?search=${encodeURIComponent(query.trim())}`;
        window.location.href = searchUrl;
        
    } catch (error) {
        console.error('Search error:', error);
        showNotification('Search failed. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Featured products loading
async function initializeFeaturedProducts() {
    const featuredGrid = document.getElementById('featuredProducts');
    if (!featuredGrid) return;

    try {
        showLoading();
        
        // Load featured products from Google Apps Script
        const products = await loadFeaturedProducts();
        
        if (products && products.length > 0) {
            renderFeaturedProducts(products);
        } else {
            showEmptyFeaturedProducts();
        }
        
    } catch (error) {
        console.error('Error loading featured products:', error);
        showFeaturedProductsError();
    } finally {
        hideLoading();
    }
}

async function loadFeaturedProducts() {
    try {
        // This would integrate with Google Apps Script in a real implementation
        // For now, return empty array to show proper empty state
        return [];
    } catch (error) {
        console.error('Failed to load featured products:', error);
        throw error;
    }
}

function renderFeaturedProducts(products) {
    const featuredGrid = document.getElementById('featuredProducts');
    if (!featuredGrid) return;

    featuredGrid.innerHTML = products.map(product => `
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
                    <p class="product-card__price">${formatCurrency(product.price)}</p>
                    <button class="btn btn--secondary btn--small add-to-cart-btn" 
                            data-product-id="${product.id}"
                            onclick="event.preventDefault(); event.stopPropagation(); quickAddToCart(this, '${product.id}');">
                        Add to Cart
                    </button>
                </div>
            </a>
        </div>
    `).join('');
}

function showEmptyFeaturedProducts() {
    const featuredGrid = document.getElementById('featuredProducts');
    if (!featuredGrid) return;

    featuredGrid.innerHTML = `
        <div class="featured-empty">
            <p>No featured products available at this time.</p>
            <a href="products.html" class="btn btn--primary">Browse All Products</a>
        </div>
    `;
}

function showFeaturedProductsError() {
    const featuredGrid = document.getElementById('featuredProducts');
    if (!featuredGrid) return;

    featuredGrid.innerHTML = `
        <div class="featured-error">
            <p>Unable to load featured products. Please try again later.</p>
            <button onclick="initializeFeaturedProducts()" class="btn btn--outline">Retry</button>
        </div>
    `;
}

// Newsletter subscription
function initializeNewsletter() {
    const newsletterForm = document.getElementById('newsletterForm');
    if (!newsletterForm) return;

    newsletterForm.addEventListener('submit', handleNewsletterSubmit);
}

async function handleNewsletterSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const emailInput = form.querySelector('input[type="email"]');
    const email = emailInput.value.trim();

    if (!email) {
        showNotification('Please enter your email address', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    try {
        showLoading();
        
        // Submit to Google Apps Script
        const success = await submitNewsletterSubscription(email);
        
        if (success) {
            showNotification('Thank you for subscribing to our newsletter!', 'success');
            form.reset();
        } else {
            showNotification('Subscription failed. Please try again.', 'error');
        }
        
    } catch (error) {
        console.error('Newsletter subscription error:', error);
        showNotification('Subscription failed. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function submitNewsletterSubscription(email) {
    try {
        // This would integrate with Google Apps Script
        // For demonstration, we'll simulate success
        return new Promise((resolve) => {
            setTimeout(() => resolve(true), 1000);
        });
    } catch (error) {
        console.error('Failed to submit newsletter subscription:', error);
        return false;
    }
}

// Mobile menu functionality
function initializeMobileMenu() {
    const mobileToggle = document.getElementById('mobileToggle');
    const nav = document.querySelector('.header__nav');

    if (!mobileToggle || !nav) return;

    // Close mobile menu when clicking on links
    nav.addEventListener('click', function(e) {
        if (e.target.matches('.nav__link')) {
            nav.classList.remove('active');
            const icon = mobileToggle.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-bars';
            }
        }
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!nav.contains(e.target) && !mobileToggle.contains(e.target)) {
            nav.classList.remove('active');
            const icon = mobileToggle.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-bars';
            }
        }
    });
}

// Smooth scrolling for anchor links
function initializeSmoothScrolling() {
    document.addEventListener('click', function(e) {
        if (e.target.matches('a[href^="#"]')) {
            e.preventDefault();
            
            const targetId = e.target.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                scrollToElement(targetElement, 80);
            }
        }
    });
}

// Lazy loading for images
function initializeLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// Performance monitoring
function initializePerformanceMonitoring() {
    // Log page load time
    window.addEventListener('load', function() {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                console.log('Page Load Time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
            }
        }, 0);
    });
}

// Error handling
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    
    // Don't show notification for minor errors
    if (e.error && e.error.name !== 'ChunkLoadError') {
        showNotification('An error occurred. Please refresh the page.', 'error');
    }
});

// Unhandled promise rejection handling
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    e.preventDefault();
});

// Initialize additional features
document.addEventListener('DOMContentLoaded', function() {
    initializeSmoothScrolling();
    initializeLazyLoading();
    initializePerformanceMonitoring();
});

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeApp,
        performSearch,
        loadFeaturedProducts,
        submitNewsletterSubscription
    };
}
