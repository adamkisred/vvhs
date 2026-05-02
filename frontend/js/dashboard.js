// Admin dashboard page logic and CRUD integrations.
const resolveDashboardApiBaseUrl = () => {
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

const DASHBOARD_API_BASE = resolveDashboardApiBaseUrl();

const DashboardApp = (() => {
    let cachedFaculty = [];
    let cachedBanners = [];
    let cachedAdmissions = [];
    let cachedPopupBanner = null;
    let selectedAdmissionIds = new Set();

    const qs = (selector, scope = document) => scope.querySelector(selector);
    const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];
    const getImageUrl = (path = '') => `${DASHBOARD_API_BASE.replace(/\/api\/?$/, '')}${path}`;

    const escapeHtml = (value = '') =>
        String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

    const showToast = (message, type = 'success') => {
        let stack = qs('.toast-stack');

        if (!stack) {
            stack = document.createElement('div');
            stack.className = 'toast-stack';
            document.body.appendChild(stack);
        }

        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${type} border-0 show mb-2`;
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${escapeHtml(message)}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto"></button>
            </div>
        `;
        stack.appendChild(toast);

        toast.querySelector('button').addEventListener('click', () => toast.remove());
        setTimeout(() => toast.remove(), 3200);
    };

    const request = async (endpoint, options = {}) => {
        const headers = options.headers || {};
        const token = window.Auth?.getToken?.();

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${DASHBOARD_API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 401) {
            window.Auth?.clearSession?.();
            window.location.href = 'login.html';
            throw new Error('Session expired');
        }

        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }

        return data;
    };

    const requestBlob = async (endpoint, options = {}) => {
        const headers = options.headers || {};
        const token = window.Auth?.getToken?.();

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${DASHBOARD_API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401) {
            window.Auth?.clearSession?.();
            window.location.href = 'login.html';
            throw new Error('Session expired');
        }

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Request failed');
        }

        return {
            blob: await response.blob(),
            fileName:
                response.headers
                    .get('content-disposition')
                    ?.match(/filename="?([^"]+)"?/)?.[1] || 'admissions-report.pdf'
        };
    };

    const validateImageFile = (file, { required = false } = {}) => {
        if (!file || !file.name) {
            return required ? 'Please choose an image file.' : '';
        }

        if (!file.type.startsWith('image/')) {
            return 'Only image files are allowed.';
        }

        if (file.size > 5 * 1024 * 1024) {
            return 'Image size must be 5MB or less.';
        }

        return '';
    };

    const setActiveNav = () => {
        const page = document.body.dataset.adminPage;
        qsa('.admin-nav-link').forEach((link) => {
            if (link.dataset.page === page) {
                link.classList.add('active');
            }
        });
    };

    const initMobileSidebar = () => {
        const toggle = qs('#sidebarToggle');
        const sidebar = qs('.admin-sidebar');
        if (!toggle || !sidebar) {
            return;
        }

        toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    };

    const renderDashboardStats = async () => {
        const statsWrap = qs('#statsGrid');
        const recentWrap = qs('#recentAdmissions');

        if (!statsWrap || !recentWrap) {
            return;
        }

        const [{ stats }, { admissions }] = await Promise.all([
            request('/settings/stats'),
            request('/admission')
        ]);

        statsWrap.innerHTML = `
            <div class="col-md-6 col-xl-3">
                <div class="admin-surface admin-card metric-card">
                    <div class="metric-icon"><i class="bi bi-mortarboard"></i></div>
                    <div class="metric-number">${stats.admissions}</div>
                    <div class="text-muted">Admission Applications</div>
                </div>
            </div>
            <div class="col-md-6 col-xl-3">
                <div class="admin-surface admin-card metric-card">
                    <div class="metric-icon"><i class="bi bi-people"></i></div>
                    <div class="metric-number">${stats.faculty}</div>
                    <div class="text-muted">Faculty Profiles</div>
                </div>
            </div>
            <div class="col-md-6 col-xl-3">
                <div class="admin-surface admin-card metric-card">
                    <div class="metric-icon"><i class="bi bi-images"></i></div>
                    <div class="metric-number">${stats.gallery}</div>
                    <div class="text-muted">Gallery Images</div>
                </div>
            </div>
            <div class="col-md-6 col-xl-3">
                <div class="admin-surface admin-card metric-card">
                    <div class="metric-icon"><i class="bi bi-card-image"></i></div>
                    <div class="metric-number">${stats.banners}</div>
                    <div class="text-muted">Hero Banners</div>
                </div>
            </div>
        `;

        recentWrap.innerHTML = admissions
            .slice(0, 6)
            .map(
                (item) => `
                    <tr>
                        <td>
                            <strong>${escapeHtml(item.studentName)}</strong><br>
                            <small class="text-muted">${escapeHtml(item.parentName)}</small>
                        </td>
                        <td>${escapeHtml(item.className)}</td>
                        <td>${escapeHtml(item.phone)}</td>
                        <td><span class="status-chip ${item.status.toLowerCase()}">${escapeHtml(item.status)}</span></td>
                        <td>${new Date(item.createdAt).toLocaleDateString()}</td>
                    </tr>
                `
            )
            .join('');
    };

    const attachBannerEvents = () => {
        const form = qs('#bannerForm');
        const modalElement = qs('#bannerModal');
        if (!form || !modalElement) {
            return;
        }

        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);

        const createButton = qs('#createBannerBtn');
        if (createButton && !createButton.dataset.bound) {
            createButton.dataset.bound = 'true';
            createButton.addEventListener('click', () => {
                form.reset();
                form.bannerId.value = '';
                qs('#bannerModalLabel').textContent = 'Add Banner';
            });
        }

        if (!form.dataset.bound) {
            form.dataset.bound = 'true';
            form.addEventListener('submit', async (event) => {
                event.preventDefault();

                const submitButton = form.querySelector('button[type="submit"]');
                const originalText = submitButton?.innerHTML;
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving';
                }

                try {
                    const id = form.bannerId.value;
                    const payload = new FormData(form);
                    payload.set('isActive', form.isActive.checked ? 'true' : 'false');
                    const imageFile = payload.get('image');
                    const imageError = validateImageFile(imageFile, { required: !id });
                    if (imageError) {
                        throw new Error(imageError);
                    }

                    if (!imageFile?.name) {
                        payload.delete('image');
                    }

                    const endpoint = id ? `/banner/${id}` : '/banner';
                    const method = id ? 'PUT' : 'POST';

                    await request(endpoint, {
                        method,
                        body: payload
                    });

                    modal.hide();
                    showToast(`Banner ${id ? 'updated' : 'created'} successfully.`);
                    await loadBannersPage();
                } catch (error) {
                    showToast(error.message || 'Unable to save banner.', 'danger');
                } finally {
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = originalText;
                    }
                }
            });
        }

        qsa('[data-banner-edit]').forEach((button) => {
            button.addEventListener('click', () => {
                const banner = cachedBanners.find((item) => item._id === button.dataset.bannerEdit);
                if (!banner) {
                    return;
                }

                form.bannerId.value = banner._id;
                form.title.value = banner.title || '';
                form.subtitle.value = banner.subtitle || '';
                form.ctaText.value = banner.ctaText || '';
                form.ctaLink.value = banner.ctaLink || '';
                form.order.value = banner.order || 0;
                form.isActive.checked = banner.isActive;
                qs('#bannerModalLabel').textContent = 'Edit Banner';
                modal.show();
            });
        });

        qsa('[data-banner-delete]').forEach((button) => {
            button.addEventListener('click', async () => {
                if (!confirm('Delete this banner?')) {
                    return;
                }

                await request(`/banner/${button.dataset.bannerDelete}`, { method: 'DELETE' });
                showToast('Banner deleted successfully.');
                await loadBannersPage();
            });
        });

        qsa('[data-banner-toggle]').forEach((button) => {
            button.addEventListener('click', async () => {
                await request(`/banner/${button.dataset.bannerToggle}/toggle`, { method: 'PATCH' });
                await loadBannersPage();
            });
        });
    };

    const loadBannersPage = async () => {
        const tableBody = qs('#bannerTableBody');
        if (!tableBody) {
            return;
        }

        const [{ banners }, { popupBanner }] = await Promise.all([
            request('/banner/admin'),
            request('/banner/popup/admin')
        ]);
        cachedBanners = banners;
        cachedPopupBanner = popupBanner || null;
        const countBadge = qs('#bannerCount');
        if (countBadge) {
            countBadge.textContent = `${banners.length} Banner${banners.length === 1 ? '' : 's'}`;
        }
        tableBody.innerHTML = banners
            .length
            ? banners
                  .map(
                      (banner) => `
                          <tr>
                              <td data-label="Preview"><img class="thumb-sm" src="${getImageUrl(banner.image)}" alt="${escapeHtml(banner.title)}"></td>
                              <td data-label="Content">
                                  <strong>${escapeHtml(banner.title)}</strong><br>
                                  <small class="text-muted">${escapeHtml(banner.subtitle || '')}</small>
                              </td>
                              <td data-label="Order">${banner.order}</td>
                              <td data-label="Status"><span class="status-chip ${banner.isActive ? 'contacted' : 'closed'}">${banner.isActive ? 'Active' : 'Inactive'}</span></td>
                              <td data-label="Actions" class="text-end">
                                  <button class="btn btn-outline-primary btn-sm me-2" data-banner-edit="${banner._id}">Edit</button>
                                  <button class="btn btn-outline-secondary btn-sm me-2" data-banner-toggle="${banner._id}">${banner.isActive ? 'Disable' : 'Enable'}</button>
                                  <button class="btn btn-outline-danger btn-sm" data-banner-delete="${banner._id}">Delete</button>
                              </td>
                          </tr>
                      `
                  )
                  .join('')
            : `
                <tr>
                    <td colspan="5" class="text-center py-5 text-muted">
                        <i class="bi bi-card-image fs-1 d-block mb-2"></i>
                        No banners found. Click "Add Banner" to create one.
                    </td>
                </tr>
            `;
        attachBannerEvents();
        renderPopupBannerForm(popupBanner);
    };

    const renderPopupBannerForm = (popupBanner) => {
        const form = qs('#popupBannerForm');
        const preview = qs('#popupBannerPreview');
        const deleteButton = qs('#deletePopupBannerBtn');
        if (!form || !preview) {
            return;
        }

        if (popupBanner) {
            form.title.value = popupBanner.title || '';
            form.subtitle.value = popupBanner.subtitle || '';
            form.ctaText.value = popupBanner.ctaText || 'Apply Now';
            form.ctaLink.value = popupBanner.ctaLink || 'admission.html';
            form.isActive.checked = Boolean(popupBanner.isActive);
            preview.innerHTML = `
                <div class="popup-preview-card">
                    <img src="${getImageUrl(popupBanner.image)}" alt="${escapeHtml(popupBanner.title || 'Popup banner')}">
                    <div>
                        <span class="status-chip ${popupBanner.isActive ? 'contacted' : 'closed'}">${popupBanner.isActive ? 'Active' : 'Hidden'}</span>
                        <h3 class="h5 mt-3 mb-1">${escapeHtml(popupBanner.title || 'Popup Banner')}</h3>
                        <p class="text-muted mb-0">${escapeHtml(popupBanner.subtitle || '')}</p>
                    </div>
                </div>
            `;
        } else {
            form.reset();
            form.ctaText.value = 'Apply Now';
            form.ctaLink.value = 'admission.html';
            form.isActive.checked = true;
            preview.innerHTML = '<div class="text-muted">No popup banner uploaded yet.</div>';
        }

        if (deleteButton) {
            deleteButton.disabled = !popupBanner;
        }

        if (!form.dataset.bound) {
            form.dataset.bound = 'true';
            form.addEventListener('submit', async (event) => {
                event.preventDefault();

                const submitButton = form.querySelector('button[type="submit"]');
                const originalText = submitButton?.innerHTML;
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving';
                }

                try {
                    const payload = new FormData(form);
                    payload.set('isActive', form.isActive.checked ? 'true' : 'false');
                    const imageFile = payload.get('image');
                    const imageError = validateImageFile(imageFile, { required: !cachedPopupBanner });
                    if (imageError) {
                        throw new Error(imageError);
                    }

                    if (!imageFile?.name) {
                        payload.delete('image');
                    }

                    await request('/banner/popup/admin', {
                        method: 'PUT',
                        body: payload
                    });

                    showToast('Popup banner saved successfully.');
                    await loadBannersPage();
                } catch (error) {
                    showToast(error.message || 'Unable to save popup banner.', 'danger');
                } finally {
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = originalText;
                    }
                }
            });
        }

        if (deleteButton && !deleteButton.dataset.bound) {
            deleteButton.dataset.bound = 'true';
            deleteButton.addEventListener('click', async () => {
                if (!cachedPopupBanner) {
                    return;
                }

                if (!confirm('Delete the popup banner?')) {
                    return;
                }

                try {
                    await request('/banner/popup/admin', { method: 'DELETE' });
                    showToast('Popup banner deleted successfully.');
                    await loadBannersPage();
                } catch (error) {
                    showToast(error.message || 'Unable to delete popup banner.', 'danger');
                }
            });
        }
    };

    const attachFacultyEvents = () => {
        const form = qs('#facultyForm');
        const modalElement = qs('#facultyModal');
        if (!form || !modalElement) {
            return;
        }

        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);

        const createButton = qs('#createFacultyBtn');
        if (createButton && !createButton.dataset.bound) {
            createButton.dataset.bound = 'true';
            createButton.addEventListener('click', () => {
                form.reset();
                form.facultyId.value = '';
                qs('#facultyModalLabel').textContent = 'Add Faculty';
            });
        }

        if (!form.dataset.bound) {
            form.dataset.bound = 'true';
            form.addEventListener('submit', async (event) => {
                event.preventDefault();

                const submitButton = form.querySelector('button[type="submit"]');
                const originalText = submitButton?.innerHTML;
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving';
                }

                try {
                    const id = form.facultyId.value;
                    const payload = new FormData(form);
                    payload.set('isActive', form.isActive.checked ? 'true' : 'false');
                    if (!payload.get('photo')?.name) {
                        payload.delete('photo');
                    }

                    await request(id ? `/faculty/${id}` : '/faculty', {
                        method: id ? 'PUT' : 'POST',
                        body: payload
                    });

                    modal.hide();
                    showToast(`Faculty member ${id ? 'updated' : 'added'} successfully.`);
                    await loadFacultyPage();
                } catch (error) {
                    showToast(error.message || 'Unable to save faculty member.', 'danger');
                } finally {
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = originalText;
                    }
                }
            });
        }

        qsa('[data-faculty-edit]').forEach((button) => {
            button.addEventListener('click', () => {
                const member = cachedFaculty.find((item) => item._id === button.dataset.facultyEdit);
                if (!member) {
                    return;
                }

                form.facultyId.value = member._id;
                form.name.value = member.name || '';
                form.subject.value = member.subject || '';
                form.qualification.value = member.qualification || '';
                form.experience.value = member.experience || '';
                form.bio.value = member.bio || '';
                form.displayOrder.value = member.displayOrder || 0;
                form.isActive.checked = member.isActive;
                qs('#facultyModalLabel').textContent = 'Edit Faculty';
                modal.show();
            });
        });

        qsa('[data-faculty-delete]').forEach((button) => {
            button.addEventListener('click', async () => {
                if (!confirm('Delete this faculty member?')) {
                    return;
                }

                await request(`/faculty/${button.dataset.facultyDelete}`, { method: 'DELETE' });
                showToast('Faculty member deleted successfully.');
                await loadFacultyPage();
            });
        });
    };

    const loadFacultyPage = async () => {
        const tableBody = qs('#facultyTableBody');
        if (!tableBody) {
            return;
        }

        const { faculty } = await request('/faculty/admin');
        cachedFaculty = faculty;

        tableBody.innerHTML = faculty
            .map(
                (member) => `
                    <tr>
                        <td data-label="Photo"><img class="thumb-circle" src="${getImageUrl(member.photo)}" alt="${escapeHtml(member.name)}"></td>
                        <td data-label="Name">
                            <strong>${escapeHtml(member.name)}</strong><br>
                            <small class="text-muted">${escapeHtml(member.qualification || '')}</small>
                        </td>
                        <td data-label="Subject">${escapeHtml(member.subject)}</td>
                        <td data-label="Experience">${escapeHtml(member.experience || '-')}</td>
                        <td data-label="Order">${member.displayOrder}</td>
                        <td data-label="Status"><span class="status-chip ${member.isActive ? 'contacted' : 'closed'}">${member.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td data-label="Actions" class="text-end">
                            <button class="btn btn-outline-primary btn-sm me-2" data-faculty-edit="${member._id}">Edit</button>
                            <button class="btn btn-outline-danger btn-sm" data-faculty-delete="${member._id}">Delete</button>
                        </td>
                    </tr>
                `
            )
            .join('');

        attachFacultyEvents();
    };

    const attachGalleryEvents = () => {
        const form = qs('#galleryForm');
        if (form && !form.dataset.bound) {
            form.dataset.bound = 'true';
            form.addEventListener('submit', async (event) => {
                event.preventDefault();

                const submitButton = form.querySelector('button[type="submit"]');
                const originalText = submitButton?.innerHTML;
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Uploading';
                }

                try {
                    const payload = new FormData(form);
                    await request('/gallery', { method: 'POST', body: payload });
                    form.reset();
                    showToast('Gallery image uploaded successfully.');
                    await loadGalleryPage();
                } catch (error) {
                    showToast(error.message || 'Unable to upload gallery image.', 'danger');
                } finally {
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = originalText;
                    }
                }
            });
        }

        qsa('[data-gallery-delete]').forEach((button) => {
            button.addEventListener('click', async () => {
                if (!confirm('Delete this image?')) {
                    return;
                }

                await request(`/gallery/${button.dataset.galleryDelete}`, { method: 'DELETE' });
                showToast('Gallery image deleted successfully.');
                await loadGalleryPage();
            });
        });
    };

    const loadGalleryPage = async () => {
        const grid = qs('#galleryAdminGrid');
        if (!grid) {
            return;
        }

        const { gallery } = await request('/gallery/admin');
        grid.innerHTML = gallery
            .map(
                (item) => `
                    <article class="admin-surface gallery-admin-card">
                        <img src="${getImageUrl(item.image)}" alt="${escapeHtml(item.title)}">
                        <div class="pt-3">
                            <div class="d-flex justify-content-between gap-2 align-items-start">
                                <div>
                                    <h6 class="fw-bold mb-1">${escapeHtml(item.title || 'Gallery')}</h6>
                                    <small class="text-muted">${escapeHtml(item.category || 'Campus')}</small>
                                </div>
                                <button class="btn btn-outline-danger btn-sm" data-gallery-delete="${item._id}">Delete</button>
                            </div>
                        </div>
                    </article>
                `
            )
            .join('');
        attachGalleryEvents();
    };

    const getSelectedAdmissions = () => cachedAdmissions.filter((item) => selectedAdmissionIds.has(item._id));

    const updateAdmissionsBulkActions = () => {
        const selectedCount = selectedAdmissionIds.size;
        const selectedBadge = qs('#selectedAdmissionCount');
        const downloadButton = qs('#downloadAdmissionsPdfBtn');
        const sendButton = qs('#sendAdmissionsMailBtn');
        const selectAll = qs('#selectAllAdmissions');
        const summary = qs('#selectedAdmissionsSummary');

        if (selectedBadge) {
            selectedBadge.textContent = `${selectedCount} Selected`;
        }

        if (downloadButton) {
            downloadButton.disabled = selectedCount === 0;
        }

        if (sendButton) {
            sendButton.disabled = selectedCount === 0;
        }

        if (summary) {
            summary.textContent = `${selectedCount} admission${selectedCount === 1 ? '' : 's'} selected`;
        }

        if (selectAll) {
            const filter = qs('#statusFilter')?.value || 'all';
            const visibleAdmissions =
                filter === 'all' ? cachedAdmissions : cachedAdmissions.filter((item) => item.status === filter);
            const selectedVisible = visibleAdmissions.filter((item) => selectedAdmissionIds.has(item._id)).length;
            selectAll.checked = visibleAdmissions.length > 0 && selectedVisible === visibleAdmissions.length;
            selectAll.indeterminate = selectedVisible > 0 && selectedVisible < visibleAdmissions.length;
        }
    };

    const attachAdmissionEvents = () => {
        qsa('[data-admission-status]').forEach((select) => {
            select.addEventListener('change', async () => {
                try {
                    await request(`/admission/${select.dataset.admissionStatus}/status`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ status: select.value })
                    });

                    const record = cachedAdmissions.find((item) => item._id === select.dataset.admissionStatus);
                    if (record) {
                        record.status = select.value;
                    }

                    updateAdmissionTableView();
                    showToast('Admission status updated.');
                } catch (error) {
                    showToast(error.message || 'Unable to update admission status.', 'danger');
                }
            });
        });

        qsa('[data-admission-select]').forEach((checkbox) => {
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    selectedAdmissionIds.add(checkbox.dataset.admissionSelect);
                } else {
                    selectedAdmissionIds.delete(checkbox.dataset.admissionSelect);
                }

                updateAdmissionsBulkActions();
            });
        });

        qsa('[data-admission-delete]').forEach((button) => {
            button.addEventListener('click', async () => {
                if (!confirm('Delete this admission record?')) {
                    return;
                }

                try {
                    await request(`/admission/${button.dataset.admissionDelete}`, { method: 'DELETE' });
                    selectedAdmissionIds.delete(button.dataset.admissionDelete);
                    cachedAdmissions = cachedAdmissions.filter((item) => item._id !== button.dataset.admissionDelete);
                    updateAdmissionTableView();
                    showToast('Admission deleted successfully.');
                } catch (error) {
                    showToast(error.message || 'Unable to delete admission.', 'danger');
                }
            });
        });
    };

    const renderAdmissionRows = (admissions) =>
        admissions
            .map(
                (item) => `
                    <tr>
                        <td data-label="Select">
                            <input
                                class="form-check-input"
                                type="checkbox"
                                data-admission-select="${item._id}"
                                ${selectedAdmissionIds.has(item._id) ? 'checked' : ''}
                                aria-label="Select ${escapeHtml(item.studentName)}"
                            >
                        </td>
                        <td data-label="Student">
                            <strong>${escapeHtml(item.studentName)}</strong><br>
                            <small class="text-muted">${escapeHtml(item.parentName)}</small>
                        </td>
                        <td data-label="Class">${escapeHtml(item.className)}</td>
                        <td data-label="Phone">${escapeHtml(item.phone)}</td>
                        <td data-label="Email" class="d-none d-md-table-cell">${escapeHtml(item.email)}</td>
                        <td data-label="Address" class="d-none d-lg-table-cell">${escapeHtml(item.address)}</td>
                        <td data-label="Status">
                            <select class="form-select form-select-sm" data-admission-status="${item._id}">
                                ${['New', 'Reviewed', 'Contacted', 'Closed']
                                    .map(
                                        (status) =>
                                            `<option value="${status}" ${item.status === status ? 'selected' : ''}>${status}</option>`
                                    )
                                    .join('')}
                            </select>
                        </td>
                        <td data-label="Date" class="d-none d-md-table-cell">${new Date(item.createdAt).toLocaleDateString()}</td>
                        <td data-label="Actions" class="text-end">
                            <button class="btn btn-outline-danger btn-sm" data-admission-delete="${item._id}">Delete</button>
                        </td>
                    </tr>
                `
            )
            .join('');

    const updateAdmissionCount = (count) => {
        const counter = qs('#admissionCount');
        if (!counter) {
            return;
        }

        counter.innerHTML = `<i class="bi bi-people-fill"></i> ${count} Application${count === 1 ? '' : 's'}`;
    };

    const updateAdmissionTableView = () => {
        const tableBody = qs('#admissionsTableBody');
        if (!tableBody) {
            return;
        }

        selectedAdmissionIds = new Set(
            [...selectedAdmissionIds].filter((id) => cachedAdmissions.some((item) => item._id === id))
        );

        const filter = qs('#statusFilter')?.value || 'all';
        const filteredAdmissions =
            filter === 'all' ? cachedAdmissions : cachedAdmissions.filter((item) => item.status === filter);

        updateAdmissionCount(filteredAdmissions.length);

        if (!filteredAdmissions.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-5 text-muted">
                        <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                        ${cachedAdmissions.length ? 'No applications match the selected status.' : 'No admission applications found.'}
                    </td>
                </tr>
            `;
            updateAdmissionsBulkActions();
            return;
        }

        tableBody.innerHTML = renderAdmissionRows(filteredAdmissions);
        attachAdmissionEvents();
        updateAdmissionsBulkActions();
    };

    const attachAdmissionsBulkEvents = () => {
        const filter = qs('#statusFilter');
        const selectAll = qs('#selectAllAdmissions');
        const downloadButton = qs('#downloadAdmissionsPdfBtn');
        const sendForm = qs('#sendAdmissionsMailForm');
        const sendModalElement = qs('#sendAdmissionsMailModal');
        const sendTrigger = qs('#sendAdmissionsMailBtn');
        const sendButton = qs('#confirmSendAdmissionsMailBtn');

        if (filter && !filter.dataset.bound) {
            filter.dataset.bound = 'true';
            filter.addEventListener('change', updateAdmissionTableView);
        }

        if (selectAll && !selectAll.dataset.bound) {
            selectAll.dataset.bound = 'true';
            selectAll.addEventListener('change', () => {
                const filterValue = qs('#statusFilter')?.value || 'all';
                const visibleAdmissions =
                    filterValue === 'all'
                        ? cachedAdmissions
                        : cachedAdmissions.filter((item) => item.status === filterValue);

                visibleAdmissions.forEach((item) => {
                    if (selectAll.checked) {
                        selectedAdmissionIds.add(item._id);
                    } else {
                        selectedAdmissionIds.delete(item._id);
                    }
                });

                updateAdmissionTableView();
            });
        }

        if (downloadButton && !downloadButton.dataset.bound) {
            downloadButton.dataset.bound = 'true';
            downloadButton.addEventListener('click', async () => {
                const admissions = getSelectedAdmissions();
                if (!admissions.length) {
                    showToast('Please select at least one admission.', 'danger');
                    return;
                }

                const originalText = downloadButton.innerHTML;
                downloadButton.disabled = true;
                downloadButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Preparing PDF';

                try {
                    const { blob, fileName } = await requestBlob('/admission/selected/pdf', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            admissionIds: admissions.map((item) => item._id)
                        })
                    });

                    const blobUrl = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(blobUrl);
                    showToast('Admissions PDF downloaded successfully.');
                } catch (error) {
                    showToast(error.message || 'Unable to download admissions PDF.', 'danger');
                } finally {
                    downloadButton.disabled = selectedAdmissionIds.size === 0;
                    downloadButton.innerHTML = originalText;
                }
            });
        }

        if (sendTrigger && !sendTrigger.dataset.bound) {
            sendTrigger.dataset.bound = 'true';
            sendTrigger.addEventListener('click', () => {
                const admissions = getSelectedAdmissions();
                if (!admissions.length) {
                    showToast('Please select at least one admission.', 'danger');
                    return;
                }

                const modal = bootstrap.Modal.getOrCreateInstance(sendModalElement);
                modal.show();
            });
        }

        if (sendForm && !sendForm.dataset.bound) {
            sendForm.dataset.bound = 'true';
            sendForm.addEventListener('submit', async (event) => {
                event.preventDefault();

                const admissions = getSelectedAdmissions();
                if (!admissions.length) {
                    showToast('Please select at least one admission.', 'danger');
                    return;
                }

                const recipientEmail = sendForm.recipientEmail.value.trim();
                const originalText = sendButton?.innerHTML;
                if (sendButton) {
                    sendButton.disabled = true;
                    sendButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending';
                }

                try {
                    const result = await request('/admission/selected/email', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            recipientEmail,
                            admissionIds: admissions.map((item) => item._id)
                        })
                    });

                    const reviewedIds = new Set(result.reviewedIds || []);
                    cachedAdmissions = cachedAdmissions.map((item) =>
                        reviewedIds.has(item._id) ? { ...item, status: 'Reviewed' } : item
                    );
                    selectedAdmissionIds = new Set();
                    sendForm.reset();
                    bootstrap.Modal.getOrCreateInstance(sendModalElement).hide();
                    updateAdmissionTableView();
                    showToast(result.message || 'Admissions report sent successfully.');
                } catch (error) {
                    showToast(error.message || 'Unable to send admissions report.', 'danger');
                } finally {
                    if (sendButton) {
                        sendButton.disabled = false;
                        sendButton.innerHTML = originalText;
                    }
                }
            });
        }
    };

    const loadAdmissionsPage = async () => {
        const tableBody = qs('#admissionsTableBody');
        if (!tableBody) {
            return;
        }

        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-5 text-muted">
                    Loading applications...
                </td>
            </tr>
        `;

        attachAdmissionsBulkEvents();

        const { admissions } = await request('/admission');
        cachedAdmissions = admissions;
        updateAdmissionTableView();
    };

    const initSettingsPage = async () => {
        const form = qs('#settingsForm');
        const passwordForm = qs('#passwordForm');
        if (!form) {
            return;
        }

        const { settings } = await request('/settings/admin');

        Object.entries(settings).forEach(([key, value]) => {
            if (form.elements[key]) {
                if (form.elements[key].type === 'checkbox') {
                    form.elements[key].checked = Boolean(value);
                } else {
                    form.elements[key].value = value ?? '';
                }
            }
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const payload = Object.fromEntries(new FormData(form).entries());

            await request('/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            showToast('Settings updated successfully.');
        });

        passwordForm?.addEventListener('submit', async (event) => {
            event.preventDefault();

            const result = await request('/auth/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword: passwordForm.currentPassword.value,
                    newPassword: passwordForm.newPassword.value
                })
            });

            window.Auth?.setSession?.(result.token, result.admin);
            passwordForm.reset();
            showToast('Password updated successfully.');
        });
    };

    const initPage = async () => {
        setActiveNav();
        initMobileSidebar();

        const page = document.body.dataset.adminPage;
        if (!page) {
            return;
        }

        try {
            if (page === 'dashboard') {
                await renderDashboardStats();
            }

            if (page === 'banner') {
                await loadBannersPage();
            }

            if (page === 'faculty') {
                await loadFacultyPage();
            }

            if (page === 'gallery') {
                await loadGalleryPage();
            }

            if (page === 'admissions') {
                await loadAdmissionsPage();
            }

            if (page === 'settings') {
                await initSettingsPage();
            }
        } catch (error) {
            showToast(error.message || 'Unable to load page data.', 'danger');
        }
    };

    return {
        initPage
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    DashboardApp.initPage();
});
