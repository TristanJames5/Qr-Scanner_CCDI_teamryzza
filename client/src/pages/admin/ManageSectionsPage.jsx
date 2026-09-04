import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Modal } from '../../components/common/Modal';
import { 
  BookOpen, PlusCircle, UploadCloud, Users, MapPin, Clock, Trash2, 
  ArrowLeft, FileText, CheckCircle2, AlertCircle, Edit, UserMinus, Search, UserPlus
} from 'lucide-react';

export const ManageSectionsPage = () => {
  const [activeTab, setActiveTab] = useState('sections');
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form Data
  const initialSectionForm = { name: '', subject_id: '', instructor_id: '', academic_term: '1st Semester 2026-2027', room: '', schedule: '' };
  const initialSubjectForm = { code: '', title: '', units: 3, description: '' };
  const [sectionForm, setSectionForm] = useState(initialSectionForm);
  const [subjectForm, setSubjectForm] = useState(initialSubjectForm);
  
  // Import CSV Form
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Roster Management
  const [roster, setRoster] = useState([]);
  const [studentSearchId, setStudentSearchId] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [secRes, subRes, usersRes] = await Promise.all([
        api.get('/sections'),
        api.get('/admin/subjects'),
        api.get('/admin/users?role=instructor')
      ]);
      setSections(secRes.data.sections || []);
      setSubjects(subRes.data.subjects || []);
      setInstructors(usersRes.data.users || []);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openSectionModal = (sec = null) => {
    setSelectedItem(sec);
    setSectionForm(sec ? {
      name: sec.name, subject_id: sec.subject_id, instructor_id: sec.instructor_id,
      academic_term: sec.academic_term, room: sec.room, schedule: sec.schedule
    } : { ...initialSectionForm, subject_id: subjects[0]?.id || '', instructor_id: instructors[0]?.id || '' });
    setShowSectionModal(true);
  };

  const openSubjectModal = (sub = null) => {
    setSelectedItem(sub);
    setSubjectForm(sub ? { code: sub.code, title: sub.title, units: sub.units, description: sub.description } : initialSubjectForm);
    setShowSubjectModal(true);
  };

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (selectedItem) {
        await api.put(`/admin/subjects/${selectedItem.id}`, subjectForm);
      } else {
        await api.post('/admin/subjects', subjectForm);
      }
      setShowSubjectModal(false);
      fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Failed to save subject'); }
    finally { setSubmitting(false); }
  };

  const handleSaveSection = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (selectedItem) {
        await api.put(`/admin/sections/${selectedItem.id}`, sectionForm);
      } else {
        await api.post('/admin/sections', sectionForm);
      }
      setShowSectionModal(false);
      fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Failed to save section'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteSection = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete section ${name}?`)) return;
    try { await api.delete(`/admin/sections/${id}`); fetchData(); }
    catch (err) { alert(err.response?.data?.error || 'Failed to delete section'); }
  };

  const handleDeleteSubject = async (id, code) => {
    if (!window.confirm(`Are you sure you want to delete subject ${code}?`)) return;
    try { await api.delete(`/admin/subjects/${id}`); fetchData(); }
    catch (err) { alert(err.response?.data?.error || 'Failed to delete subject'); }
  };

  const handleImportRoster = async (e) => {
    e.preventDefault();
    if (!selectedItem || !csvText.trim()) return;
    try {
      setSubmitting(true);
      const res = await api.post(`/admin/sections/${selectedItem.id}/import-roster`, { csvData: csvText });
      setImportResult(res.data);
      fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Failed to import roster'); }
    finally { setSubmitting(false); }
  };

  const openRosterModal = async (sec) => {
    setSelectedItem(sec);
    setShowRosterModal(true);
    fetchRoster(sec.id);
  };

  const fetchRoster = async (sectionId) => {
    try {
      const res = await api.get(`/admin/sections/${sectionId}/roster`);
      setRoster(res.data.roster);
    } catch (err) { console.error(err); }
  };

  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    if (!studentSearchId) return;
    try {
      await api.post(`/admin/sections/${selectedItem.id}/enroll`, { student_id_number: studentSearchId });
      setStudentSearchId('');
      fetchRoster(selectedItem.id);
      fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Failed to enroll student'); }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!window.confirm('Remove this student from the section?')) return;
    try {
      await api.delete(`/admin/sections/${selectedItem.id}/enroll/${studentId}`);
      fetchRoster(selectedItem.id);
      fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Failed to remove student'); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-white font-['Outfit']">Sections & Subjects</h1>
            <p className="text-xs text-slate-400">Manage curriculum, class sections, and student rosters.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('sections')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'sections' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}>Sections</button>
          <button onClick={() => setActiveTab('subjects')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'subjects' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}>Subjects</button>
        </div>
      </div>

      <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80">
        <h2 className="text-lg font-bold text-white">{activeTab === 'sections' ? 'Class Sections' : 'Curriculum Subjects'}</h2>
        <button onClick={() => activeTab === 'sections' ? openSectionModal() : openSubjectModal()} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-colors shadow-lg shadow-purple-500/20">
          <PlusCircle className="w-4 h-4" /> {activeTab === 'sections' ? 'Create Section' : 'New Subject'}
        </button>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-10">Loading data...</div>
      ) : activeTab === 'sections' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map(sec => (
            <div key={sec.id} className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-5">
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold px-2 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">{sec.name}</span>
                  <span className="text-xs text-slate-400 font-semibold flex items-center gap-1"><Users className="w-3.5 h-3.5"/> {sec.enrolled_count} Enrolled</span>
                </div>
                <h3 className="text-base font-bold text-slate-100 mt-2">{sec.subject_code} — {sec.subject_title}</h3>
                <p className="text-xs text-slate-400 mt-1">Instructor: <span className="text-slate-200">{sec.instructor_name || 'Unassigned'}</span></p>
                <div className="mt-3 space-y-1 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-500"/> {sec.room}</div>
                  <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-500"/> {sec.schedule}</div>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-800/80 grid grid-cols-4 gap-2">
                <button onClick={() => openRosterModal(sec)} className="col-span-2 py-2 bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"><Users className="w-3.5 h-3.5"/> Manage Roster</button>
                <button onClick={() => openSectionModal(sec)} className="col-span-1 py-2 bg-slate-900 hover:bg-slate-800 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center justify-center"><Edit className="w-3.5 h-3.5"/></button>
                <button onClick={() => handleDeleteSection(sec.id, sec.name)} className="col-span-1 py-2 bg-slate-900 hover:bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center justify-center"><Trash2 className="w-3.5 h-3.5"/></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map(sub => (
            <div key={sub.id} className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-5">
              <div>
                <span className="text-xs font-bold px-2 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">{sub.code}</span>
                <h3 className="text-lg font-bold text-slate-100 mt-2">{sub.title}</h3>
                <p className="text-xs text-slate-400 mt-2">{sub.description}</p>
                <p className="text-xs text-slate-500 mt-2 font-semibold">Units: {sub.units}</p>
              </div>
              <div className="pt-4 border-t border-slate-800/80 flex justify-end gap-2">
                <button onClick={() => openSubjectModal(sub)} className="p-2 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-slate-800"><Edit className="w-4 h-4"/></button>
                <button onClick={() => handleDeleteSubject(sub.id, sub.code)} className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subject Modal */}
      <Modal isOpen={showSubjectModal} onClose={() => setShowSubjectModal(false)} title={selectedItem ? "Edit Subject" : "New Subject"}>
        <form onSubmit={handleSaveSubject} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Subject Code</label>
              <input type="text" required value={subjectForm.code} onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Subject Title</label>
              <input type="text" required value={subjectForm.title} onChange={(e) => setSubjectForm({ ...subjectForm, title: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Units</label>
            <input type="number" min="1" max="6" value={subjectForm.units} onChange={(e) => setSubjectForm({ ...subjectForm, units: parseInt(e.target.value) || 3 })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea rows={2} value={subjectForm.description} onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200" />
          </div>
          <div className="pt-2 flex gap-2">
            <button type="button" onClick={() => setShowSubjectModal(false)} className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-purple-600">Save Subject</button>
          </div>
        </form>
      </Modal>

      {/* Section Modal */}
      <Modal isOpen={showSectionModal} onClose={() => setShowSectionModal(false)} title={selectedItem ? "Edit Section" : "Create Section"}>
        <form onSubmit={handleSaveSection} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Section Name</label>
              <input type="text" required value={sectionForm.name} onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Academic Term</label>
              <input type="text" required value={sectionForm.academic_term} onChange={(e) => setSectionForm({ ...sectionForm, academic_term: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
            <select value={sectionForm.subject_id} onChange={(e) => setSectionForm({ ...sectionForm, subject_id: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              {subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.code} — {sub.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Instructor</label>
            <select value={sectionForm.instructor_id} onChange={(e) => setSectionForm({ ...sectionForm, instructor_id: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="">-- Select Instructor --</option>
              {instructors.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Room</label>
              <input type="text" required value={sectionForm.room} onChange={(e) => setSectionForm({ ...sectionForm, room: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Schedule</label>
              <input type="text" required value={sectionForm.schedule} onChange={(e) => setSectionForm({ ...sectionForm, schedule: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200" />
            </div>
          </div>
          <div className="pt-2 flex gap-2">
            <button type="button" onClick={() => setShowSectionModal(false)} className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-purple-600">Save Section</button>
          </div>
        </form>
      </Modal>

      {/* Roster Modal */}
      <Modal isOpen={showRosterModal} onClose={() => setShowRosterModal(false)} title={`Manage Roster: ${selectedItem?.name}`} maxWidth="max-w-2xl">
        <div className="space-y-4">
          <div className="flex gap-2">
            <form onSubmit={handleEnrollStudent} className="flex-1 flex gap-2">
              <input type="text" placeholder="Enter Student ID Number to Enroll..." value={studentSearchId} onChange={(e) => setStudentSearchId(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-purple-500" />
              <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"><UserPlus className="w-4 h-4"/> Enroll</button>
            </form>
            <button onClick={() => { setCsvText(''); setImportResult(null); setShowImportModal(true); }} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5"><UploadCloud className="w-4 h-4"/> Bulk Import</button>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="px-4 py-2">ID Number</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {roster.map(student => (
                  <tr key={student.id} className="text-slate-300">
                    <td className="px-4 py-2 font-mono">{student.id_number}</td>
                    <td className="px-4 py-2 font-medium">{student.name}</td>
                    <td className="px-4 py-2">{student.email}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => handleRemoveStudent(student.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"><UserMinus className="w-4 h-4"/></button>
                    </td>
                  </tr>
                ))}
                {roster.length === 0 && (
                  <tr><td colSpan="4" className="px-4 py-6 text-center text-slate-500">No students enrolled in this section.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Bulk Import CSV Roster">
        {!importResult ? (
          <form onSubmit={handleImportRoster} className="space-y-4">
            <p className="text-xs text-slate-400">Paste CSV data with columns: <code className="text-purple-300 bg-slate-900 px-1 py-0.5 rounded">id_number, name, email</code></p>
            <textarea rows={6} required value={csvText} onChange={(e) => setCsvText(e.target.value)} className="w-full font-mono bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200" placeholder="2023-00160, Alyssa Nicole Valdez, alyssa.valdez@ccdi.edu.ph" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowImportModal(false)} className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800">Cancel</button>
              <button type="submit" disabled={submitting} className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-purple-600">Import</button>
            </div>
          </form>
        ) : (
          <div className="text-center py-4 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-white font-bold">{importResult.message}</h3>
            <button onClick={() => setShowImportModal(false)} className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-purple-600">Done</button>
          </div>
        )}
      </Modal>
    </div>
  );
};
