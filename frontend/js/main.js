// Public website interactions and API-driven content loading.
const resolveApiBaseUrl = () => {
    const configuredUrl = window.VISWASHANTHI_API_BASE;

    if (configuredUrl) {
        return configuredUrl.replace(/\/$/, '');
    }

    const { protocol, hostname } = window.location;

    if (protocol === 'file:' || hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5000/api';
    }

    return `${window.location.origin}/api`;
};

const API_BASE_URL = resolveApiBaseUrl();
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
const CAMPUS_IMAGE = 'school images/vhs.png';
const POPUP_BANNER_STORAGE_KEY = 'viswashanthi_popup_banner_seen';
let siteSettings = {};
let heroAutoplay = null;

const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const escapeHtml = (value = '') =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const createSkeletonCards = (count = 3) =>
    Array.from({ length: count })
        .map(() => '<div class="skeleton skeleton-card"></div>')
        .join('');

const PHONE_PATTERN = /^[0-9+\s()-]{10,20}$/;

const fetchJson = async (endpoint, options = {}) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            signal: options.signal || controller.signal
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong');
        }

        return data;
    } catch (error) {
        if (error?.name === 'AbortError') {
            throw new Error('Request timed out. Please make sure the backend server is running and try again.');
        }

        if (error instanceof TypeError) {
            throw new Error('Unable to connect to the server. Please start the backend and try again.');
        }

        if (String(error?.message || '').includes('aborted without reason')) {
            throw new Error('Request timed out. Please make sure the backend server is running and try again.');
        }

        throw error;
    } finally {
        window.clearTimeout(timeout);
    }
};

