// TypeScript configuration and type definitions
interface FlowerItem {
    id: string;
    name: string;
    category: 'wedding' | 'birthday' | 'romantic' | 'sympathy' | 'corporate' | 'seasonal';
    price: number;
    priceDisplay: string;
    description: string;
    colors: string[];
    occasions: string[];
    flowers: string[];
    tags: string[];
    inStock: boolean;
    rating: number;
    imageIcon: string;
}

interface SearchResult {
    items: FlowerItem[];
    query: string;
    count: number;
    categories: string[];
}

interface CartState {
    count: number;
    items: FlowerItem[];
}

interface SearchElements {
    searchBtn: HTMLButtonElement | null;
    searchModal: HTMLElement | null;
    searchClose: HTMLButtonElement | null;
    searchInput: HTMLInputElement | null;
    searchSubmit: HTMLButtonElement | null;
    searchResults: HTMLElement | null;
    suggestionTags: NodeListOf<Element>;
    categoryItems: NodeListOf<Element>;
}

interface SearchFilters {
    category?: string;
    priceRange?: [number, number];
    colors?: string[];
    inStock?: boolean;
    minRating?: number;
}

class FlowerShopApp {
    private cartState: CartState = {
        count: 0,
        items: []
    };

    private searchElements: SearchElements;
    private searchTimeout: number | null = null;
    private dropdownTimeout: number | null = null;

    // Enhanced flower database
    private readonly flowerData: FlowerItem[] = [
        {
            id: 'red-roses-classic',
            name: 'Classic Red Roses',
            category: 'romantic',
            price: 45,
            priceDisplay: '$45',
            description: 'Dozen premium red roses perfect for expressing love and romance',
            colors: ['red'],
            occasions: ['anniversary', 'valentine', 'romantic', 'apology'],
            flowers: ['roses'],
            tags: ['premium', 'classic', 'dozen', 'long-stem'],
            inStock: true,
            rating: 4.9,
            imageIcon: '🌹'
        },
        {
            id: 'wedding-bouquet-elegant',
            name: 'Elegant Wedding Bouquet',
            category: 'wedding',
            price: 120,
            priceDisplay: '$120',
            description: 'Stunning white and cream bridal bouquet with roses, peonies, and eucalyptus',
            colors: ['white', 'cream', 'green'],
            occasions: ['wedding', 'bridal', 'engagement'],
            flowers: ['roses', 'peonies', 'eucalyptus'],
            tags: ['bridal', 'premium', 'large', 'elegant'],
            inStock: true,
            rating: 5.0,
            imageIcon: '💐'
        },
        {
            id: 'birthday-mixed-bright',
            name: 'Bright Birthday Mix',
            category: 'birthday',
            price: 35,
            priceDisplay: '$35',
            description: 'Colorful mixed bouquet with gerberas, carnations, and seasonal blooms',
            colors: ['yellow', 'orange', 'pink', 'purple'],
            occasions: ['birthday', 'celebration', 'congratulations'],
            flowers: ['gerberas', 'carnations', 'chrysanthemums'],
            tags: ['colorful', 'cheerful', 'mixed', 'affordable'],
            inStock: true,
            rating: 4.7,
            imageIcon: '🎂'
        },
        {
            id: 'peonies-alaskan-premium',
            name: 'Premium Alaskan Peonies',
            category: 'seasonal',
            price: 55,
            priceDisplay: '$55',
            description: 'Limited season premium Alaskan peonies in soft pink and white',
            colors: ['pink', 'white'],
            occasions: ['luxury', 'special', 'seasonal', 'mothers day'],
            flowers: ['peonies'],
            tags: ['seasonal', 'limited', 'premium', 'alaskan', 'rare'],
            inStock: true,
            rating: 4.8,
            imageIcon: '🌸'
        },
        {
            id: 'corporate-arrangement-modern',
            name: 'Modern Corporate Arrangement',
            category: 'corporate',
            price: 80,
            priceDisplay: '$80',
            description: 'Sophisticated arrangement perfect for offices and business events',
            colors: ['white', 'green', 'yellow'],
            occasions: ['corporate', 'office', 'business', 'professional'],
            flowers: ['lilies', 'orchids', 'greenery'],
            tags: ['professional', 'modern', 'sophisticated', 'office'],
            inStock: true,
            rating: 4.6,
            imageIcon: '🏢'
        },
        {
            id: 'sunflowers-cheerful',
            name: 'Cheerful Sunflower Bouquet',
            category: 'seasonal',
            price: 30,
            priceDisplay: '$30',
            description: 'Bright and happy sunflower bouquet perfect for brightening any day',
            colors: ['yellow', 'brown'],
            occasions: ['thank you', 'get well', 'friendship', 'cheerful'],
            flowers: ['sunflowers'],
            tags: ['bright', 'cheerful', 'affordable', 'summer'],
            inStock: true,
            rating: 4.5,
            imageIcon: '🌻'
        },
        {
            id: 'white-lilies-elegant',
            name: 'Elegant White Lilies',
            category: 'sympathy',
            price: 40,
            priceDisplay: '$40',
            description: 'Pure white lilies with green foliage for sympathy and remembrance',
            colors: ['white', 'green'],
            occasions: ['sympathy', 'funeral', 'remembrance', 'condolence'],
            flowers: ['lilies'],
            tags: ['sympathy', 'elegant', 'pure', 'remembrance'],
            inStock: true,
            rating: 4.8,
            imageIcon: '🕊️'
        },
        {
            id: 'mixed-seasonal-deluxe',
            name: 'Deluxe Seasonal Mix',
            category: 'seasonal',
            price: 50,
            priceDisplay: '$50',
            description: 'Beautiful seasonal arrangement with the best flowers of the season',
            colors: ['mixed', 'seasonal'],
            occasions: ['gift', 'seasonal', 'special', 'mixed'],
            flowers: ['seasonal', 'mixed', 'roses', 'lilies'],
            tags: ['seasonal', 'deluxe', 'mixed', 'premium'],
            inStock: true,
            rating: 4.7,
            imageIcon: '🌺'
        }
    ];

