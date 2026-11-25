 
    let allWebsites = [];
    let adminToken = localStorage.getItem('adminToken') || '';
    let barChartInstance = null;
    let doughnutChartInstance = null;

    function openModal(id) {
      document.getElementById(id).classList.remove('hidden');
    }

    function closeModal(id) {
      document.getElementById(id).classList.add('hidden');
    }

    function animateCounter(elId, targetValue) {
      const el = document.getElementById(elId);
      if (!el) return;
      const startValue = Number(el.textContent) || 0;
      const duration = 650;
      const startTime = performance.now();

      function update(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(startValue + (targetValue - startValue) * eased);
        if (progress < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
    }

    function updateAdminAnalytics(list) {
      const section = document.getElementById('adminAnalyticsSection');
      if (!adminToken) {
        section.classList.add('hidden');
        return;
      }
      section.classList.remove('hidden');

      const totalSites = list.length;
      const uniqueCreators = [...new Set(list.map(i => (i.name || 'Unknown').trim()))];
      const withContact = list.filter(i => i.contact && i.contact.trim() !== '').length;

      animateCounter('statTotalSites', totalSites);
      animateCounter('statCreators', uniqueCreators.length);
      animateCounter('statContacts', withContact);

      const creatorCounts = uniqueCreators.map(creator =>
        list.filter(item => (item.name || 'Unknown').trim() === creator).length
      );

      const barCtx = document.getElementById('creatorBarChart').getContext('2d');
      if (barChartInstance) barChartInstance.destroy();
      barChartInstance = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: uniqueCreators.length ? uniqueCreators : ['No Data'],
          datasets: [{
            label: 'Websites Added',
            data: creatorCounts.length ? creatorCounts : [0],
            backgroundColor: [
              'rgba(34, 211, 238, 0.75)',
              'rgba(168, 85, 247, 0.75)',
              'rgba(52, 211, 153, 0.75)',
              'rgba(251, 191, 36, 0.75)'
            ],
            borderColor: '#22d3ee',
            borderWidth: 1,
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 900,
            easing: 'easeOutQuart'
          },
          plugins: {
            legend: { labels: { color: '#cbd5e1' } }
          },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.08)' } },
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1, color: '#94a3b8' },
              grid: { color: 'rgba(148,163,184,0.08)' }
            }
          }
        }
      });

      const doughnutCtx = document.getElementById('entriesDoughnutChart').getContext('2d');
      if (doughnutChartInstance) doughnutChartInstance.destroy();
      doughnutChartInstance = new Chart(doughnutCtx, {
        type: 'doughnut',
        data: {
          labels: ['With Contact', 'Without Contact'],
          datasets: [{
            data: totalSites ? [withContact, totalSites - withContact] : [0, 1],
            backgroundColor: [
              'rgba(34, 211, 238, 0.8)',
              'rgba(168, 85, 247, 0.45)'
            ],
            borderColor: '#0f172a',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            animateRotate: true,
            animateScale: true,
            duration: 950
          },
          plugins: {
            legend: { position: 'bottom', labels: { color: '#cbd5e1' } }
          }
        }
      });
    }

    function renderNavbar() {
      const nav = document.getElementById('navActions');
      if (adminToken) {
        nav.innerHTML = `
          <span class="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            Admin Active
          </span>
          <button onclick="openModal('addModal')"
            class="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-md hover:opacity-90 transition">
            + Add Website
          </button>
          <button onclick="logout()"
            class="px-3.5 py-2 rounded-xl text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition">
            Logout
          </button>
        `;
      } else {
        nav.innerHTML = `
          <button onclick="openModal('loginModal')"
            class="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800/90 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 transition">
            Admin Login
          </button>
        `;
      }
    }

    async function fetchWebsites() {
      try {
        const res = await fetch('/api/websites');
        const result = await res.json();
        if (result.success) {
          allWebsites = result.data;
          renderProjects(allWebsites);
          updateAdminAnalytics(allWebsites);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      }
    }

    function renderProjects(list) {
      const grid = document.getElementById('projectsGrid');
      const empty = document.getElementById('emptyState');

      if (!list.length) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
        return;
      }
      empty.classList.add('hidden');

      grid.innerHTML = list.map((item, idx) => `
        <div style="animation-delay: ${Math.min(idx * 60, 360)}ms"
          class="glass neon-border animate-card rounded-2xl p-6 flex flex-col justify-between transition duration-300">
          <div>
            <div class="flex items-start justify-between gap-2 mb-3">
              <span class="px-2.5 py-1 text-xs font-medium rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                ${escapeHtml(item.name)}
              </span>
              ${adminToken ? `
                <button onclick="deleteWebsite(${item.id})" class="text-xs text-rose-400 hover:text-rose-300">
                  Delete
                </button>` : ''}
            </div>

            <h3 class="text-xl font-bold text-white mb-2">
              ${escapeHtml(item.website_name)}
            </h3>

            <p class="text-sm text-slate-400 leading-relaxed mb-4">
              ${escapeHtml(item.description || 'No description provided.')}
            </p>
          </div>

          <div class="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <span class="text-xs text-slate-400 truncate">
              ${item.contact ? 'Contact: ' + escapeHtml(item.contact) : ''}
            </span>
            <a href="${escapeHtml(item.website_link)}" target="_blank" rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition shrink-0">
              Visit Live &nearr;
            </a>
          </div>
        </div>
      `).join('');
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('adminPasswordInput').value;
      const errEl = document.getElementById('loginError');
      errEl.classList.add('hidden');

      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();

      if (data.success) {
        adminToken = data.token;
        localStorage.setItem('adminToken', adminToken);
        document.getElementById('adminPasswordInput').value = '';
        closeModal('loginModal');
        renderNavbar();
        renderProjects(allWebsites);
        updateAdminAnalytics(allWebsites);
      } else {
        errEl.textContent = data.message || 'Invalid password';
        errEl.classList.remove('hidden');
      }
    });

    document.getElementById('addWebsiteForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('name').value.trim(),
        website_name: document.getElementById('website_name').value.trim(),
        website_link: document.getElementById('website_link').value.trim(),
        description: document.getElementById('description').value.trim(),
        contact: document.getElementById('contact').value.trim()
      };

      const res = await fetch('/api/websites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        document.getElementById('addWebsiteForm').reset();
        closeModal('addModal');
        fetchWebsites();
      } else {
        alert(data.message || 'Error saving website');
      }
    });

    async function deleteWebsite(id) {
      if (!confirm('Kya aap is website ko delete karna chahte hain?')) return;
      const res = await fetch(`/api/websites/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (data.success) fetchWebsites();
    }

    function logout() {
      adminToken = '';
      localStorage.removeItem('adminToken');
      if (barChartInstance) barChartInstance.destroy();
      if (doughnutChartInstance) doughnutChartInstance.destroy();
      renderNavbar();
      updateAdminAnalytics(allWebsites);
      renderProjects(allWebsites);
    }

    document.getElementById('searchInput').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = allWebsites.filter(item =>
        (item.website_name || '').toLowerCase().includes(q) ||
        (item.name || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q)
      );
      renderProjects(filtered);
    });

    renderNavbar();
    fetchWebsites();

//Contact information send
 document.getElementById('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const statusEl = document.getElementById('contactStatus');
  statusEl.classList.remove('hidden');
  statusEl.textContent = 'Sending...';

  const res = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      senderName: document.getElementById('senderName').value.trim(),
      senderEmail: document.getElementById('senderEmail').value.trim(),
      senderMessage: document.getElementById('senderMessage').value.trim(),
      senderPhone: document.getElementById('senderPhone').value.trim()
    })
  });

  const data = await res.json();
  statusEl.textContent = data.message || 'Done';
  if (data.success) e.target.reset();
});