const getImageUrl = (path = '') => `${API_ORIGIN}${path}`;
const sanitizeUrl = (value, fallback = '#') => {
    const url = String(value || '').trim();

    if (!url) {
        return fallback;
    }

    if (/^(https?:|mailto:|tel:)/i.test(url) || /^[\w./#?=&%-]+$/i.test(url)) {
        return url;
    }

    return fallback;
};

const DEFAULT_MAP_EMBED_URL = 'https://maps.google.com/maps?width=100%25&height=600&hl=en&q=Allagadda%20Andhra%20Pradesh&t=&z=14&ie=UTF8&iwloc=B&output=embed';

const normalizeMapEmbedUrl = (url) => {
    if (!url) {
        return DEFAULT_MAP_EMBED_URL;
    }

    if (url.includes('www.google.com/maps?q=')) {
        return DEFAULT_MAP_EMBED_URL;
    }

    return url;
};

const renderFallbackBanners = () => {
    const container = qs('#bannerContainer');
    if (!container) {
        return;
    }

    container.innerHTML = `
        <article class="hero-slide active" data-banner-link="admission.html" tabindex="0" role="link" aria-label="Apply for admission">
            <div class="banner-overlay"></div>
            <img src="${CAMPUS_IMAGE}" alt="VISWASHANTHI HIGH SCHOOL campus" loading="eager">
        </article>
        <article class="hero-slide" data-banner-link="about.html" tabindex="0" role="link" aria-label="Explore school">
            <div class="banner-overlay"></div>
            <img src="${CAMPUS_IMAGE}" alt="VISWASHANTHI HIGH SCHOOL academic block" loading="lazy">
        </article>
        <article class="hero-slide" data-banner-link="contact.html" tabindex="0" role="link" aria-label="Contact school">
            <div class="banner-overlay"></div>
            <img src="${CAMPUS_IMAGE}" alt="VISWASHANTHI HIGH SCHOOL admissions" loading="lazy">
        </article>
    `;

    initHeroCarousel();
};

const loadBanners = async () => {
    const container = qs('#bannerContainer');
    if (!container) {
        return;
    }

    try {
        const { banners = [] } = await fetchJson('/banner');

        if (!banners.length) {
            renderFallbackBanners();
            return;
        }

        container.innerHTML = banners
            .map(
                (banner, index) => `
                    <article class="hero-slide ${index === 0 ? 'active' : ''}" data-banner-link="${escapeHtml(
                        sanitizeUrl(banner.ctaLink, 'admission.html')
                    )}" tabindex="0" role="link" aria-label="${escapeHtml(banner.title || 'Banner slide')}">
                        <div class="banner-overlay"></div>
                        <img src="${getImageUrl(banner.image)}" alt="${escapeHtml(banner.title)}" loading="lazy">
                    </article>
                `
            )
            .join('');

        initHeroCarousel();
    } catch (error) {
        renderFallbackBanners();
    }
};

const initHeroCarousel = () => {
    const container = qs('#bannerContainer');
    const heroCarousel = qs('#heroCarousel');
    const dotsContainer = qs('#heroCarouselDots');
    const prevButton = qs('#heroPrevBtn');
    const nextButton = qs('#heroNextBtn');
    const slides = qsa('.hero-slide', container);

    if (!container || !heroCarousel || !dotsContainer || !prevButton || !nextButton || !slides.length) {
        return;
    }

    let activeIndex = slides.findIndex((slide) => slide.classList.contains('active'));
    if (activeIndex === -1) {
        activeIndex = 0;
        slides[0].classList.add('active');
    }

    dotsContainer.innerHTML = slides
        .map(
            (_, index) =>
                `<button class="hero-carousel-dot ${index === activeIndex ? 'active' : ''}" type="button" data-slide-index="${index}" aria-label="Go to slide ${index + 1}"></button>`
        )
        .join('');

    const dots = qsa('.hero-carousel-dot', dotsContainer);

    const setSlide = (index) => {
        slides.forEach((slide, slideIndex) => {
            slide.classList.toggle('active', slideIndex === index);
        });
        dots.forEach((dot, dotIndex) => {
            dot.classList.toggle('active', dotIndex === index);
        });
        activeIndex = index;
    };

    const moveSlide = (direction) => {
        setSlide((activeIndex + direction + slides.length) % slides.length);
    };

    prevButton.onclick = () => {
        moveSlide(-1);
        restartHeroAutoplay(moveSlide);
    };

    nextButton.onclick = () => {
        moveSlide(1);
        restartHeroAutoplay(moveSlide);
    };

    dots.forEach((dot) => {
        dot.onclick = () => {
            setSlide(Number(dot.dataset.slideIndex));
            restartHeroAutoplay(moveSlide);
        };
    });

    slides.forEach((slide) => {
        slide.addEventListener('click', (event) => {
            if (event.target.closest('a, button')) {
                return;
            }

            const link = slide.dataset.bannerLink;
            if (link) {
                window.location.href = link;
            }
        });

        slide.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                const link = slide.dataset.bannerLink;
                if (link) {
                    window.location.href = link;
                }
            }
        });
    });

    heroCarousel.onmouseenter = () => {
        if (heroAutoplay) {
            window.clearInterval(heroAutoplay);
        }
    };

    heroCarousel.onmouseleave = () => {
        restartHeroAutoplay(moveSlide);
    };

    restartHeroAutoplay(moveSlide);
};

const initAdmissionPopup = () => {
    const popup = qs('#admissionPopup');
    const form = qs('#admissionPopupForm');
    if (!popup || !form) {
        return;
    }

    const closePopup = () => {
        popup.classList.remove('show');
        document.body.style.overflow = '';
    };

    qsa('[data-popup-close]', popup).forEach((button) => {
        button.addEventListener('click', closePopup);
    });

    popup.addEventListener('click', (event) => {
        if (event.target === popup) {
            closePopup();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && popup.classList.contains('show')) {
            closePopup();
        }
    });

    bindAdmissionForm(form, {
        onSuccess: () => {
            closePopup();
        }
    });

    window.setTimeout(() => {
        popup.classList.add('show');
        document.body.style.overflow = 'hidden';
    }, 900);
};

