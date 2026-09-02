import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Modal } from '../../components/common/Modal';
import { 
  BookOpen, 
  PlusCircle, 
  UploadCloud, 
  Users, 
  MapPin, 
  Clock, 
  Trash2, 
  ArrowLeft, 
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const ManageSectionsPage = () => {
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedSectionForImport, setSelectedSectionForImport] = useState(null);

  // Section Form Data
  const [sectionForm, setSectionForm] = useState({
    name: '',
    subject_id: '',
    instructor_id: '',
    academic_term: '1st Semester 2026-2027',
    room: '',
    schedule: ''
  });

  // Subject Form Data
  const [subjectForm, setSubjectForm] = useState({
    code: '',
    title: '',
    units: 3,
    description: ''
  });

  // Import CSV Form
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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

      if (subRes.data.subjects?.length > 0 && !sectionForm.subject_id) {
        setSectionForm(prev => ({ ...prev, subject_id: subRes.data.subjects[0].id }));
      }
      if (usersRes.data.users?.length > 0 && !sectionForm.instructor_id) {
        setSectionForm(prev => ({ ...prev, instructor_id: usersRes.data.users[0].id }));
      }
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/admin/subjects', subjectForm);
      setShowSubjectModal(false);
      setSubjectForm({ code: '', title: '', units: 3, description: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create subject');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/admin/sections', sectionForm);
      setShowSectionModal(false);
      setSectionForm({
        name: '',
        subject_id: subjects[0]?.id || '',
        instructor_id: instructors[0]?.id || '',
        academic_term: '1st Semester 2026-2027',
        room: '',
        schedule: ''
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create section');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSection = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete section ${name}?`)) return;
    try {
      await api.delete(`/admin/sections/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete section');
    }
  };

  const handleImportRoster = async (e) => {
    e.preventDefault();
    if (!selectedSectionForImport || !csvText.trim()) return;

    try {
      setSubmitting(true);
      const res = await api.post(`/admin/sections/${selectedSectionForImport.id}/import-roster`, {
        csvData: csvText
      });
      setImportResult(res.data);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to import roster');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-white font-['Outfit']">
              Sections, Subjects & Rosters
            </h1>
            <p className="text-xs text-slate-400">
              Configure course curriculum, assign faculty instructors, and import student rosters.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowSubjectModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-purple-400" />
            <span>New Subject</span>
          </button>
          <button
            onClick={() => setShowSectionModal(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Section</span>
          </button>
        </div>
      </div>

      {/* Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((sec) => (
          <div key={sec.id} className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {sec.name}
                </span>
                <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {sec.enrolled_count} Enrolled
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-100 mt-2">
                {sec.subject_code} — {sec.subject_title}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Instructor: <span className="text-slate-200 font-semibold">{sec.instructor_name || 'Unassigned'}</span>
              </p>

              <div className="mt-3 space-y-1 text-xs text-slate-400">
                <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-500" /> {sec.room}</div>
                <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-500" /> {sec.schedule}</div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setSelectedSectionForImport(sec);
                  setCsvText('');
                  setImportResult(null);
                  setShowImportModal(true);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-purple-300 hover:text-purple-200 border border-purple-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Import CSV Roster</span>
              </button>

              <button
                onClick={() => handleDeleteSection(sec.id, sec.name)}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Delete Section"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Subject Modal */}
      <Modal
        isOpen={showSubjectModal}
        onClose={() => setShowSubjectModal(false)}
        title="Add Academic Subject / Course"
        subtitle="Create a subject code and course description"
      >
        <form onSubmit={handleCreateSubject} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Subject Code</label>
              <input
                type="text"
                required
                placeholder="e.g. IT301"
                value={subjectForm.code}
                onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                className="w-full uppercase bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Subject Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Web Systems and Technologies"
                value={subjectForm.title}
                onChange={(e) => setSubjectForm({ ...subjectForm, title: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Units</label>
            <input
              type="number"
              min="1"
              max="6"
              value={subjectForm.units}
              onChange={(e) => setSubjectForm({ ...subjectForm, units: parseInt(e.target.value) || 3 })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              rows={2}
              value={subjectForm.description}
              onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setShowSubjectModal(false)}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/30"
            >
              {submitting ? 'Saving...' : 'Add Subject'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Section Modal */}
      <Modal
        isOpen={showSectionModal}
        onClose={() => setShowSectionModal(false)}
        title="Create Class Section"
        subtitle="Set up a section schedule, room, and assigned instructor"
      >
        <form onSubmit={handleCreateSection} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Section Name</label>
              <input
                type="text"
                required
                placeholder="e.g. BSIT-3A"
                value={sectionForm.name}
                onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Academic Term</label>
              <input
                type="text"
                required
                value={sectionForm.academic_term}
                onChange={(e) => setSectionForm({ ...sectionForm, academic_term: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
            <select
              value={sectionForm.subject_id}
              onChange={(e) => setSectionForm({ ...sectionForm, subject_id: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-purple-500"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.code} — {sub.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Faculty Instructor</label>
            <select
              value={sectionForm.instructor_id}
              onChange={(e) => setSectionForm({ ...sectionForm, instructor_id: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-purple-500"
            >
              <option value="">-- Select Instructor --</option>
              {instructors.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.email})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Room / Lab</label>
              <input
                type="text"
                required
                placeholder="e.g. Lab 304"
                value={sectionForm.room}
                onChange={(e) => setSectionForm({ ...sectionForm, room: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Schedule</label>
              <input
                type="text"
                required
                placeholder="e.g. MW 08:30 AM - 10:00 AM"
                value={sectionForm.schedule}
                onChange={(e) => setSectionForm({ ...sectionForm, schedule: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setShowSectionModal(false)}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/30"
            >
              {submitting ? 'Creating...' : 'Create Section'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk CSV Roster Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title={`Bulk Import Class Roster — ${selectedSectionForImport?.name}`}
        subtitle="Paste or upload CSV roster data to automatically enroll students"
        maxWidth="max-w-lg"
      >
        {!importResult ? (
          <form onSubmit={handleImportRoster} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                Expected CSV Format:
              </p>
              <pre className="font-mono text-[11px] text-purple-300 bg-slate-900 p-2 rounded-lg border border-slate-800">
                id_number, name, email{"\n"}
                2023-00160, Alyssa Nicole Valdez, alyssa.valdez@ccdi.edu.ph{"\n"}
                2023-00161, John Michael Castro, jm.castro@ccdi.edu.ph
              </pre>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Paste CSV Lines or Raw Roster Data
              </label>
              <textarea
                rows={6}
                required
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="2023-00160, Alyssa Nicole Valdez, alyssa.valdez@ccdi.edu.ph..."
                className="w-full font-mono bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !csvText.trim()}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/30"
              >
                {submitting ? 'Importing Roster...' : 'Execute Roster Import'}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Import Completed!</h3>
              <p className="text-xs text-emerald-300 mt-1">{importResult.message}</p>
            </div>
            <button
              onClick={() => { setShowImportModal(false); setImportResult(null); }}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/30"
            >
              Done
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};
