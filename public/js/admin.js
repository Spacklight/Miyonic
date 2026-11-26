(function () {
  const state = {
    csrfToken: '',
    adminEmail: '',
    data: null,
    activeSection: 'overview',
    postsFilterMode: 'all',
    pendingEmail: '',
  };

  const $ = (id) => document.getElementById(id);

  function showToast(message, type = 'success') {
    const el = $('global-toast');
    el.textContent = message;
    el.className = `alert ${type === 'error' ? 'alert-error' : type === 'info' ? 'alert-info' : 'alert-success'}`;
    el.classList.remove('hidden');
    window.clearTimeout(el._timer);
    el._timer = window.setTimeout(() => el.classList.add('hidden'), 4500);
  }

  function showAuthAlert(message) {
    const el = $('auth-alert');
    if (!message) {
      el.classList.add('hidden');
      el.textContent = '';
      return;
    }
    el.textContent = message;
    el.classList.remove('hidden');
  }

  async function apiFetch(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase())) {
      if (state.csrfToken) {
        headers.set('X-CSRF-Token', state.csrfToken);
      }
    }
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'same-origin',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || `Request failed (${res.status})`);
    }
    return json;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function clearChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function makeCell(text, className = '') {
    const td = document.createElement('td');
    if (className) td.className = className;
    td.textContent = text;
    return td;
  }

  async function checkSession() {
    try {
      const session = await apiFetch('/api/admin/session');
      if (!session.configured) {
        $('auth-config-notice').classList.remove('hidden');
      } else {
        $('auth-config-notice').classList.add('hidden');
      }
      if (session.authenticated) {
        state.csrfToken = session.csrfToken;
        state.adminEmail = session.email;
        enterDashboard();
      } else {
        showAuthView();
      }
    } catch {
      showAuthView();
    }
  }

  function showAuthView() {
    $('auth-view').classList.remove('hidden');
    $('dashboard-view').classList.add('hidden');
  }

  async function enterDashboard() {
    $('auth-view').classList.add('hidden');
    $('dashboard-view').classList.remove('hidden');
    $('admin-user-label').textContent = state.adminEmail;
    $('settings-admin-email').textContent = state.adminEmail;
    await loadDashboardData();
    switchSection('overview');
  }

  async function loadDashboardData() {
    const data = await apiFetch('/api/admin/dashboard');
    state.data = data;
    renderDashboard();
  }

  function renderDashboard() {
    const d = state.data;
    if (!d) return;

    $('stat-total-posts').textContent = String(d.stats.totalPosts);
    $('stat-published-posts').textContent = String(d.stats.publishedPosts);
    $('stat-draft-posts').textContent = String(d.stats.draftPosts);
    $('stat-total-products').textContent = String(d.stats.totalProducts);
    $('stat-uploaded-media').textContent = String(d.stats.uploadedMedia);

    const backendLabel =
      d.source === 'smartbase'
        ? 'Connected to SmartBase Cloud Database'
        : 'Local Preview Store (Configure SMARTBASE_* secrets for production SmartBase sync)';
    $('storage-mode-label').textContent = backendLabel;
    $('settings-storage-backend').textContent = backendLabel;

    renderActivityTables(d.recentActivity || []);
    renderPostDropdowns();
    renderPostsTable();
    renderProductsTable();
    renderMediaGrid();
    renderCategoriesTable();
    populateSettingsForms();
  }

  function renderActivityTables(logs) {
    for (const tbodyId of ['overview-activity-tbody', 'full-activity-tbody']) {
      const tbody = $(tbodyId);
      clearChildren(tbody);
      if (!logs.length) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = tbodyId === 'overview-activity-tbody' ? 4 : 5;
        td.textContent = 'No admin activity recorded yet.';
        td.style.color = 'var(--text-muted)';
        tr.appendChild(td);
        tbody.appendChild(tr);
        continue;
      }

      for (const item of logs) {
        const tr = document.createElement('tr');
        tr.appendChild(makeCell(formatDate(item.created_at), 'tabular-nums'));
        if (tbodyId === 'full-activity-tbody') {
          tr.appendChild(makeCell(item.actor_email || 'admin', 'font-mono'));
        }
        tr.appendChild(makeCell(item.action || '—'));
        tr.appendChild(makeCell(item.entity_type || '—'));
        tr.appendChild(makeCell(item.details || '—'));
        tbody.appendChild(tr);
      }
    }
  }

  function renderPostDropdowns() {
    const catSelect = $('post-category');
    const prodSelect = $('post-product-slug');
    const prevCat = catSelect.value;
    const prevProd = prodSelect.value;

    clearChildren(catSelect);
    for (const c of state.data.categories || []) {
      const opt = document.createElement('option');
      opt.value = c.slug;
      opt.textContent = c.name;
      catSelect.appendChild(opt);
    }
    if (prevCat) catSelect.value = prevCat;

    clearChildren(prodSelect);
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = 'None';
    prodSelect.appendChild(noneOpt);
    for (const p of state.data.products || []) {
      const opt = document.createElement('option');
      opt.value = p.slug;
      opt.textContent = p.name;
      prodSelect.appendChild(opt);
    }
    if (prevProd) prodSelect.value = prevProd;
  }

  function renderPostsTable() {
    const tbody = $('posts-table-tbody');
    clearChildren(tbody);
    const q = ($('posts-search-input').value || '').toLowerCase().trim();
    const posts = (state.data.posts || []).filter((p) => {
      if (state.postsFilterMode === 'drafts' && p.status !== 'draft') return false;
      if (state.postsFilterMode === 'published' && p.status !== 'published') return false;
      if (q && !p.title.toLowerCase().includes(q) && !p.slug.toLowerCase().includes(q)) return false;
      return true;
    });

    if (!posts.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.textContent = 'No posts found in this view.';
      td.style.color = 'var(--text-muted)';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    for (const post of posts) {
      const tr = document.createElement('tr');
      tr.appendChild(makeCell(post.title));
      tr.appendChild(makeCell(post.content_type || '—'));
      tr.appendChild(makeCell(post.product_slug || '—'));

      const statusTd = document.createElement('td');
      statusTd.textContent = post.status === 'published' ? 'Published' : 'Draft';
      statusTd.className = post.status === 'published' ? 'status-text-published' : 'status-text-draft';
      tr.appendChild(statusTd);

      tr.appendChild(makeCell(formatDate(post.updated_at), 'tabular-nums'));

      const actionsTd = document.createElement('td');
      actionsTd.style.display = 'flex';
      actionsTd.style.gap = '6px';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-secondary btn-sm';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => loadPostIntoEditor(post));
      actionsTd.appendChild(editBtn);

      if (post.status === 'published') {
        const viewLink = document.createElement('a');
        viewLink.href = `/news/${encodeURIComponent(post.slug)}/`;
        viewLink.target = '_blank';
        viewLink.rel = 'noopener noreferrer';
        viewLink.className = 'btn btn-secondary btn-sm';
        viewLink.textContent = 'View';
        actionsTd.appendChild(viewLink);
      }

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-danger btn-sm';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', async () => {
        try {
          await apiFetch(`/api/admin/posts/${encodeURIComponent(post.id)}`, { method: 'DELETE' });
          showToast(`Deleted "${post.title}".`);
          await loadDashboardData();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
      actionsTd.appendChild(delBtn);

      tr.appendChild(actionsTd);
      tbody.appendChild(tr);
    }
  }

  function loadPostIntoEditor(post) {
    $('post-id').value = String(post.id);
    $('post-title').value = post.title || '';
    $('post-slug').value = post.slug || '';
    $('post-type').value = post.content_type || 'Company announcements';
    $('post-category').value = post.category_slug || '';
    $('post-excerpt').value = post.excerpt || '';
    $('post-editor').innerHTML = post.content_html || '';
    $('post-cover-image').value = post.cover_image || '';
    $('post-youtube-url').value = post.youtube_url || '';
    $('post-product-slug').value = post.product_slug || '';
    $('post-product-url').value = post.product_url || '';
    $('post-gallery-urls').value = (post.gallery_images || []).join('\n');
    $('post-external-urls').value = (post.external_urls || []).join('\n');
    $('post-tags').value = (post.tags || []).join(', ');
    $('post-author').value = post.author_name || 'Roosevelt Chikwende';
    $('post-seo-title').value = post.seo_title || '';
    $('post-seo-desc').value = post.seo_description || '';
    $('post-canonical').value = post.canonical_url || '';
    $('post-social-image').value = post.social_image || '';
    $('post-featured').checked = Boolean(post.is_featured);
    $('post-editor-heading').textContent = `Editing: ${post.title}`;
    switchSection('create-post');
  }

  function resetPostForm() {
    $('post-form').reset();
    $('post-id').value = '';
    $('post-editor').innerHTML = '';
    $('post-author').value = 'Roosevelt Chikwende';
    $('post-editor-heading').textContent = 'Create New Article or Announcement';
    $('post-preview-panel').classList.add('hidden');
  }

  async function savePost(status) {
    const id = $('post-id').value.trim();
    const payload = {
      title: $('post-title').value.trim(),
      slug: $('post-slug').value.trim(),
      content_type: $('post-type').value,
      category_slug: $('post-category').value,
      excerpt: $('post-excerpt').value.trim(),
      content_html: $('post-editor').innerHTML,
      cover_image: $('post-cover-image').value.trim(),
      youtube_url: $('post-youtube-url').value.trim(),
      product_slug: $('post-product-slug').value,
      product_url: $('post-product-url').value.trim(),
      gallery_images: $('post-gallery-urls')
        .value.split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      external_urls: $('post-external-urls')
        .value.split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      tags: $('post-tags')
        .value.split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      author_name: $('post-author').value.trim() || 'Roosevelt Chikwende',
      seo_title: $('post-seo-title').value.trim(),
      seo_description: $('post-seo-desc').value.trim(),
      canonical_url: $('post-canonical').value.trim(),
      social_image: $('post-social-image').value.trim(),
      is_featured: $('post-featured').checked,
      status,
    };

    try {
      const url = id ? `/api/admin/posts/${encodeURIComponent(id)}` : '/api/admin/posts';
      const method = id ? 'PUT' : 'POST';
      const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
      showToast(status === 'published' ? `Published "${res.post.title}".` : `Saved draft "${res.post.title}".`);
      resetPostForm();
      await loadDashboardData();
      switchSection(status === 'published' ? 'published' : 'drafts');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function renderProductsTable() {
    const tbody = $('products-table-tbody');
    clearChildren(tbody);
    const products = state.data.products || [];
    for (const p of products) {
      const tr = document.createElement('tr');
      tr.appendChild(makeCell(p.name));
      tr.appendChild(makeCell(p.slug, 'font-mono'));
      tr.appendChild(makeCell(p.status_label));
      tr.appendChild(makeCell(p.website_url || '—'));

      const td = document.createElement('td');
      td.style.display = 'flex';
      td.style.gap = '6px';
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-secondary btn-sm';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => loadProductIntoForm(p));
      td.appendChild(editBtn);

      const viewLink = document.createElement('a');
      viewLink.href = `/products/${encodeURIComponent(p.slug)}/`;
      viewLink.target = '_blank';
      viewLink.rel = 'noopener noreferrer';
      viewLink.className = 'btn btn-secondary btn-sm';
      viewLink.textContent = 'View';
      td.appendChild(viewLink);

      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    if (products.length && !$('prod-id').value) {
      loadProductIntoForm(products[0]);
    }
  }

  function loadProductIntoForm(p) {
    $('prod-id').value = p ? String(p.id) : '';
    $('prod-name').value = p?.name || '';
    $('prod-slug').value = p?.slug || '';
    $('prod-tagline').value = p?.tagline || '';
    $('prod-website').value = p?.website_url || '';
    $('prod-category-label').value = p?.category_label || '';
    $('prod-status-label').value = p?.status_label || '';
    $('prod-summary').value = p?.summary || '';
    $('prod-description').value = p?.description || '';
    $('prod-features').value = (p?.features || []).join('\n');
    $('prod-screenshots').value = (p?.screenshots || []).join('\n');
    $('prod-seo-title').value = p?.seo_title || '';
    $('prod-seo-desc').value = p?.seo_description || '';
    $('product-form-heading').textContent = p ? `Edit Product: ${p.name}` : 'Create New Product';
  }

  function renderMediaGrid() {
    const grid = $('media-library-grid');
    clearChildren(grid);
    const media = state.data.media || [];
    if (!media.length) {
      const p = document.createElement('p');
      p.textContent = 'No media uploaded yet.';
      p.style.color = 'var(--text-muted)';
      grid.appendChild(p);
      return;
    }

    for (const item of media) {
      const card = document.createElement('div');
      card.className = 'media-card';

      const imgWrap = document.createElement('div');
      imgWrap.className = 'media-card-img';
      const img = document.createElement('img');
      img.src = item.public_url;
      img.alt = item.alt_text || item.original_name;
      img.loading = 'lazy';
      imgWrap.appendChild(img);
      card.appendChild(imgWrap);

      const meta = document.createElement('div');
      meta.className = 'media-card-meta';
      const nameDiv = document.createElement('div');
      nameDiv.textContent = item.original_name || item.file_name;
      nameDiv.style.fontWeight = '600';
      nameDiv.style.overflow = 'hidden';
      nameDiv.style.textOverflow = 'ellipsis';
      meta.appendChild(nameDiv);

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '6px';

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn btn-secondary btn-sm';
      copyBtn.textContent = 'Copy URL';
      copyBtn.addEventListener('click', () => {
        navigator.clipboard?.writeText(item.public_url);
        showToast(`Copied URL: ${item.public_url}`);
      });
      actions.appendChild(copyBtn);

      if (item.uploaded_by !== 'system') {
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'btn btn-danger btn-sm';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', async () => {
          try {
            await apiFetch(`/api/admin/media/${encodeURIComponent(item.file_name)}`, {
              method: 'DELETE',
            });
            showToast(`Deleted ${item.original_name}`);
            await loadDashboardData();
          } catch (err) {
            showToast(err.message, 'error');
          }
        });
        actions.appendChild(delBtn);
      }

      meta.appendChild(actions);
      card.appendChild(meta);
      grid.appendChild(card);
    }
  }

  function renderCategoriesTable() {
    const tbody = $('categories-table-tbody');
    clearChildren(tbody);
    for (const cat of state.data.categories || []) {
      const tr = document.createElement('tr');
      tr.appendChild(makeCell(cat.name));
      tr.appendChild(makeCell(cat.slug, 'font-mono'));
      tr.appendChild(makeCell(cat.description || '—'));

      const td = document.createElement('td');
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-danger btn-sm';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', async () => {
        try {
          await apiFetch(`/api/admin/categories/${encodeURIComponent(cat.id)}`, { method: 'DELETE' });
          showToast(`Deleted category "${cat.name}".`);
          await loadDashboardData();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
      td.appendChild(delBtn);
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
  }

  function populateSettingsForms() {
    const settings = state.data.settings || {};
    const comp = settings.company_info || {};
    $('comp-brand').value = comp.brandName || 'MIYONI';
    $('comp-tagline').value = comp.tagline || '';
    $('comp-country').value = comp.country || 'Malawi';
    $('comp-email').value = comp.contactEmail || '';
    $('comp-overview').value = comp.overview || '';
    $('comp-mission').value = comp.mission || '';
    $('comp-vision').value = comp.vision || '';
    $('comp-focus').value = (comp.focusAreas || []).join('\n');

    const fnd = settings.founder_info || {};
    $('fnd-name').value = fnd.name || 'Roosevelt Chikwende';
    $('fnd-role').value = fnd.role || '';
    $('fnd-intro').value = fnd.introduction || '';
    $('fnd-bio').value = fnd.biography || '';
    $('fnd-vision').value = fnd.vision || '';
    $('fnd-philosophy').value = fnd.philosophy || '';
    $('fnd-origin').value = fnd.originStory || '';

    const seo = settings.seo_settings || {};
    $('seo-site-title').value = seo.siteTitle || '';
    $('seo-default-desc').value = seo.defaultDescription || '';
    $('seo-gsc').value = seo.googleSiteVerification || '';
    $('seo-social-image').value = seo.socialImage || '';

    renderMilestonesList(settings.company_history || []);
  }

  function renderMilestonesList(items) {
    const wrap = $('milestones-list');
    clearChildren(wrap);
    items.forEach((item, index) => {
      const box = document.createElement('div');
      box.className = 'panel';
      box.style.marginBottom = '10px';
      box.dataset.milestone = '1';

      const grid = document.createElement('div');
      grid.className = 'form-grid form-grid-2';

      const periodField = document.createElement('div');
      periodField.className = 'field';
      const pLabel = document.createElement('label');
      pLabel.textContent = 'Date / Milestone Label';
      const pInput = document.createElement('input');
      pInput.type = 'text';
      pInput.className = 'input milestone-period';
      pInput.value = item.period || '';
      periodField.append(pLabel, pInput);

      const titleField = document.createElement('div');
      titleField.className = 'field';
      const tLabel = document.createElement('label');
      tLabel.textContent = 'Milestone Title';
      const tInput = document.createElement('input');
      tInput.type = 'text';
      tInput.className = 'input milestone-title';
      tInput.value = item.title || '';
      titleField.append(tLabel, tInput);

      grid.append(periodField, titleField);

      const descField = document.createElement('div');
      descField.className = 'field';
      descField.style.marginTop = '10px';
      const dLabel = document.createElement('label');
      dLabel.textContent = 'Description';
      const dInput = document.createElement('textarea');
      dInput.className = 'textarea milestone-desc';
      dInput.style.minHeight = '70px';
      dInput.value = item.description || '';
      descField.append(dLabel, dInput);

      const rmBtn = document.createElement('button');
      rmBtn.type = 'button';
      rmBtn.className = 'btn btn-danger btn-sm';
      rmBtn.style.marginTop = '10px';
      rmBtn.textContent = `Remove Milestone #${index + 1}`;
      rmBtn.addEventListener('click', () => box.remove());

      box.append(grid, descField, rmBtn);
      wrap.appendChild(box);
    });
  }

  function switchSection(section) {
    state.activeSection = section;
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.section === section);
    });
    document.querySelectorAll('.admin-section').forEach((el) => el.classList.add('hidden'));

    const labels = {
      overview: 'Dashboard / Overview',
      'create-post': 'Editorial / Post Editor',
      'manage-posts': 'Editorial / All Posts',
      drafts: 'Editorial / Drafts',
      published: 'Editorial / Published Articles',
      products: 'Ecosystem / Products Management',
      media: 'Assets / Media Library',
      company: 'Brand / Company Information & History',
      founder: 'Brand / Founder Profile',
      categories: 'Taxonomy / Categories',
      seo: 'Discovery / SEO Management',
      activity: 'Security / Activity Logs',
      settings: 'System / Settings',
    };
    $('topbar-title').textContent = labels[section] || 'MIYONI Admin';

    if (section === 'manage-posts' || section === 'drafts' || section === 'published') {
      state.postsFilterMode =
        section === 'drafts' ? 'drafts' : section === 'published' ? 'published' : 'all';
      $('posts-list-title').textContent =
        section === 'drafts'
          ? 'Draft Posts'
          : section === 'published'
          ? 'Published Articles'
          : 'All Posts';
      $('sec-posts-list').classList.remove('hidden');
      renderPostsTable();
    } else {
      const target = $(`sec-${section}`);
      if (target) target.classList.remove('hidden');
    }
  }

  async function uploadSingleFile(file, altText = '', caption = '') {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('alt_text', altText || file.name);
    fd.append('caption', caption || '');
    return apiFetch('/api/admin/media', { method: 'POST', body: fd });
  }

  // Event Wiring
  $('email-step-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showAuthAlert('');
    const email = $('admin-email-input').value.trim();
    const btn = $('send-code-btn');
    btn.disabled = true;
    try {
      await apiFetch('/api/admin/send-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      state.pendingEmail = email;
      $('pending-email-label').textContent = email;
      $('email-step-form').classList.add('hidden');
      $('code-step-form').classList.remove('hidden');
      $('verification-code-input').focus();
    } catch (err) {
      showAuthAlert(err.message);
    } finally {
      btn.disabled = false;
    }
  });

  $('code-step-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showAuthAlert('');
    const code = $('verification-code-input').value.trim();
    const btn = $('verify-code-btn');
    btn.disabled = true;
    try {
      const res = await apiFetch('/api/admin/verify-code', {
        method: 'POST',
        body: JSON.stringify({ email: state.pendingEmail, code }),
      });
      state.csrfToken = res.csrfToken;
      state.adminEmail = res.email;
      await enterDashboard();
    } catch (err) {
      showAuthAlert(err.message);
    } finally {
      btn.disabled = false;
    }
  });

  $('back-to-email-btn').addEventListener('click', () => {
    showAuthAlert('');
    $('code-step-form').classList.add('hidden');
    $('email-step-form').classList.remove('hidden');
  });

  $('logout-btn').addEventListener('click', async () => {
    try {
      await apiFetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    state.csrfToken = '';
    state.adminEmail = '';
    showAuthView();
  });

  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });

  $('quick-new-post-btn').addEventListener('click', () => {
    resetPostForm();
    switchSection('create-post');
  });

  $('refresh-dashboard-btn').addEventListener('click', async () => {
    try {
      await loadDashboardData();
      showToast('Dashboard synced.');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Rich Editor Toolbar
  document.querySelectorAll('.editor-toolbar [data-cmd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      $('post-editor').focus();
      document.execCommand(btn.dataset.cmd, false, btn.dataset.val || null);
    });
  });

  $('insert-link-btn').addEventListener('click', () => {
    const url = window.prompt('Enter HTTPS URL:');
    if (url && (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('/'))) {
      $('post-editor').focus();
      document.execCommand('createLink', false, url);
    }
  });

  $('insert-image-btn').addEventListener('click', () => {
    const url = window.prompt('Enter image URL (e.g. /media/... or /assets/...):');
    if (url && (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('/'))) {
      $('post-editor').focus();
      document.execCommand('insertImage', false, url);
    }
  });

  $('cover-upload-input').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadSingleFile(file, $('post-title').value || file.name);
      $('post-cover-image').value = res.media.public_url;
      showToast('Cover image uploaded.');
      await loadDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  $('gallery-upload-input').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      const urls = [];
      for (const f of files) {
        const res = await uploadSingleFile(f, $('post-title').value || f.name);
        urls.push(res.media.public_url);
      }
      const existing = $('post-gallery-urls').value.trim();
      $('post-gallery-urls').value = (existing ? existing + '\n' : '') + urls.join('\n');
      showToast(`Uploaded ${urls.length} gallery image(s).`);
      await loadDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  $('preview-post-btn').addEventListener('click', () => {
    const preview = $('post-preview-body');
    clearChildren(preview);
    const h = document.createElement('h2');
    h.textContent = $('post-title').value || 'Untitled Article';
    const ex = document.createElement('p');
    ex.textContent = $('post-excerpt').value;
    ex.style.fontWeight = '600';
    const bodyDiv = document.createElement('div');
    bodyDiv.innerHTML = $('post-editor').innerHTML;
    preview.append(h, ex, bodyDiv);
    $('post-preview-panel').classList.remove('hidden');
  });

  $('close-preview-btn').addEventListener('click', () => {
    $('post-preview-panel').classList.add('hidden');
  });

  $('reset-post-form-btn').addEventListener('click', resetPostForm);
  $('save-draft-btn').addEventListener('click', () => savePost('draft'));
  $('publish-post-btn').addEventListener('click', () => savePost('published'));
  $('posts-search-input').addEventListener('input', renderPostsTable);

  $('new-product-btn').addEventListener('click', () => loadProductIntoForm(null));

  $('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('prod-id').value.trim();
    const payload = {
      name: $('prod-name').value.trim(),
      slug: $('prod-slug').value.trim(),
      tagline: $('prod-tagline').value.trim(),
      website_url: $('prod-website').value.trim(),
      category_label: $('prod-category-label').value.trim(),
      status_label: $('prod-status-label').value.trim(),
      summary: $('prod-summary').value.trim(),
      description: $('prod-description').value.trim(),
      features: $('prod-features')
        .value.split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      screenshots: $('prod-screenshots')
        .value.split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      seo_title: $('prod-seo-title').value.trim(),
      seo_description: $('prod-seo-desc').value.trim(),
      is_featured: 1,
    };
    try {
      const url = id ? `/api/admin/products/${encodeURIComponent(id)}` : '/api/admin/products';
      const method = id ? 'PUT' : 'POST';
      await apiFetch(url, { method, body: JSON.stringify(payload) });
      showToast(`Saved product "${payload.name}".`);
      await loadDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  $('media-upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = $('media-file-input').files?.[0];
    if (!file) return;
    try {
      await uploadSingleFile(file, $('media-alt-input').value.trim(), $('media-caption-input').value.trim());
      $('media-upload-form').reset();
      showToast('Image uploaded to SmartBase storage.');
      await loadDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  $('company-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = {
      ...(state.data.settings.company_info || {}),
      brandName: $('comp-brand').value.trim(),
      tagline: $('comp-tagline').value.trim(),
      country: $('comp-country').value.trim(),
      contactEmail: $('comp-email').value.trim(),
      overview: $('comp-overview').value.trim(),
      mission: $('comp-mission').value.trim(),
      vision: $('comp-vision').value.trim(),
      focusAreas: $('comp-focus')
        .value.split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ key: 'company_info', value }),
      });
      showToast('Company information updated.');
      await loadDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  $('add-milestone-btn').addEventListener('click', () => {
    const current = collectMilestonesFromDom();
    current.push({ id: `m-${Date.now()}`, period: '', title: '', description: '' });
    renderMilestonesList(current);
  });

  function collectMilestonesFromDom() {
    return Array.from(document.querySelectorAll('#milestones-list [data-milestone]')).map(
      (box, i) => ({
        id: `milestone-${i + 1}`,
        period: box.querySelector('.milestone-period').value.trim(),
        title: box.querySelector('.milestone-title').value.trim(),
        description: box.querySelector('.milestone-desc').value.trim(),
      })
    );
  }

  $('save-history-btn').addEventListener('click', async () => {
    const items = collectMilestonesFromDom().filter((m) => m.title || m.description);
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ key: 'company_history', value: items }),
      });
      showToast('Company history timeline saved.');
      await loadDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  $('founder-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = {
      ...(state.data.settings.founder_info || {}),
      name: $('fnd-name').value.trim(),
      role: $('fnd-role').value.trim(),
      introduction: $('fnd-intro').value.trim(),
      biography: $('fnd-bio').value.trim(),
      vision: $('fnd-vision').value.trim(),
      philosophy: $('fnd-philosophy').value.trim(),
      originStory: $('fnd-origin').value.trim(),
    };
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ key: 'founder_info', value }),
      });
      showToast('Founder information updated.');
      await loadDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  $('category-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: $('cat-name').value.trim(),
          description: $('cat-desc').value.trim(),
        }),
      });
      $('category-form').reset();
      showToast('Category created.');
      await loadDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  $('seo-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = {
      siteTitle: $('seo-site-title').value.trim(),
      defaultDescription: $('seo-default-desc').value.trim(),
      googleSiteVerification: $('seo-gsc').value.trim(),
      socialImage: $('seo-social-image').value.trim(),
    };
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ key: 'seo_settings', value }),
      });
      showToast('SEO settings updated.');
      await loadDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  checkSession();
})();