const initPopupBanner = async () => {
    try {
        const { popupBanner } = await fetchJson('/banner/popup');
        if (!popupBanner?.image) {
            return false;
        }

        const popupVersion = `${popupBanner._id || 'popup'}:${popupBanner.updatedAt || ''}`;
        if (window.localStorage.getItem(POPUP_BANNER_STORAGE_KEY) === popupVersion) {
            return false;
        }

        const popup = document.createElement('div');
        popup.className = 'site-popup-banner';
        popup.innerHTML = `
            <div class="site-popup-banner-card" role="dialog" aria-modal="true" aria-label="${escapeHtml(
                popupBanner.title || 'School announcement'
            )}">
                <button class="popup-close" type="button" data-popup-close aria-label="Close popup">
                    <i class="bi bi-x-lg"></i>
                </button>
                <img src="${getImageUrl(popupBanner.image)}" alt="${escapeHtml(popupBanner.title || 'Popup banner')}">
                <div class="site-popup-banner-content">
                    <span class="tag-chip">${escapeHtml(popupBanner.title || 'Admissions Open')}</span>
                    <p>${escapeHtml(popupBanner.subtitle || 'Admissions are open for the new academic year.')}</p>
                    <a class="btn btn-brand" href="${escapeHtml(sanitizeUrl(popupBanner.ctaLink, 'admission.html'))}">
                        ${escapeHtml(popupBanner.ctaText || 'Apply Now')}
                    </a>
                </div>
            </div>
        `;

        const closePopup = () => {
            popup.classList.remove('show');
            document.body.style.overflow = '';
            window.localStorage.setItem(POPUP_BANNER_STORAGE_KEY, popupVersion);
            setTimeout(() => popup.remove(), 240);
        };

        popup.querySelector('[data-popup-close]').addEventListener('click', closePopup);
        popup.querySelector('a')?.addEventListener('click', () => {
            window.localStorage.setItem(POPUP_BANNER_STORAGE_KEY, popupVersion);
        });
        popup.addEventListener('click', (event) => {
            if (event.target === popup) {
                closePopup();
            }
        });

        document.body.appendChild(popup);
        window.setTimeout(() => {
            popup.classList.add('show');
            document.body.style.overflow = 'hidden';
        }, 700);

        return true;
    } catch (error) {
        return false;
    }
};

const restartHeroAutoplay = (moveSlide) => {
    if (heroAutoplay) {
        window.clearInterval(heroAutoplay);
    }

    heroAutoplay = window.setInterval(() => {
        moveSlide(1);
    }, 5000);
};

const applySettings = (settings) => {
    siteSettings = settings;

    qsa('[data-school-name]').forEach((element) => {
        element.textContent = settings.schoolName || 'VISWASHANTHI HIGH SCHOOL';
    });

    qsa('[data-school-location]').forEach((element) => {
        element.textContent = settings.location || 'Allagadda';
    });

    qsa('[data-school-classes]').forEach((element) => {
        element.textContent = settings.classesRange || 'Nursery to 10th';
    });

    qsa('[data-school-phone]').forEach((element) => {
        element.textContent = settings.contactPhone || '+91 90000 00000';
    });

    qsa('[data-school-email]').forEach((element) => {
        element.textContent = settings.contactEmail || 'info@viswashanthischool.com';
    });

    qsa('[data-school-address]').forEach((element) => {
        element.textContent = settings.address || 'Main Road, Allagadda, Andhra Pradesh';
    });

    const aboutContent = qs('#aboutContent');
    if (aboutContent) {
        aboutContent.textContent = settings.aboutUs || '';
    }

    const heroTagline = qs('#heroTagline');
    if (heroTagline) {
        heroTagline.textContent = settings.heroTagline || 'Nurturing curiosity, character, and confidence';
    }

    const mapIframe = qs('#mapFrame');
    if (mapIframe) {
        mapIframe.src = normalizeMapEmbedUrl(settings.mapEmbedUrl);
    }
};

const loadSettings = async () => {
    try {
        const { settings } = await fetchJson('/settings');
        applySettings(settings || {});
    } catch (error) {
        applySettings({});
    }
};

const loadFaculty = async () => {
    const homeGrid = qs('#facultyGrid');
    const pageGrid = qs('#facultyPageGrid');

    if (homeGrid) {
        homeGrid.innerHTML = createSkeletonCards(3);
    }

    if (pageGrid) {
        pageGrid.innerHTML = createSkeletonCards(6);
    }

    try {
        const { faculty = [] } = await fetchJson('/faculty');
        renderFacultyCards(faculty, '#facultyGrid', 3);
        renderFacultyCards(faculty, '#facultyPageGrid');

        const facultyCount = qs('#facultyCount');
        if (facultyCount && faculty.length) {
            facultyCount.dataset.target = String(faculty.length);
            facultyCount.textContent = `${faculty.length}+`;
        }
    } catch (error) {
        renderFacultyCards([], '#facultyGrid', 3);
        renderFacultyCards([], '#facultyPageGrid');
    }
};

