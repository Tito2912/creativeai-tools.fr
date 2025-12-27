// ==========================================================================
// Configuration globale et variables
// ==========================================================================

const CONFIG = {
    GA_ID: 'G-6PZMXTM97R',
    AFFILIATE_URL: 'https://invideo.sjv.io/3JrYry',
    NEWSLETTER_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
    RECAPTCHA_SITE_KEY: 'YOUR_RECAPTCHA_V3_SITE_KEY',
    COOKIE_CONSENT_DURATION: 395, // 13 mois en jours
    UTM_STORAGE_DURATION: 90, // 90 jours
    ANIMATION_THRESHOLD: 0.1,
    ANIMATION_ROOT_MARGIN: '0px 0px -50px 0px'
};

// État de l'application
const STATE = {
    consentGiven: false,
    gaLoaded: false,
    recaptchaLoaded: false,
    currentLang: document.documentElement.lang || 'en'
};

// ==========================================================================
// Gestionnaire d'événements DOM ready
// ==========================================================================

document.addEventListener('DOMContentLoaded', function() {
    initApplication();
});

/**
 * Initialise toutes les fonctionnalités de l'application
 */
function initApplication() {
    initNavigation();
    initCookieConsent();
    initYouTubeLite();
    initFAQAccordions();
    initNewsletterForm();
    initScrollAnimations();
    initUTMPersistence();
    initLanguageDetection();
    initPerformanceMonitoring();
}

// ==========================================================================
// Navigation et menu mobile
// ==========================================================================

/**
 * Initialise la navigation mobile et le menu burger
 */
function initNavigation() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('#main-menu');
    
    if (!menuToggle || !navMenu) return;
    
    menuToggle.addEventListener('click', function() {
        const isExpanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', !isExpanded);
        navMenu.setAttribute('aria-expanded', !isExpanded);
        
        // Animation du menu
        if (!isExpanded) {
            navMenu.style.display = 'flex';
            setTimeout(() => navMenu.classList.add('active'), 10);
        } else {
            navMenu.classList.remove('active');
            setTimeout(() => navMenu.style.display = 'none', 300);
        }
    });
    
    // Fermer le menu en cliquant sur un lien
    navMenu.addEventListener('click', function(e) {
        if (e.target.tagName === 'A') {
            menuToggle.setAttribute('aria-expanded', 'false');
            navMenu.setAttribute('aria-expanded', 'false');
            navMenu.classList.remove('active');
            setTimeout(() => navMenu.style.display = 'none', 300);
        }
    });
    
    // Fermer le menu en appuyant sur Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
            menuToggle.click();
        }
    });
}

// ==========================================================================
// Gestion des cookies et consentement RGPD
// ==========================================================================

/**
 * Initialise le système de consentement cookies
 */
