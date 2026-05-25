// ==================== SMOOTH SCROLLING ==================== 
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ==================== NAVBAR STICKY EFFECT ==================== 
const navbar = document.querySelector('.navbar');
let lastScrollTop = 0;

window.addEventListener('scroll', () => {
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > 100) {
        navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.boxShadow = 'none';
    }
    
    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
});

// ==================== BUTTON INTERACTIONS ==================== 
const buttons = document.querySelectorAll('.btn');

buttons.forEach(button => {
    button.addEventListener('click', function(e) {
        // Add ripple effect
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        // Prevent duplicate effects
        const existingRipple = this.querySelector('.ripple');
        if (existingRipple) {
            existingRipple.remove();
        }
    });
});

// ==================== CART ICON INTERACTION ==================== 
const cartIcon = document.querySelector('.cart-icon');
if (cartIcon) {
    cartIcon.addEventListener('click', () => {
        // Add animation
        cartIcon.style.transform = 'scale(0.9)';
        setTimeout(() => {
            cartIcon.style.transform = 'scale(1)';
        }, 200);
        
        // Show alert or navigate to cart
        console.log('Cart icon clicked');
    });
    
    cartIcon.style.transition = 'transform 0.2s ease-out';
}

// ==================== PRODUCT CARD INTERACTIONS ==================== 
const productCards = document.querySelectorAll('.product-card');

productCards.forEach((card, index) => {
    card.addEventListener('click', () => {
        const productName = card.querySelector('.product-name').textContent;
        console.log('Product clicked:', productName);
        
        // Add animation
        card.style.transform = 'scale(0.98)';
        setTimeout(() => {
            card.style.transform = '';
        }, 100);
    });
});


// ==================== REVEAL ON SCROLL ==================== 
const revealElements = document.querySelectorAll('.section-title, .product-card, .discount-section');

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
});

revealElements.forEach(element => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    element.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(element);
});

// ==================== NAVBAR LINK ACTIVE STATE ==================== 
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-links a');
    
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.style.opacity = '1';
        if (link.getAttribute('href').includes(current) && current) {
            link.style.borderBottom = '2px solid white';
            link.style.paddingBottom = '4px';
        } else {
            link.style.borderBottom = 'none';
            link.style.paddingBottom = '0px';
        }
    });
});

// ==================== PRELOAD IMAGES ==================== 
function preloadImages() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        const tempImg = new Image();
        tempImg.src = img.src;
    });
}

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
    preloadImages();
    
    // Add fade-in animation to page
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease-in';
        document.body.style.opacity = '1';
    }, 100);
});

// ==================== FORM INTERACTION SIMULATION ==================== 
// For touchpoint card text selection
document.addEventListener('mousedown', () => {
    // Add active state styling
});

// ==================== DISCOUNT BUTTON CLICK ==================== 
const discountButtons = document.querySelectorAll('.btn-outline-white, .btn-primary');

discountButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
        if (this.textContent.includes('DISCOUNT')) {
            console.log('Discount button clicked');
            // You can add modal or navigation here
        } else if (this.textContent.includes('CATALOG')) {
            console.log('Catalog button clicked');
            const catalogSection = document.getElementById('catalog');
            if (catalogSection) {
                catalogSection.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });
});

// ==================== DYNAMIC THEME SUPPORT ==================== 
function initializeTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    
    function applyTheme(isDark) {
        if (isDark) {
            document.documentElement.style.setProperty('--text-color', '#e0e0e0');
        } else {
            document.documentElement.style.setProperty('--text-color', '#1a1a1a');
        }
    }
    
    applyTheme(prefersDark.matches);
    prefersDark.addEventListener('change', (e) => applyTheme(e.matches));
}

initializeTheme();

// ==================== CONSOLE EASTER EGG ==================== 
console.log('%cWEARONSTREET', 'font-size: 24px; font-weight: 900; color: #ff0000; font-family: Inter, sans-serif;');
console.log('%cDiscover bold and authentic streetwear', 'font-size: 12px; color: #666; font-family: Inter, sans-serif;');