const renderFacultyCards = (faculty, selector, limit) => {
    const container = qs(selector);
    if (!container) return;

    const items = limit ? faculty.slice(0, limit) : faculty;
    const isFacultyPage = selector === '#facultyPageGrid';
    const columnClass = isFacultyPage ? 'col-sm-6 col-lg-4 col-xl-3' : 'col-sm-6 col-lg-4';

    if (!items.length) {
        container.innerHTML = `
            <div class="col-12">
                <div class="glass-card p-4 text-center">
                    <div class="icon-bubble mx-auto mb-3"><i class="bi bi-people"></i></div>
                    <h5 class="fw-bold">Faculty profiles coming soon</h5>
                    <p class="text-muted mb-0">Our dedicated educators will be listed here shortly.</p>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = items
        .map(
            (member) => `
                <div class="${columnClass}" data-aos="fade-up">
                    <article class="faculty-card faculty-card-pro hover-lift">
                        <div class="faculty-photo-wrap">
                            <img class="faculty-photo" src="${getImageUrl(member.photo)}" alt="${escapeHtml(member.name)}" loading="lazy">
                        </div>
                        <div class="faculty-meta">
                            <div class="faculty-topline">
                                <span class="badge bg-primary-soft text-primary">${escapeHtml(member.subject)}</span>
                                <span class="faculty-experience">${escapeHtml(member.experience || 'Faculty')}</span>
                            </div>
                            <h4 class="faculty-name">${escapeHtml(member.name)}</h4>
                            <p class="faculty-qualification">${escapeHtml(member.qualification || 'Dedicated academic mentor')}</p>
                            <p class="faculty-description">${escapeHtml(
                                member.bio || `${member.name} guides students in ${member.subject} with clarity, care, and consistent academic support.`
                            )}</p>
                        </div>
                    </article>
                </div>
            `
        )
        .join('');
};

const buildGalleryCards = (gallery, selector, limit) => {
    const container = qs(selector);
    if (!container) return;

    const items = limit ? gallery.slice(0, limit) : gallery;

    if (!items.length) {
        container.innerHTML = `
            <div class="col-12">
                <div class="glass-card p-4 text-center w-100">
                    <div class="icon-bubble mx-auto mb-3"><i class="bi bi-images"></i></div>
                    <h5 class="fw-bold">Gallery updates coming soon</h5>
                    <p class="text-muted mb-0">We are capturing beautiful moments to share with you.</p>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = items
        .map(
            (image) => `
                <article class="gallery-card hover-lift" data-category="${escapeHtml(image.category)}" data-aos="zoom-in">
                    <img class="gallery-photo" src="${getImageUrl(image.image)}" alt="${escapeHtml(image.title)}" loading="lazy">
                    <div class="gallery-meta">
                        <span class="gallery-chip">${escapeHtml(image.category || 'Campus')}</span>
                        <div class="gallery-meta-row">
                            <h5 class="gallery-title">${escapeHtml(image.title || 'Campus Life')}</h5>
                            <button class="gallery-action" type="button" onclick="openLightbox('${escapeHtml(getImageUrl(image.image))}')">
                                <i class="bi bi-arrows-fullscreen"></i>
                                <span>View</span>
                            </button>
                        </div>
                    </div>
                </article>
            `
        )
        .join('');
};

const showToast = (message, type = 'info') => {
    let wrap = qs('.toast-wrap');
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.className = 'toast-wrap fixed-bottom p-4 d-flex flex-column align-items-center';
        wrap.style.zIndex = '10000';
        document.body.appendChild(wrap);
    }

    const toast = document.createElement('div');
    toast.className = `site-toast glass-card py-3 px-4 mb-2 animate__animated animate__fadeInUp ${type === 'error' ? 'border-danger' : 'border-primary'}`;
    toast.style.minWidth = '300px';
    toast.style.background = 'rgba(255, 255, 255, 0.98)';
    toast.style.color = '#1f2937';
    toast.style.borderWidth = '1px';
    toast.style.borderStyle = 'solid';
    toast.style.boxShadow = '0 18px 40px rgba(15, 23, 42, 0.14)';
    toast.innerHTML = `
        <div class="d-flex align-items-center gap-3">
            <i class="bi ${type === 'error' ? 'bi-exclamation-circle text-danger' : 'bi-check-circle text-primary'} fs-5"></i>
            <span class="fw-medium" style="color:#1f2937;">${message}</span>
        </div>
    `;
    wrap.appendChild(toast);

    setTimeout(() => {
        toast.classList.replace('animate__fadeInUp', 'animate__fadeOutDown');
        setTimeout(() => toast.remove(), 500);
    }, 3500);
};

