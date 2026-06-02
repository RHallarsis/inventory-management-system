// ── USER ACCOUNTS (ua.js v3) ─────────────────────────────────
(function () {
  'use strict';

  async function loadUsers() {
    const list = document.getElementById('users-list');
    const countLabel = document.getElementById('ua-count-label');
    if (!list) return;
    list.innerHTML = '<div style="text-align:center;color:var(--text-2);padding:24px;font-size:13px">Loading…</div>';
    try {
      const res = await fetch('/api/users');
      const text = await res.text();
      if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + text);
      const users = JSON.parse(text);
      if (!Array.isArray(users) || !users.length) {
        list.innerHTML = '<div style="text-align:center;color:var(--text-2);padding:24px;font-size:13px">No accounts found.</div>';
        if (countLabel) countLabel.textContent = '';
        return;
      }
      const active = users.filter(function(u){ return u.status === 'Active'; }).length;
      if (countLabel) countLabel.textContent = users.length + ' account' + (users.length !== 1 ? 's' : '') + ' · ' + active + ' active';
      const roleColors = { Admin: '#6366f1', Manager: '#0ea5e9', Staff: '#64748b', Viewer: '#10b981' };
      const avatarColors = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
      var html = '';
      users.forEach(function(u, i) {
        var words = u.name.split(' ').filter(Boolean);
        var initials = words.map(function(w){ return w[0]; }).join('').toUpperCase().slice(0, 2) || '?';
        var avatarColor = avatarColors[i % avatarColors.length];
        var roleColor = roleColors[u.role] || '#64748b';
        var isActive = u.status === 'Active';
        var escaped = JSON.stringify(u).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        html += '<div class="ua-row">';
        html += '<div class="ua-avatar" style="background:' + avatarColor + '">' + initials + '</div>';
        html += '<div class="ua-info">';
        html += '<div class="ua-name">' + u.name + '</div>';
        html += '<div class="ua-email">' + u.email + '</div>';
        html += '</div>';
        html += '<div class="ua-badges">';
        html += '<span class="ua-badge-role" style="background:' + roleColor + '1a;color:' + roleColor + '">' + u.role + '</span>';
        html += '<span class="ua-badge-status" style="background:' + (isActive ? '#10b9811a' : '#ef44441a') + ';color:' + (isActive ? '#10b981' : '#ef4444') + '">' + (isActive ? '&#9679; Active' : '&#9675; Inactive') + '</span>';
        html += '</div>';
        html += '<div class="ua-actions">';
        html += '<button class="ua-btn ua-btn-edit" onclick="openUserModal(\'' + escaped + '\')">&#9998; Edit</button>';
        html += '<button class="ua-btn ua-btn-del" onclick="deleteUser(' + u.id + ',\'' + u.name.replace(/'/g, "\\'") + '\')">&#10005; Delete</button>';
        html += '</div>';
        html += '</div>';
      });
      list.innerHTML = html;
    } catch (e) {
      console.error('[loadUsers] error:', e);
      list.innerHTML = '<div style="text-align:center;color:var(--danger);padding:24px;font-size:13px">Error: ' + e.message + '</div>';
    }
  }

  function openUserModal(userArg) {
    var user = null;
    if (userArg) {
      try { user = typeof userArg === 'string' ? JSON.parse(userArg) : userArg; } catch(e) { user = null; }
    }
    var isEdit = !!user;
    document.getElementById('user-modal-title').textContent = isEdit ? 'Edit User' : 'Add User';
    document.getElementById('u-id').value = isEdit ? user.id : '';
    document.getElementById('u-name').value = isEdit ? user.name : '';
    document.getElementById('u-email').value = isEdit ? user.email : '';
    document.getElementById('u-role').value = isEdit ? user.role : 'Staff';
    document.getElementById('u-status').value = isEdit ? user.status : 'Active';
    document.getElementById('u-password').value = '';
    document.getElementById('u-pass-label').innerHTML = isEdit ? 'New Password' : 'Password <span style="color:var(--danger)">*</span>';
    document.getElementById('u-pass-hint').style.display = isEdit ? 'block' : 'none';
    document.getElementById('user-modal').style.display = 'flex';
  }

  function closeUserModal() {
    document.getElementById('user-modal').style.display = 'none';
  }

  async function saveUser() {
    var id = document.getElementById('u-id').value;
    var name = document.getElementById('u-name').value.trim();
    var email = document.getElementById('u-email').value.trim();
    var role = document.getElementById('u-role').value;
    var status = document.getElementById('u-status').value;
    var password = document.getElementById('u-password').value.trim();
    if (!name || !email) { window.gToast && gToast('Name and email are required.', 'error'); return; }
    if (!id && !password) { window.gToast && gToast('Password is required for new users.', 'error'); return; }
    try {
      var url = id ? '/api/users/' + id : '/api/users';
      var method = id ? 'PUT' : 'POST';
      var body = { name: name, email: email, role: role, status: status };
      if (password) body.password = password;
      var res = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      var data = await res.json();
      if (!res.ok) { window.gToast && gToast(data.error || 'Failed to save.', 'error'); return; }
      window.gToast && gToast(id ? 'User updated!' : 'User added!');
      closeUserModal();
      loadUsers();
    } catch (e) { window.gToast && gToast('Server error.', 'error'); }
  }

  async function deleteUser(id, name) {
    if (!confirm('Delete user "' + name + '"? This cannot be undone.')) return;
    try {
      var res = await fetch('/api/users/' + id, { method: 'DELETE' });
      var data = await res.json();
      if (!res.ok) { window.gToast && gToast(data.error || 'Failed to delete.', 'error'); return; }
      window.gToast && gToast('"' + name + '" deleted.');
      loadUsers();
    } catch (e) { window.gToast && gToast('Server error.', 'error'); }
  }

  // Expose to global scope
  window.loadUsers = loadUsers;
  window.openUserModal = openUserModal;
  window.closeUserModal = closeUserModal;
  window.saveUser = saveUser;
  window.deleteUser = deleteUser;
})();