    constructor() {
        this.searchElements = this.getSearchElements();
        this.init();
    }

    private getSearchElements(): SearchElements {
        return {
            searchBtn: document.querySelector<HTMLButtonElement>('#searchButton') || document.querySelector<HTMLButtonElement>('.search-btn'),
            searchModal: document.getElementById('searchModal'),
            searchClose: document.getElementById('searchClose') as HTMLButtonElement | null,
            searchInput: document.getElementById('searchInput') as HTMLInputElement | null,
            searchSubmit: document.getElementById('searchSubmit') as HTMLButtonElement | null,
            searchResults: document.getElementById('searchResults'),
            suggestionTags: document.querySelectorAll('.suggestion-tag'),
            categoryItems: document.querySelectorAll('.category-item')
        };
    }

    private init(): void {
        console.log('Initializing FlowerShopApp...');
        this.setupEventListeners();
        this.initializeObservers();
        this.setupCartFunctionality();
        this.setupFormHandling();
        this.setupNavigationEnhancements();
        this.updateCartCount();
        
        // Test search button after a short delay to ensure DOM is ready
        setTimeout(() => {
            const searchBtn = document.querySelector('#searchButton') || document.querySelector('.search-btn');
            console.log('Search button test:', searchBtn);
            if (!searchBtn) {
                console.error('❌ Search button not found in DOM!');
            } else {
                console.log('✅ Search button found successfully');
            }
        }, 100);
        
        console.log('Vaniaflorsit website loaded successfully! 🌸');
    }

    private setupEventListeners(): void {
        this.setupSearchListeners();
        this.setupNavigationListeners();
        this.setupWindowListeners();
    }