const collectAdmissionPayload = (form) => {
    const formData = new FormData(form);

    return {
        studentName: String(formData.get('studentName') || '').trim(),
        className: String(formData.get('className') || '').trim(),
        parentName: String(formData.get('parentName') || '').trim(),
        phone: String(formData.get('phone') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        address: String(formData.get('address') || '').trim()
    };
};

const validateAdmissionPayload = (payload) => {
    if (!payload.studentName) return 'Student name is required.';
    if (!payload.className) return 'Please select a class.';
    if (!payload.parentName) return 'Parent name is required.';
    if (!PHONE_PATTERN.test(payload.phone)) return 'Please enter a valid phone number.';
    if (!payload.email || !/^\S+@\S+\.\S+$/.test(payload.email)) return 'Please enter a valid email address.';
    if (!payload.address) return 'Address is required.';

    return '';
};

const toggleAdmissionSuccess = (form, html = '') => {
    const successBox =
        form.parentElement?.querySelector('#admissionSuccess') ||
        form.closest('.form-shell')?.querySelector('#admissionSuccess');

    if (!successBox) {
        return;
    }

    if (!html) {
        successBox.classList.add('d-none');
        successBox.innerHTML = '';
        return;
    }

    successBox.classList.remove('d-none');
    successBox.innerHTML = html;
};

const bindAdmissionForm = (form, options = {}) => {
    if (!form || form.dataset.bound === 'true') {
        return;
    }

    form.dataset.bound = 'true';

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]');
        if (!submitButton) {
            return;
        }

        const payload = collectAdmissionPayload(form);
        const validationMessage = validateAdmissionPayload(payload);
        toggleAdmissionSuccess(form);

        if (validationMessage) {
            showToast(validationMessage, 'error');
            return;
        }

        const originalHtml = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Submitting';

        try {
            const result = await fetchJson('/admission', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (options.onSuccess) {
                options.onSuccess(result, form);
            }

            form.reset();
            showToast(result.message || 'Admission form submitted successfully.', 'success');
        } catch (error) {
            showToast(error.message || 'Unable to submit application right now.', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalHtml;
        }
    });
};

const hideLoadingScreen = () => {
    const loader = qs('#loadingScreen');
    if (loader) {
        loader.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        loader.style.opacity = '0';
        loader.style.transform = 'scale(1.1)';
        setTimeout(() => loader.remove(), 600);
    }
};

const loadGallery = async () => {
    const preview = qs('#galleryPreview');
    const fullGrid = qs('#galleryGrid');

    if (preview) {
        preview.innerHTML = createSkeletonCards(4);
    }

    if (fullGrid) {
        fullGrid.innerHTML = createSkeletonCards(6);
    }

    try {
        const { gallery = [] } = await fetchJson('/gallery');
        buildGalleryCards(gallery, '#galleryPreview', 4);
        buildGalleryCards(gallery, '#galleryGrid');

        const categories = ['All', ...new Set(gallery.map((item) => item.category || 'Campus'))];
        const filterWrap = qs('#galleryFilters');

        if (filterWrap) {
            filterWrap.innerHTML = categories
                .map(
                    (category, index) => `
                        <button class="btn ${index === 0 ? 'btn-brand' : 'btn-soft'} filter-btn" data-category="${escapeHtml(category)}">
                            ${escapeHtml(category)}
                        </button>
                    `
                )
                .join('');

            initGalleryFilter();
        }

    } catch (error) {
        if (preview) {
            preview.innerHTML = '<div class="surface-card p-4 text-muted">Unable to load gallery images right now.</div>';
        }
        if (fullGrid) {
            fullGrid.innerHTML = '<div class="surface-card p-4 text-muted">Unable to load gallery images right now.</div>';
        }
    }
};

