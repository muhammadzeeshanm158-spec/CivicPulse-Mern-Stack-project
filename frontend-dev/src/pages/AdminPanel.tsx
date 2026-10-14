import React, { useState, useEffect } from "react";
import API from "../services/api";
import { PaginationControls } from "../components/PaginationControls";
import {
  Building2,
  Tags,
  MapPin,
  Users,
  History,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
} from "lucide-react";

type TabType = "departments" | "categories" | "areas" | "staff" | "logs";

interface FormErrors {
  name?: string;
  code?: string;
  title?: string;
  slaHours?: string;
  email?: string;
  geoJson?: string;
}

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("departments");
  const [loading, setLoading] = useState(false);

  // Data states
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  // Pagination states for each tab
  const [pages, setPages] = useState({
    departments: 1,
    categories: 1,
    areas: 1,
    staff: 1,
    logs: 1,
  });

  const [totalPages, setTotalPages] = useState({
    departments: 1,
    categories: 1,
    areas: 1,
    staff: 1,
    logs: 1,
  });

  // Modal & Form States
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>({});

  // Validation & Error States
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [modalApiError, setModalApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const currentPage = pages[activeTab];
    try {
      if (activeTab === "departments") {
        const res = await API.get(`/admin/departments?page=${currentPage}&limit=8`).catch(() => ({ data: [] }));
        setDepartments(res.data.data || res.data || []);
        setTotalPages((prev) => ({ ...prev, departments: res.data.totalPages || 1 }));
      } else if (activeTab === "categories") {
        const res = await API.get(`/admin/categories?page=${currentPage}&limit=8`).catch(() => ({ data: [] }));
        setCategories(res.data.data || res.data || []);
        setTotalPages((prev) => ({ ...prev, categories: res.data.totalPages || 1 }));
      } else if (activeTab === "areas") {
        const res = await API.get(`/admin/areas?page=${currentPage}&limit=8`).catch(() => ({ data: [] }));
        setAreas(res.data.data || res.data || []);
        setTotalPages((prev) => ({ ...prev, areas: res.data.totalPages || 1 }));
      } else if (activeTab === "staff") {
        const res = await API.get(`/admin/staff?page=${currentPage}&limit=8`).catch(() => ({ data: [] }));
        setStaff(res.data.data || res.data || []);
        setTotalPages((prev) => ({ ...prev, staff: res.data.totalPages || 1 }));
      } else if (activeTab === "logs") {
        const res = await API.get(`/admin/activity-logs?page=${currentPage}&limit=10`).catch(() => ({ data: [] }));
        setLogs(res.data.data || res.data || []);
        setTotalPages((prev) => ({ ...prev, logs: res.data.totalPages || 1 }));
      }
    } catch (err) {
      console.error("Failed to load admin data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, pages[activeTab]]);

  const handlePageChange = (newPage: number) => {
    setPages((prev) => ({ ...prev, [activeTab]: newPage }));
  };

  const handleOpenModal = (item: any = null) => {
    setEditItem(item);
    setFormData(item || {});
    setFieldErrors({});
    setModalApiError(null);
    setModalOpen(true);
  };

  // Client-side Modal Validation Handler
  const validateModalForm = (): boolean => {
    const errors: FormErrors = {};

    if (activeTab === "departments") {
      if (!formData.name?.trim()) errors.name = "Department name is required.";
      if (!formData.code?.trim()) errors.code = "Department code is required.";
    } else if (activeTab === "categories") {
      if (!formData.title?.trim()) errors.title = "Category title is required.";
      if (!formData.slaHours || Number(formData.slaHours) <= 0) {
        errors.slaHours = "Please enter valid SLA hours (greater than 0).";
      }
    } else if (activeTab === "areas") {
      if (!formData.name?.trim()) errors.name = "Area / Ward name is required.";
      if (formData.geoJson?.trim()) {
        try {
          JSON.parse(formData.geoJson);
        } catch {
          errors.geoJson = "Invalid GeoJSON format. Please enter valid JSON.";
        }
      }
    } else if (activeTab === "staff") {
      if (!formData.name?.trim()) errors.name = "Full name is required.";
      if (!formData.email?.trim()) {
        errors.email = "Email address is required.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = "Please enter a valid email address.";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalApiError(null);

    // Validate inputs
    if (!validateModalForm()) {
      return;
    }

    setSubmitting(true);
    try {
      if (activeTab === "departments") {
        if (editItem) await API.put(`/admin/departments/${editItem._id}`, formData);
        else await API.post("/admin/departments", formData);
      } else if (activeTab === "categories") {
        if (editItem) await API.put(`/admin/categories/${editItem._id}`, formData);
        else await API.post("/admin/categories", formData);
      } else if (activeTab === "areas") {
        if (editItem) await API.put(`/admin/areas/${editItem._id}`, formData);
        else await API.post("/admin/areas", formData);
      } else if (activeTab === "staff") {
        if (editItem) await API.put(`/admin/staff/${editItem._id}`, formData);
        else await API.post("/admin/staff", formData);
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      setModalApiError(err.response?.data?.message || "Operation failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await API.delete(`/admin/${activeTab}/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const handleToggleStaffStatus = async (id: string) => {
    try {
      await API.patch(`/admin/staff/${id}/toggle-status`);
      fetchData();
    } catch (err: any) {
      alert("Failed to toggle status");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 px-4 sm:px-6">
      {/* Top Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">System Administration Panel</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure departments, SLA categories, ward areas, staff roles, and audit logs.
          </p>
        </div>
        {activeTab !== "logs" && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Add New {activeTab.slice(0, -1)}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("departments")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition shrink-0 ${
            activeTab === "departments"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Building2 className="w-4 h-4" /> Departments
        </button>

        <button
          onClick={() => setActiveTab("categories")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition shrink-0 ${
            activeTab === "categories"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Tags className="w-4 h-4" /> Categories & SLA
        </button>

        <button
          onClick={() => setActiveTab("areas")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition shrink-0 ${
            activeTab === "areas"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <MapPin className="w-4 h-4" /> Areas & GeoJSON
        </button>

        <button
          onClick={() => setActiveTab("staff")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition shrink-0 ${
            activeTab === "staff"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" /> Staff Management
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition shrink-0 ${
            activeTab === "logs"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <History className="w-4 h-4" /> Activity Logs
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden p-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading {activeTab}...</div>
        ) : (
          <div className="overflow-x-auto">
            {/* 1. DEPARTMENTS TAB */}
            {activeTab === "departments" && (
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100 uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5 pl-5">Department Name</th>
                    <th className="p-3.5">Code</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.length === 0 ? (
                    <tr><td colSpan={4} className="p-6 text-center text-slate-400">No departments found.</td></tr>
                  ) : (
                    departments.map((dept) => (
                      <tr key={dept._id} className="hover:bg-slate-50/60">
                        <td className="p-3.5 pl-5 font-bold text-slate-800">{dept.name}</td>
                        <td className="p-3.5 font-mono text-slate-500">{dept.code || "N/A"}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${dept.isActive !== false ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                            {dept.isActive !== false ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="p-3.5 text-right pr-5 space-x-2">
                          <button onClick={() => handleOpenModal(dept)} className="p-1 text-slate-500 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(dept._id)} className="p-1 text-slate-500 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 2. CATEGORIES TAB */}
            {activeTab === "categories" && (
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100 uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5 pl-5">Category Title</th>
                    <th className="p-3.5">Severity</th>
                    <th className="p-3.5">SLA Hours</th>
                    <th className="p-3.5">Assigned Department</th>
                    <th className="p-3.5 text-right pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.length === 0 ? (
                    <tr><td colSpan={5} className="p-6 text-center text-slate-400">No categories found.</td></tr>
                  ) : (
                    categories.map((cat) => (
                      <tr key={cat._id} className="hover:bg-slate-50/60">
                        <td className="p-3.5 pl-5 font-bold text-slate-800">{cat.title}</td>
                        <td className="p-3.5"><span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{cat.severity || "Medium"}</span></td>
                        <td className="p-3.5 font-mono">{cat.slaHours || 24} hrs</td>
                        <td className="p-3.5 text-slate-600">{cat.department?.name || "Unassigned"}</td>
                        <td className="p-3.5 text-right pr-5 space-x-2">
                          <button onClick={() => handleOpenModal(cat)} className="p-1 text-slate-500 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(cat._id)} className="p-1 text-slate-500 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 3. AREAS TAB */}
            {activeTab === "areas" && (
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100 uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5 pl-5">Area / Ward Name</th>
                    <th className="p-3.5">Ward Code</th>
                    <th className="p-3.5">GeoJSON Boundary</th>
                    <th className="p-3.5 text-right pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {areas.length === 0 ? (
                    <tr><td colSpan={4} className="p-6 text-center text-slate-400">No areas found.</td></tr>
                  ) : (
                    areas.map((area) => (
                      <tr key={area._id} className="hover:bg-slate-50/60">
                        <td className="p-3.5 pl-5 font-bold text-slate-800">{area.name}</td>
                        <td className="p-3.5 font-mono">{area.wardCode || "N/A"}</td>
                        <td className="p-3.5 text-slate-500 font-mono text-[11px] truncate max-w-xs">{area.geoJson ? "Configured ✔" : "Not Defined"}</td>
                        <td className="p-3.5 text-right pr-5 space-x-2">
                          <button onClick={() => handleOpenModal(area)} className="p-1 text-slate-500 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(area._id)} className="p-1 text-slate-500 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 4. STAFF MANAGEMENT TAB */}
            {activeTab === "staff" && (
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100 uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5 pl-5">Staff Member</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Assigned Area</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staff.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-slate-400">No staff members found.</td></tr>
                  ) : (
                    staff.map((member) => (
                      <tr key={member._id} className="hover:bg-slate-50/60">
                        <td className="p-3.5 pl-5 font-bold text-slate-800">
                          <div>{member.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{member.email}</div>
                        </td>
                        <td className="p-3.5 font-semibold text-indigo-600 uppercase text-[10px]">{member.role}</td>
                        <td className="p-3.5">{member.department?.name || "N/A"}</td>
                        <td className="p-3.5">{member.area?.name || "N/A"}</td>
                        <td className="p-3.5">
                          <button onClick={() => handleToggleStaffStatus(member._id)}>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${member.isActive !== false ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                              {member.isActive !== false ? "Active" : "Deactivated"}
                            </span>
                          </button>
                        </td>
                        <td className="p-3.5 text-right pr-5 space-x-2">
                          <button onClick={() => handleOpenModal(member)} className="p-1 text-slate-500 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 5. ACTIVITY LOGS TAB */}
            {activeTab === "logs" && (
              <table className="w-full text-left text-xs min-w-[550px]">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100 uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5 pl-5">Timestamp</th>
                    <th className="p-3.5">User</th>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5 pr-5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.length === 0 ? (
                    <tr><td colSpan={4} className="p-6 text-center text-slate-400">No activity logs recorded.</td></tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50/60">
                        <td className="p-3.5 pl-5 font-mono text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="p-3.5 font-bold text-slate-800">{log.user?.name || "System"}</td>
                        <td className="p-3.5 font-semibold text-indigo-600">{log.action}</td>
                        <td className="p-3.5 pr-5 text-slate-600">{log.details || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* Server Pagination */}
            <PaginationControls
              currentPage={pages[activeTab]}
              totalPages={totalPages[activeTab]}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* CRUD MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              {editItem ? "Edit" : "Create"} {activeTab.slice(0, -1)}
            </h3>

            {/* Modal API Error Banner */}
            {modalApiError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {modalApiError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-3" noValidate>
              {/* DEPARTMENTS FORM */}
              {activeTab === "departments" && (
                <>
                  <div>
                    <input
                      type="text"
                      placeholder="Department Name"
                      value={formData.name || ""}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: undefined });
                      }}
                      className={`w-full p-2.5 bg-slate-50 border rounded-xl text-xs focus:outline-none transition ${
                        fieldErrors.name ? "border-rose-500 focus:ring-2 focus:ring-rose-500/10" : "border-slate-200 focus:border-indigo-600"
                      }`}
                    />
                    {fieldErrors.name && <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.name}</p>}
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Department Code (e.g. DEPT-WATER)"
                      value={formData.code || ""}
                      onChange={(e) => {
                        setFormData({ ...formData, code: e.target.value });
                        if (fieldErrors.code) setFieldErrors({ ...fieldErrors, code: undefined });
                      }}
                      className={`w-full p-2.5 bg-slate-50 border rounded-xl text-xs focus:outline-none transition ${
                        fieldErrors.code ? "border-rose-500 focus:ring-2 focus:ring-rose-500/10" : "border-slate-200 focus:border-indigo-600"
                      }`}
                    />
                    {fieldErrors.code && <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.code}</p>}
                  </div>
                </>
              )}

              {/* CATEGORIES FORM */}
              {activeTab === "categories" && (
                <>
                  <div>
                    <input
                      type="text"
                      placeholder="Category Title"
                      value={formData.title || ""}
                      onChange={(e) => {
                        setFormData({ ...formData, title: e.target.value });
                        if (fieldErrors.title) setFieldErrors({ ...fieldErrors, title: undefined });
                      }}
                      className={`w-full p-2.5 bg-slate-50 border rounded-xl text-xs focus:outline-none transition ${
                        fieldErrors.title ? "border-rose-500 focus:ring-2 focus:ring-rose-500/10" : "border-slate-200 focus:border-indigo-600"
                      }`}
                    />
                    {fieldErrors.title && <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.title}</p>}
                  </div>

                  <div>
                    <input
                      type="number"
                      placeholder="SLA Target Hours (e.g., 24)"
                      value={formData.slaHours || ""}
                      onChange={(e) => {
                        setFormData({ ...formData, slaHours: e.target.value });
                        if (fieldErrors.slaHours) setFieldErrors({ ...fieldErrors, slaHours: undefined });
                      }}
                      className={`w-full p-2.5 bg-slate-50 border rounded-xl text-xs focus:outline-none transition ${
                        fieldErrors.slaHours ? "border-rose-500 focus:ring-2 focus:ring-rose-500/10" : "border-slate-200 focus:border-indigo-600"
                      }`}
                    />
                    {fieldErrors.slaHours && <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.slaHours}</p>}
                  </div>

                  <select
                    value={formData.severity || "Medium"}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
                  >
                    <option value="Low">Low Severity</option>
                    <option value="Medium">Medium Severity</option>
                    <option value="High">High Severity</option>
                    <option value="Critical">Critical Severity</option>
                  </select>
                </>
              )}

              {/* AREAS FORM */}
              {activeTab === "areas" && (
                <>
                  <div>
                    <input
                      type="text"
                      placeholder="Area / Ward Name"
                      value={formData.name || ""}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: undefined });
                      }}
                      className={`w-full p-2.5 bg-slate-50 border rounded-xl text-xs focus:outline-none transition ${
                        fieldErrors.name ? "border-rose-500 focus:ring-2 focus:ring-rose-500/10" : "border-slate-200 focus:border-indigo-600"
                      }`}
                    />
                    {fieldErrors.name && <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.name}</p>}
                  </div>

                  <div>
                    <textarea
                      placeholder="GeoJSON Polygon Coordinates (JSON format)"
                      rows={3}
                      value={formData.geoJson || ""}
                      onChange={(e) => {
                        setFormData({ ...formData, geoJson: e.target.value });
                        if (fieldErrors.geoJson) setFieldErrors({ ...fieldErrors, geoJson: undefined });
                      }}
                      className={`w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-mono focus:outline-none transition ${
                        fieldErrors.geoJson ? "border-rose-500 focus:ring-2 focus:ring-rose-500/10" : "border-slate-200 focus:border-indigo-600"
                      }`}
                    />
                    {fieldErrors.geoJson && <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.geoJson}</p>}
                  </div>
                </>
              )}

              {/* STAFF FORM */}
              {activeTab === "staff" && (
                <>
                  <div>
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={formData.name || ""}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: undefined });
                      }}
                      className={`w-full p-2.5 bg-slate-50 border rounded-xl text-xs focus:outline-none transition ${
                        fieldErrors.name ? "border-rose-500 focus:ring-2 focus:ring-rose-500/10" : "border-slate-200 focus:border-indigo-600"
                      }`}
                    />
                    {fieldErrors.name && <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.name}</p>}
                  </div>

                  <div>
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={formData.email || ""}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                      }}
                      className={`w-full p-2.5 bg-slate-50 border rounded-xl text-xs focus:outline-none transition ${
                        fieldErrors.email ? "border-rose-500 focus:ring-2 focus:ring-rose-500/10" : "border-slate-200 focus:border-indigo-600"
                      }`}
                    />
                    {fieldErrors.email && <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.email}</p>}
                  </div>

                  <select
                    value={formData.role || "officer"}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
                  >
                    <option value="officer">Field Officer</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;