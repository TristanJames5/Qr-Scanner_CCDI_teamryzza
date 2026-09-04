import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { RoleBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Users, UserPlus, Trash2, Search, ArrowLeft, Edit } from 'lucide-react';

export const ManageUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const initialForm = { name: '', id_number: '', email: '', password: '', role: 'student', department: 'College of Information & Communications Technology' };
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      setUsers(res.data.users || []);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openModal = (user = null) => {
    setSelectedUser(user);
    setFormData(user ? { ...user, password: '' } : initialForm);
    setFormError('');
    setShowModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (selectedUser) {
        // Edit User
        const payload = { ...formData };
        if (!payload.password) delete payload.password;
        await api.put(`/admin/users/${selectedUser.id}`, payload);
      } else {
        // Create User
        await api.post('/admin/users', formData);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) { setFormError(err.response?.data?.error || 'Failed to save user'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete user ${name}? This action cannot be undone.`)) return;
    try { await api.delete(`/admin/users/${id}`); fetchUsers(); }
    catch (err) { alert(err.response?.data?.error || 'Failed to delete user'); }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.id_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    return roleFilter === 'ALL' || u.role.toUpperCase() === roleFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-2xl font-extrabold text-white font-['Outfit']">User & Account Management</h1>
            <p className="text-xs text-slate-400">Manage student, instructor, and administration accounts.</p>
          </div>
        </div>
        <button onClick={() => openModal()} className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg">
          <UserPlus className="w-4 h-4" /> Add New User
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Search by name, ID, email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200" />
        </div>
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          {['ALL', 'STUDENT', 'INSTRUCTOR', 'ADMIN'].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)} className={`px-3 py-1.5 rounded-lg font-semibold ${roleFilter === r ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{r}</button>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="px-5 py-3.5">User</th>
              <th className="px-5 py-3.5">ID Number</th>
              <th className="px-5 py-3.5">Role</th>
              <th className="px-5 py-3.5">Department</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-slate-800/40">
                <td className="px-5 py-3.5 flex items-center gap-2.5">
                  <img src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id_number}`} alt={u.name} className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-800" />
                  <div><div className="font-semibold text-slate-200">{u.name}</div><div className="text-[11px] text-slate-400">{u.email}</div></div>
                </td>
                <td className="px-5 py-3.5 font-mono">{u.id_number}</td>
                <td className="px-5 py-3.5"><RoleBadge role={u.role} /></td>
                <td className="px-5 py-3.5">{u.department}</td>
                <td className="px-5 py-3.5 text-right space-x-1">
                  <button onClick={() => openModal(u)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDeleteUser(u.id, u.name)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={selectedUser ? "Edit User Account" : "Add New User"}>
        <form onSubmit={handleSaveUser} className="space-y-4">
          {formError && <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-xl">{formError}</div>}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">ID Number</label>
              <input type="text" required value={formData.id_number} onChange={(e) => setFormData({ ...formData, id_number: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Role</label>
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
                <option value="student">Student</option><option value="instructor">Instructor</option><option value="admin">Administrator</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password {selectedUser && "(Leave blank to keep current)"}</label>
            <input type="password" required={!selectedUser} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder={selectedUser ? "Leave blank to keep existing password" : "••••••••"} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200" />
          </div>
          <div className="pt-2 flex gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-purple-600">Save Account</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