const initGalleryFilter = () => {
    qsa('.filter-btn').forEach((button) => {
        button.addEventListener('click', () => {
            qsa('.filter-btn').forEach((item) => {
                item.classList.remove('btn-brand');
                item.classList.add('btn-soft');
            });

            button.classList.remove('btn-soft');
            button.classList.add('btn-brand');

            const category = button.dataset.category;

            qsa('#galleryGrid .gallery-card').forEach((card) => {
                card.style.display =
                    category === 'All' || card.dataset.category === category ? 'block' : 'none';
            });
        });
    });
};

const initCounters = () => {
    qsa('.stat-number[data-target]').forEach((counter) => {
        const target = Number(counter.dataset.target || 0);

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    let current = 0;
                    const step = Math.max(1, Math.floor(target / 40));

                    const tick = () => {
                        current += step;
                        if (current >= target) {
                            counter.textContent = `${target}+`;
                            return;
                        }

                        counter.textContent = `${current}+`;
                        requestAnimationFrame(tick);
                    };

                    tick();
                    observer.unobserve(counter);
                });
            },
            { threshold: 0.6 }
        );

        observer.observe(counter);
    });
};

const initAdmissionForm = () => {
    const form = qs('#admissionForm');
    if (!form) {
        return;
    }

    bindAdmissionForm(form, {
        onSuccess: (result, activeForm) => {
            toggleAdmissionSuccess(
                activeForm,
                `
                    <div class="alert alert-success border-0 shadow-sm rounded-4 p-4 mb-0">
                        <h5 class="fw-bold mb-2">Application submitted successfully</h5>
                        <p class="mb-2">Thank you for applying to VISWASHANTHI HIGH SCHOOL. Our team will contact you soon.</p>
                        <p class="mb-0"><strong>Application ID:</strong> ${result.applicationId}</p>
                    </div>
                `
            );
        }
    });
};

const initContactForm = () => {
    const form = qs('#contactForm');
    if (!form) {
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]');
        const originalHtml = submitButton?.innerHTML;

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending';
        }

        try {
            const payload = {
                name: form.name.value.trim(),
                email: form.email.value.trim(),
                phone: form.phone.value.trim(),
                message: form.message.value.trim()
            };

            if (!payload.name || !payload.email || !payload.phone || !payload.message) {
                throw new Error('Please complete all contact form fields.');
            }

            await fetchJson('/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            form.reset();
            showToast('Message sent successfully. Please check your email for confirmation.', 'success');
        } catch (error) {
            showToast(error.message || 'Unable to send your message right now.', 'error');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalHtml;
            }
        }
    });
};

const openLightbox = (imageSrc) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'lightbox';
    wrapper.innerHTML = `
        <button class="lightbox-close" type="button" aria-label="Close">&times;</button>
        <img src="${imageSrc}" alt="Gallery image">
    `;

    wrapper.addEventListener('click', (event) => {
        if (event.target === wrapper || event.target.classList.contains('lightbox-close')) {
            wrapper.remove();
            document.body.style.overflow = '';
        }
    });

    document.body.appendChild(wrapper);
    document.body.style.overflow = 'hidden';
};

const initAOS = () => {
    if (window.AOS) {
        window.AOS.init({
            duration: 800,
            once: true,
            offset: 100
        });
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadSettings();
        await Promise.all([loadBanners(), loadFaculty(), loadGallery()]);
        initCounters();
        initAdmissionForm();
        initContactForm();
        const hasPopupBanner = await initPopupBanner();
        if (!hasPopupBanner) {
            initAdmissionPopup();
        }
        initAOS();
    } catch (error) {
        console.error('Website startup failed:', error);
        renderFallbackBanners();
        renderFacultyCards([], '#facultyGrid', 3);
        renderFacultyCards([], '#facultyPageGrid');
        initAdmissionForm();
        initContactForm();
    } finally {
        hideLoadingScreen();
    }
});

window.openLightbox = openLightbox;