    private setupSearchListeners(): void {
        const { searchBtn, searchModal, searchClose, searchInput, searchSubmit, suggestionTags, categoryItems } = this.searchElements;

        // Debug logging
        console.log('Setting up search listeners...');
        console.log('Search button found:', searchBtn);
        console.log('Search modal found:', searchModal);

        // Open search modal
        if (searchBtn) {
            console.log('Adding click listener to search button');
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Search button clicked!');
                this.openSearchModal();
            });
        } else {
            console.error('Search button not found! Check if element exists in DOM.');
        }

        // Close search modal
        if (searchClose) {
            searchClose.addEventListener('click', () => this.closeSearchModal());
        }

        // Close modal when clicking outside
        if (searchModal) {
            searchModal.addEventListener('click', (e: MouseEvent) => {
                if (e.target === searchModal) {
                    this.closeSearchModal();
                }
            });
        }

        // Search input handling
        if (searchInput) {
            searchInput.addEventListener('input', (e: Event) => {
                const target = e.target as HTMLInputElement;
                this.handleSearchInput(target.value);
            });

            searchInput.addEventListener('keypress', (e: KeyboardEvent) => {
                if (e.key === 'Enter') {
                    this.performSearch(searchInput.value);
                }
            });
        }

        // Search submit button
        if (searchSubmit) {
            searchSubmit.addEventListener('click', () => {
                if (searchInput) {
                    this.performSearch(searchInput.value);
                }
            });
        }

        // Suggestion tags
        suggestionTags.forEach((tag: Element) => {
            tag.addEventListener('click', () => {
                const searchTerm = tag.getAttribute('data-search') || tag.textContent || '';
                if (searchInput) {
                    searchInput.value = searchTerm;
                    this.performSearch(searchTerm);
                }
            });
        });

        // Category items
        categoryItems.forEach((item: Element) => {
            item.addEventListener('click', () => {
                const category = item.getAttribute('data-category') || '';
                this.searchByCategory(category);
            });
        });

        // Keyboard events
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape' && searchModal?.classList.contains('active')) {
                this.closeSearchModal();
            }
        });
    }

    private setupNavigationListeners(): void {
        // Smooth scrolling for navigation links
        document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link: HTMLAnchorElement) => {
            link.addEventListener('click', (e: Event) => {
                e.preventDefault();
                const target = link.getAttribute('href');
                if (target && target !== '#') {
                    this.smoothScroll(target);
                }
            });
        });

        // Logo click to scroll to top
        const logo = document.querySelector<HTMLElement>('.logo');
        if (logo) {
            logo.addEventListener('click', () => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }

        this.setupDropdownMenu();
    }

    private setupWindowListeners(): void {
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('scroll', () => this.handleScroll());
        window.addEventListener('load', () => {
            document.body.classList.add('loaded');
        });
    }

    private openSearchModal(): void {
        const { searchModal, searchInput } = this.searchElements;
        
        console.log('Opening search modal...');
        console.log('Modal element:', searchModal);
        
        if (searchModal) {
            searchModal.classList.add('active');
            console.log('Added active class to modal');
        }
        if (searchInput) {
            searchInput.focus();
        }
        document.body.style.overflow = 'hidden';
        
        this.showDefaultContent();
    }

    private closeSearchModal(): void {
        const { searchModal, searchInput, searchResults } = this.searchElements;
        
        if (searchModal) {
            searchModal.classList.remove('active');
        }
        document.body.style.overflow = 'auto';
        
        if (searchInput) {
            searchInput.value = '';
        }
        if (searchResults) {
            searchResults.innerHTML = '';
        }
    }

    private showDefaultContent(): void {
        const { searchResults } = this.searchElements;
        if (searchResults) {
            searchResults.innerHTML = '';
        }
    }

    private handleSearchInput(value: string): void {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        this.searchTimeout = window.setTimeout(() => {
            if (value.trim()) {
                this.performSearch(value);
            } else {
                this.showDefaultContent();
            }
        }, 300);
    }

    private performSearch(query: string, filters: SearchFilters = {}): void {
        const { searchResults } = this.searchElements;
        if (!searchResults) return;

        this.showLoadingState();

        setTimeout(() => {
            const results = this.advancedSearch(query, filters);
            this.displaySearchResults(results);
        }, 300);
    }

    private advancedSearch(query: string, filters: SearchFilters = {}): SearchResult {
        const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
        const scoredResults: Array<{item: FlowerItem, score: number}> = [];

        this.flowerData.forEach(item => {
            let score = 0;

            // Apply filters first
            if (filters.category && item.category !== filters.category) return;
            if (filters.inStock !== undefined && item.inStock !== filters.inStock) return;
            if (filters.minRating && item.rating < filters.minRating) return;
            if (filters.priceRange) {
                const [min, max] = filters.priceRange;
                if (item.price < min || item.price > max) return;
            }

            // Calculate relevance score
            searchTerms.forEach(term => {
                if (item.name.toLowerCase().includes(term)) {
                    score += item.name.toLowerCase() === term ? 100 : 50;
                }
                if (item.category.toLowerCase().includes(term)) {
                    score += 40;
                }
                item.flowers.forEach(flower => {
                    if (flower.toLowerCase().includes(term)) {
                        score += 35;
                    }
                });
                item.occasions.forEach(occasion => {
                    if (occasion.toLowerCase().includes(term)) {
                        score += 30;
                    }
                });
                item.colors.forEach(color => {
                    if (color.toLowerCase().includes(term)) {
                        score += 25;
                    }
                });
                if (item.description.toLowerCase().includes(term)) {
                    score += 15;
                }
            });

            score += item.rating * 2;
            if (item.inStock) score += 5;

            if (score > 0) {
                scoredResults.push({ item, score });
            }
        });

        const sortedResults = scoredResults
            .sort((a, b) => b.score - a.score)
            .map(result => result.item);

        const categories = [...new Set(sortedResults.map(item => item.category))];

        return {
            items: sortedResults,
            query,
            count: sortedResults.length,
            categories
        };
    }

    private searchByCategory(category: string): void {
        const { searchInput } = this.searchElements;
        
        if (searchInput) {
            searchInput.value = category.charAt(0).toUpperCase() + category.slice(1) + ' flowers';
        }
        
        const categoryFilter = category as 'wedding' | 'birthday' | 'romantic' | 'sympathy' | 'corporate' | 'seasonal';
        this.performSearch('', { category: categoryFilter });
    }

    private showLoadingState(): void {
        const { searchResults } = this.searchElements;
        if (!searchResults) return;

        searchResults.innerHTML = `
            <div class="search-loading">
                <div class="loading-spinner"></div>
                <span>Searching our beautiful collection...</span>
            </div>
        `;
    }

    private displaySearchResults(searchResult: SearchResult): void {
        const { searchResults } = this.searchElements;
        if (!searchResults) return;

        const { items, query, count } = searchResult;

        if (count === 0) {
            searchResults.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon">🌸</div>
                    <h3>No flowers found</h3>
                    <p>We couldn't find any flowers matching "${query}"</p>
                    <p><small>Try searching for "roses", "wedding", "birthday", or browse our categories above</small></p>
                </div>
            `;
            return;
        }

        const resultsHeader = query ? 
            `Found ${count} beautiful arrangement${count !== 1 ? 's' : ''} for "${query}"` :
            `${count} arrangement${count !== 1 ? 's' : ''} in this category`;

        const resultsHTML = items.slice(0, 8).map((item: FlowerItem) => `
            <div class="search-result-item" data-flower-id="${item.id}">
                <div class="result-image">${item.imageIcon}</div>
                <div class="result-details">
                    <div class="result-name">${item.name}</div>
                    <div class="result-description">${item.description}</div>
                    <div class="result-meta">
                        <span class="result-price">${item.priceDisplay}</span>
                        <span class="result-category">${item.category}</span>
                        ${!item.inStock ? '<span style="color: #999; font-size: 0.8rem;">Out of Stock</span>' : ''}
                    </div>
                </div>
            </div>
        `).join('');

        searchResults.innerHTML = `
            <div class="results-header">${resultsHeader}</div>
            ${resultsHTML}
        `;

        // Add click listeners to result items
        searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const flowerId = (e.currentTarget as HTMLElement).getAttribute('data-flower-id');
                if (flowerId) {
                    this.selectFlower(flowerId);
                }
            });
        });
    }

    public selectFlower(flowerId: string): void {
        const selectedFlower = this.flowerData.find(flower => flower.id === flowerId);
        if (selectedFlower) {
            const stockStatus = selectedFlower.inStock ? 'In Stock' : 'Out of Stock';
            const message = `${selectedFlower.name}\n${selectedFlower.priceDisplay} - ${stockStatus}\n\n${selectedFlower.description}\n\nThis would normally redirect to the product page.`;
            alert(message);
            
            if (selectedFlower.inStock) {
                const addToCart = confirm('Would you like to add this item to your cart?');
                if (addToCart) {
                    this.addFlowerToCart(selectedFlower);
                }
            }
            
            this.closeSearchModal();
        }
    }

    private setupCartFunctionality(): void {
        const cartIcon = document.querySelector<HTMLElement>('.cart-icon');
        const shopButtons = document.querySelectorAll<HTMLButtonElement>('.btn-primary');
        
        shopButtons.forEach((button: HTMLButtonElement) => {
            if (button.textContent?.includes('SHOP')) {
                button.addEventListener('click', () => this.addToCart(button));
            }
        });

        if (cartIcon) {
            cartIcon.addEventListener('click', () => this.handleCartClick());
        }
    }

    private addToCart(button: HTMLButtonElement): void {
        this.cartState.count++;
        this.updateCartCount();
        
        const originalText = button.textContent || '';
        button.textContent = 'ADDED!';
        button.style.backgroundColor = '#5a8a3a';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.backgroundColor = '#8b7355';
        }, 1000);
    }

    private updateCartCount(): void {
        const cartCountElement = document.querySelector<HTMLElement>('.cart-count');
        if (cartCountElement) {
            cartCountElement.textContent = this.cartState.count.toString();
            cartCountElement.style.display = this.cartState.count > 0 ? 'block' : 'none';
        }
    }

    private handleCartClick(): void {
        const { count } = this.cartState;
        
        if (count === 0) {
            alert('Your cart is empty!\nBrowse our beautiful flowers to add items.');
        } else {
            alert(`You have ${count} item${count !== 1 ? 's' : ''} in your cart.\nThis would normally open the cart page.`);
        }
    }

    private setupFormHandling(): void {
        const contactForm = document.getElementById('contactForm') as HTMLFormElement | null;
        
        if (contactForm) {
            contactForm.addEventListener('submit', (e: Event) => {
                e.preventDefault();
                this.handleFormSubmission(contactForm);
            });
        }
    }

    private async handleFormSubmission(form: HTMLFormElement): Promise<void> {
        const submitButton = form.querySelector<HTMLButtonElement>('.submit-button');
        if (!submitButton) return;

        const originalText = submitButton.textContent || '';
        
        submitButton.innerHTML = '<span class="loading"></span> Sending...';
        submitButton.disabled = true;
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        submitButton.innerHTML = '✓ Message Sent!';
        submitButton.style.backgroundColor = '#5a8a3a';
        
        form.reset();
        
        setTimeout(() => {
            submitButton.textContent = originalText;
            submitButton.style.backgroundColor = '#8b7355';
            submitButton.disabled = false;
        }, 2000);
    }

    private setupNavigationEnhancements(): void {
        const galleryItems = document.querySelectorAll<HTMLElement>('.gallery-item');
        galleryItems.forEach((item: HTMLElement) => {
            item.addEventListener('click', () => {
                const title = item.querySelector('.placeholder-image')?.textContent || 'Unknown';
                alert(`You clicked on: ${title}\nThis would normally open a larger view or gallery page.`);
            });
        });

        const serviceCards = document.querySelectorAll<HTMLElement>('.service-card');
        serviceCards.forEach((card: HTMLElement) => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-10px) scale(1.02)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0) scale(1)';
            });
        });
    }

    private setupDropdownMenu(): void {
        const dropdownContainer = document.querySelector<HTMLElement>('.dropdown-container');
        const dropdownMenu = document.querySelector<HTMLElement>('.dropdown-menu');

        if (dropdownContainer && dropdownMenu) {
            dropdownContainer.addEventListener('mouseenter', () => {
                if (this.dropdownTimeout) {
                    clearTimeout(this.dropdownTimeout);
                }
                dropdownMenu.style.display = 'block';
            });

            dropdownContainer.addEventListener('mouseleave', () => {
                this.dropdownTimeout = window.setTimeout(() => {
                    dropdownMenu.style.display = 'none';
                }, 100);
            });

            const dropdownItems = document.querySelectorAll<HTMLAnchorElement>('.dropdown-item');
            dropdownItems.forEach((item: HTMLAnchorElement) => {
                item.addEventListener('click', (e: Event) => {
                    e.preventDefault();
                    const category = item.textContent || '';
                    alert(`You clicked on: ${category}\nThis would normally show the ${category.toLowerCase()} category page.`);
                });
            });
        }
    }

    private initializeObservers(): void {
        const observerOptions: IntersectionObserverInit = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
            entries.forEach((entry: IntersectionObserverEntry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in-on-scroll');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        const elementsToObserve = document.querySelectorAll<HTMLElement>('.service-card, .gallery-item, .section-title');
        elementsToObserve.forEach((el: HTMLElement) => {
            observer.observe(el);
        });
    }

    private smoothScroll(target: string): void {
        const element = document.querySelector(target) as HTMLElement | null;
        if (element) {
            const offsetTop = element.offsetTop - 100;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    }

    private handleResize(): void {
        const navLeft = document.querySelector<HTMLElement>('.nav-left');
        if (!navLeft) return;

        if (window.innerWidth <= 768) {
            navLeft.style.display = 'none';
        } else {
            navLeft.style.display = 'flex';
        }
    }

    private handleScroll(): void {
        const scrolled = window.pageYOffset;
        const heroImage = document.querySelector<HTMLElement>('.hero-image');
        
        if (heroImage && scrolled < window.innerHeight) {
            const rate = scrolled * -0.5;
            heroImage.style.transform = `translateY(${rate}px)`;
        }
    }

    public getCartState(): CartState {
        return { ...this.cartState };
    }

    public addFlowerToCart(flower: FlowerItem): void {
        this.cartState.items.push(flower);
        this.cartState.count++;
        this.updateCartCount();
        
        const message = `✅ ${flower.name} added to cart!\nTotal items: ${this.cartState.count}`;
        alert(message);
    }

    public searchFlowers(query: string, filters?: SearchFilters): SearchResult {
        return this.advancedSearch(query, filters || {});
    }

    public getFlowerById(id: string): FlowerItem | undefined {
        return this.flowerData.find(flower => flower.id === id);
    }

    public getFlowersByCategory(category: string): FlowerItem[] {
        return this.flowerData.filter(flower => flower.category === category);
    }
}

// Initialize the application when DOM is loaded
let flowerShopApp: FlowerShopApp;

document.addEventListener('DOMContentLoaded', () => {
    flowerShopApp = new FlowerShopApp();
    // Make flowerShopApp available globally for HTML onclick handlers
    (window as any).flowerShopApp = flowerShopApp;
});

// Export for potential module usage
export { FlowerShopApp, FlowerItem, CartState, SearchResult };