function initCookieConsent() {
    const banner = document.getElementById('cookie-banner');
    const acceptBtn = document.getElementById('cookie-accept');
    const settingsBtn = document.getElementById('cookie-settings');
    
    if (!banner) return;
    
    // Vérifier si le consentement a déjà été donné
    const consent = getStoredConsent();
    if (consent) {
        STATE.consentGiven = true;
        handleConsentGiven();
        return;
    }
    
    // Afficher la bannière après un délai
    setTimeout(() => {
        banner.hidden = false;
        setTimeout(() => banner.classList.add('show'), 100);
    }, 1000);
    
    // Gestionnaire bouton accepter
    acceptBtn?.addEventListener('click', function() {
        const consentData = {
            analytics: true,
            necessary: true,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
        
        storeConsent(consentData);
        STATE.consentGiven = true;
        hideBanner();
        handleConsentGiven();
    });
    
    // Gestionnaire bouton paramètres
    settingsBtn?.addEventListener('click', function() {
        // Implémenter un modal de paramètres avancés
        showCookieSettings();
    });
}

/**
 * Stocke le consentement dans le localStorage
 */
function storeConsent(consentData) {
    try {
        localStorage.setItem('cookieConsent', JSON.stringify(consentData));
        localStorage.setItem('cookieConsentTimestamp', Date.now().toString());
    } catch (e) {
        console.warn('Impossible de stocker le consentement:', e);
    }
}

/**
 * Récupère le consentement stocké
 */
function getStoredConsent() {
    try {
        const stored = localStorage.getItem('cookieConsent');
        const timestamp = localStorage.getItem('cookieConsentTimestamp');
        
        if (!stored || !timestamp) return null;
        
        // Vérifier si le consentement est encore valide (13 mois)
        const age = Date.now() - parseInt(timestamp);
        const maxAge = CONFIG.COOKIE_CONSENT_DURATION * 24 * 60 * 60 * 1000;
        
        if (age > maxAge) {
            localStorage.removeItem('cookieConsent');
            localStorage.removeItem('cookieConsentTimestamp');
            return null;
        }
        
        return JSON.parse(stored);
    } catch (e) {
        console.warn('Erreur lecture consentement:', e);
        return null;
    }
}

/**
 * Cache la bannière de consentement
 */
function hideBanner() {
    const banner = document.getElementById('cookie-banner');
    if (banner) {
        banner.classList.remove('show');
        setTimeout(() => banner.hidden = true, 300);
    }
}

/**
 * Actions à effectuer après consentement
 */
function handleConsentGiven() {
    loadGoogleAnalytics();
    updateGTagConsent();
}

/**
 * Charge Google Analytics conditionnellement
 */
function loadGoogleAnalytics() {
    if (STATE.gaLoaded || !STATE.consentGiven) return;
    
    // Script gtag.js
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.GA_ID}`;
    script.async = true;
    document.head.appendChild(script);
    
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', CONFIG.GA_ID);
    
    STATE.gaLoaded = true;
}

/**
 * Met à jour le consentement pour gtag
 */
function updateGTagConsent() {
    if (window.gtag && STATE.consentGiven) {
        gtag('consent', 'update', {
            'analytics_storage': 'granted'
        });
    }
}

/**
 * Affiche le modal des paramètres cookies (version simplifiée)
 */
function showCookieSettings() {
    // Implémentation basique - à étendre selon les besoins
    const settings = confirm(
        'Paramètres cookies :\n\n' +
        '✓ Cookies nécessaires : Toujours activés\n' +
        '✓ Analytics : Activés\n\n' +
        'Cliquez sur OK pour accepter, ou Annuler pour personnaliser.'
    );
    
    if (settings) {
        document.getElementById('cookie-accept').click();
    }
}

// ==========================================================================
// YouTube Lite - Chargement différé des iframes
// ==========================================================================

/**
 * Initialise les lecteurs YouTube Lite
 */
function initYouTubeLite() {
    const youtubePlayers = document.querySelectorAll('.youtube-lite');
    
    youtubePlayers.forEach(player => {
        const videoId = player.dataset.videoId;
        const title = player.dataset.title || 'Video YouTube';
        
        if (!videoId) return;
        
        // Créer le bouton play et la miniature
        const thumbnail = player.querySelector('.youtube-thumbnail');
        const playBtn = player.querySelector('.youtube-play');
        
        if (playBtn) {
            playBtn.addEventListener('click', function(e) {
                e.preventDefault();
                loadYouTubeIframe(player, videoId, title);
                trackVideoEvent('video_start', videoId);
            });
        }
        
        // Permettre aussi le clic sur la miniature
        thumbnail?.addEventListener('click', function(e) {
            if (e.target === this || e.target.tagName === 'IMG') {
                loadYouTubeIframe(player, videoId, title);
                trackVideoEvent('video_start', videoId);
            }
        });
        
        // Navigation clavier
        player.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                loadYouTubeIframe(player, videoId, title);
                trackVideoEvent('video_start', videoId);
            }
        });
    });
}

/**
 * Charge l'iframe YouTube en remplacement du placeholder
 */
function loadYouTubeIframe(container, videoId, title) {
    const iframe = document.createElement('iframe');
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
    iframe.title = title;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    
    // Remplacer le contenu
    container.innerHTML = '';
    container.appendChild(iframe);
    container.classList.add('youtube-loaded');
    
    // Suivi de la lecture
    setupYouTubeTracking(iframe, videoId);
}

/**
 * Configure le suivi de la lecture YouTube
 */
function setupYouTubeTracking(iframe, videoId) {
    // Cette fonction nécessiterait l'API YouTube IFrame
    // Implémentation basique avec des événements temporels
    let progressTracked = false;
    
    const trackProgress = setInterval(() => {
        // Implémenter le suivi de progression avec l'API YouTube
        // Pour l'instant, on simule un événement de complétion après 30s
        if (!progressTracked) {
            setTimeout(() => {
                trackVideoEvent('video_progress', videoId, 50);
                progressTracked = true;
            }, 15000);
            
            setTimeout(() => {
                trackVideoEvent('video_complete', videoId);
                clearInterval(trackProgress);
            }, 30000);
        }
    }, 5000);
}

// ==========================================================================
// Système FAQ - Accordéons accessibles
// ==========================================================================

/**
 * Initialise les accordéons de la FAQ
 */
function initFAQAccordions() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const summary = item.querySelector('summary');
        const content = item.querySelector('.faq-content');
        
        if (!summary || !content) return;
        
        // Accessibilité ARIA
        summary.setAttribute('role', 'button');
        summary.setAttribute('aria-expanded', 'false');
        summary.setAttribute('aria-controls', content.id || generateId('faq-content'));
        
        if (!content.id) {
            content.id = summary.getAttribute('aria-controls');
        }
        
        // Gestionnaire de clic
        summary.addEventListener('click', function(e) {
            e.preventDefault();
            toggleFAQItem(item);
        });
        
        // Navigation clavier
        summary.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleFAQItem(item);
            }
        });
    });
}

/**
 * Ouvre/ferme un élément FAQ
 */
function toggleFAQItem(item) {
    const isOpen = item.hasAttribute('open');
    const summary = item.querySelector('summary');
    const content = item.querySelector('.faq-content');
    
    if (isOpen) {
        item.removeAttribute('open');
        summary.setAttribute('aria-expanded', 'false');
    } else {
        item.setAttribute('open', 'true');
        summary.setAttribute('aria-expanded', 'true');
        
        // Suivi analytics
        trackFAQEvent(content.textContent.trim());
    }
}

// ==========================================================================
// Formulaire newsletter avec anti-spam
// ==========================================================================

/**
 * Initialise le formulaire newsletter
 */
function initNewsletterForm() {
    const form = document.getElementById('newsletter-signup');
    if (!form) return;
    
    const emailInput = form.querySelector('#email');
    const submitBtn = form.querySelector('#newsletter-submit');
    const honeypot = form.querySelector('.hp-input');
    
    // Validation en temps réel
    emailInput?.addEventListener('input', function() {
        validateEmailField(this);
    });
    
    // Soumission du formulaire
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleNewsletterSubmit(form);
    });
    
    // Anti-bot : désactiver le bouton brièvement
    let lastSubmitTime = 0;
    form.addEventListener('submit', function(e) {
        const now = Date.now();
        if (now - lastSubmitTime < 700) {
            e.preventDefault();
            showFormError(form, 'Veuillez patienter entre deux envois');
            return;
        }
        lastSubmitTime = now;
    });
}

/**
 * Gère la soumission du formulaire newsletter
 */
async function handleNewsletterSubmit(form) {
    const formData = new FormData(form);
    const email = formData.get('email');
    const honeypot = formData.get('website');
    
    // Validation honeypot
    if (honeypot && honeypot.length > 0) {
        console.log('Spam détecté via honeypot');
        showFormSuccess(form); // Leurre pour les bots
        return;
    }
    
    // Validation email
    if (!isValidEmail(email)) {
        showFormError(form, 'Adresse email invalide');
        return;
    }
    
    // Désactiver le formulaire
    setFormLoading(form, true);
    
    try {
        // Préparation des données
        const submissionData = {
            email: email,
            timestamp: new Date().toISOString(),
            page: window.location.pathname,
            lang: STATE.currentLang,
            utm_source: getUTMParameter('utm_source'),
            consent: STATE.consentGiven
        };
        
        // Envoi vers Google Sheets via Apps Script
        const response = await submitToGoogleSheets(submissionData);
        
        if (response.success) {
            showFormSuccess(form);
            trackNewsletterSignup(email);
            form.reset();
        } else {
            throw new Error(response.error || 'Erreur de soumission');
        }
        
    } catch (error) {
        console.error('Erreur newsletter:', error);
        showFormError(form, 'Erreur lors de l\'inscription. Veuillez réessayer.');
    } finally {
        setFormLoading(form, false);
    }
}

/**
 * Soumet les données vers Google Sheets via Apps Script
 */
async function submitToGoogleSheets(data) {
    // URL de déploiement de l'Apps Script
    const scriptUrl = CONFIG.NEWSLETTER_SCRIPT_URL;
    
    const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
}

/**
 * Affiche un message de succès
 */
function showFormSuccess(form) {
    const existingMsg = form.querySelector('.form-message');
    if (existingMsg) existingMsg.remove();
    
    const message = document.createElement('div');
    message.className = 'form-message success';
    message.textContent = 'Merci pour votre inscription !';
    message.setAttribute('role', 'alert');
    
    form.appendChild(message);
    setTimeout(() => message.remove(), 5000);
}

/**
 * Affiche un message d'erreur
 */
function showFormError(form, errorText) {
    const existingMsg = form.querySelector('.form-message');
    if (existingMsg) existingMsg.remove();
    
    const message = document.createElement('div');
    message.className = 'form-message error';
    message.textContent = errorText;
    message.setAttribute('role', 'alert');
    
    form.appendChild(message);
    setTimeout(() => message.remove(), 5000);
}

/**
 * Met le formulaire en état de chargement
 */
function setFormLoading(form, isLoading) {
    const submitBtn = form.querySelector('#newsletter-submit');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    submitBtn.disabled = isLoading;
    
    if (isLoading) {
        btnText.hidden = true;
        btnLoading.hidden = false;
    } else {
        btnText.hidden = false;
        btnLoading.hidden = true;
    }
}

/**
 * Valide le format d'email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Valide un champ email en temps réel
 */
function validateEmailField(field) {
    const errorElement = document.getElementById('email-error');
    if (!errorElement) return;
    
    if (field.value && !isValidEmail(field.value)) {
        errorElement.textContent = 'Adresse email invalide';
        field.setAttribute('aria-invalid', 'true');
    } else {
        errorElement.textContent = '';
        field.setAttribute('aria-invalid', 'false');
    }
}

// ==========================================================================
// Animations au scroll avec Intersection Observer
// ==========================================================================

/**
 * Initialise les animations au scroll
 */
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('[data-animate]');
    
    if (!animatedElements.length || !('IntersectionObserver' in window)) {
        // Fallback : afficher tous les éléments
        animatedElements.forEach(el => el.classList.add('animate'));
        return;
    }
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: CONFIG.ANIMATION_THRESHOLD,
        rootMargin: CONFIG.ANIMATION_ROOT_MARGIN
    });
    
    animatedElements.forEach(el => observer.observe(el));
}

// ==========================================================================
// Persistance des paramètres UTM
// ==========================================================================

/**
 * Initialise la persistance des UTM
 */
function initUTMPersistence() {
    const utmParams = getUTMParameters();
    
    if (Object.keys(utmParams).length > 0) {
        storeUTMParameters(utmParams);
    }
    
    // Restaurer les UTM pour les formulaires
    restoreUTMParameters();
}

/**
 * Récupère les paramètres UTM de l'URL
 */
function getUTMParameters() {
    const params = new URLSearchParams(window.location.search);
    const utmParams = {};
    
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    
    utmKeys.forEach(key => {
        const value = params.get(key);
        if (value) {
            utmParams[key] = value;
        }
    });
    
    return utmParams;
}

/**
 * Récupère un paramètre UTM spécifique
 */
function getUTMParameter(key) {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
}

/**
 * Stocke les paramètres UTM dans le localStorage
 */
function storeUTMParameters(params) {
    try {
        const storageData = {
            params: params,
            timestamp: Date.now()
        };
        localStorage.setItem('utmParameters', JSON.stringify(storageData));
    } catch (e) {
        console.warn('Impossible de stocker les UTM:', e);
    }
}

/**
 * Restaure les paramètres UTM depuis le localStorage
 */
function restoreUTMParameters() {
    try {
        const stored = localStorage.getItem('utmParameters');
        if (!stored) return;
        
        const data = JSON.parse(stored);
        const age = Date.now() - data.timestamp;
        const maxAge = CONFIG.UTM_STORAGE_DURATION * 24 * 60 * 60 * 1000;
        
        if (age > maxAge) {
            localStorage.removeItem('utmParameters');
            return;
        }
        
        // Les paramètres sont disponibles pour les formulaires
        window.utmParameters = data.params;
        
    } catch (e) {
        console.warn('Erreur lecture UTM:', e);
    }
}

// ==========================================================================
// Détection de langue et suggestions
// ==========================================================================

/**
 * Initialise la détection de langue
 */
function initLanguageDetection() {
    const userLang = navigator.language || navigator.userLanguage;
    const pageLang = document.documentElement.lang;
    
    // Afficher une bannière de suggestion si la langue diffère
    if (!userLang.startsWith(pageLang) && pageLang === 'fr') {
        setTimeout(showLanguageSuggestion, 2000);
    }
}

/**
 * Affiche une suggestion de changement de langue
 */
function showLanguageSuggestion() {
    const existingBanner = document.querySelector('.lang-suggestion-banner');
    if (existingBanner) return;
    
    const banner = document.createElement('div');
    banner.className = 'lang-suggestion-banner';
    banner.innerHTML = `
        <p>You seem to prefer English. <a href="/">Visit the English version</a></p>
        <button onclick="this.parentElement.remove()" aria-label="Close">×</button>
    `;
    
    document.body.prepend(banner);
    
    // Accessibilité
    const link = banner.querySelector('a');
    link.focus();
}

// ==========================================================================
// Suivi des événements analytics
// ==========================================================================

/**
 * Track un événement d'affiliation
 */
function trackAffiliateClick(url) {
    if (window.gtag && STATE.consentGiven) {
        gtag('event', 'affiliate_click', {
            'event_label': url,
            'event_category': 'affiliation',
            'transport_type': 'beacon'
        });
    }
    
    // Ouvrir le lien après un petit délai pour le tracking
    setTimeout(() => {
        window.open(url, '_blank', 'noopener,noreferrer');
    }, 150);
}

/**
 * Track un événement vidéo
 */
function trackVideoEvent(action, videoId, value) {
    if (window.gtag && STATE.consentGiven) {
        gtag('event', action, {
            'event_label': videoId,
            'event_category': 'video',
            'value': value
        });
    }
}

/**
 * Track un événement FAQ
 */
function trackFAQEvent(question) {
    if (window.gtag && STATE.consentGiven) {
        gtag('event', 'faq_open', {
            'event_label': question.substring(0, 100),
            'event_category': 'engagement'
        });
    }
}

/**
 * Track une inscription newsletter
 */
function trackNewsletterSignup(email) {
    if (window.gtag && STATE.consentGiven) {
        gtag('event', 'newsletter_signup', {
            'event_category': 'conversion',
            'event_label': email
        });
    }
}

// ==========================================================================
// Utilitaires de performance et helpers
// ==========================================================================

/**
 * Initialise le monitoring de performance
 */
function initPerformanceMonitoring() {
    // Mesurer le LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lcpEntry = entries.find(entry => entry.entryType === 'largest-contentful-paint');
            
            if (lcpEntry && window.gtag && STATE.consentGiven) {
                gtag('event', 'lcp_measure', {
                    'event_category': 'performance',
                    'value': Math.round(lcpEntry.startTime),
                    'non_interaction': true
                });
            }
        });
        
        observer.observe({entryTypes: ['largest-contentful-paint']});
    }
    
    // Mesurer les erreurs JavaScript
    window.addEventListener('error', function(e) {
        if (window.gtag && STATE.consentGiven) {
            gtag('event', 'js_error', {
                'event_category': 'error',
                'event_label': e.message,
                'non_interaction': true
            });
        }
    });
}

/**
 * Génère un ID unique
 */
function generateId(prefix) {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Débounce une fonction
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Formatte une date pour l'affichage
 */
function formatDate(date) {
    return new Intl.DateTimeFormat(STATE.currentLang, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date(date));
}

// ==========================================================================
// Gestion des erreurs globale
// ==========================================================================

window.addEventListener('error', function(e) {
    console.error('Erreur globale:', e.error);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Promise rejetée non gérée:', e.reason);
});

// ==========================================================================
// Export pour utilisation globale (si nécessaire)
// ==========================================================================

window.CreativeAIApp = {
    config: CONFIG,
    state: STATE,
    utils: {
        debounce,
        formatDate,
        generateId
    },
    tracking: {
        trackAffiliateClick,
        trackVideoEvent,
        trackNewsletterSignup
    }
};