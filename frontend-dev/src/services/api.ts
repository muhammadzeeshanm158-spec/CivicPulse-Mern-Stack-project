import axios from 'axios';

// FIX 1: Env variable se URL - localhost hardcode nahi, PDF me ye best practice hai
const API = axios.create({
  baseURL: (import.meta as ImportMeta & { env: { VITE_API_URL?: string } }).env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
});

// Request Interceptor - JWT token attach
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    // FIX: token 'undefined' string check bhi
    if (token && token !== 'undefined' && token !== 'null' && token !== '') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// FIX 2: Response Interceptor - 401 pe auto logout (bohat important)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expire ho gaya
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Login page pe bhejo agar already login page pe nahi hai
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Helper type - MySQL me id number hota hai, Mongo me string tha
type ID = number | string;

// Issue Upvote & Follow APIs
export const toggleUpvoteIssue = (issueId: ID) => 
  API.post(`/issues/${issueId}/upvote`);

export const toggleFollowIssue = (issueId: ID) => 
  API.post(`/issues/${issueId}/follow`);

// Comments APIs - FIX: parent_id snake_case bhi support
export const addComment = (issueId: ID, data: { text: string; parentId?: ID | null; parent_id?: number | null }) => 
  API.post(`/issues/${issueId}/comments`, data);

export const reportComment = (commentId: ID, reason: string) => 
  API.post(`/comments/${commentId}/report`, { reason });

export const moderateComment = (commentId: ID, action: 'hide' | 'unhide') => 
  API.patch(`/comments/${commentId}/moderate`, { action });

// Notification APIs
export const getNotifications = (page = 1, limit = 10) => 
  API.get(`/notifications?page=${page}&limit=${limit}`);

export const markNotificationAsRead = (id: ID) => 
  API.patch(`/notifications/${id}/read`);

export const markAllNotificationsAsRead = () => 
  API.patch('/notifications/read-all');

// Officer APIs
export const getOfficerAssignedIssues = () => API.get("/officer/assigned-issues");

export const updateIssueStatusByOfficer = (issueId: ID, formData: FormData) =>
  API.patch(`/officer/issues/${issueId}/resolve`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Manager APIs
export const getManagerDashboardStats = () => API.get("/manager/stats");
export const getManagerIssues = () => API.get("/manager/issues");
export const getOfficersList = () => API.get("/manager/officers");

// FIX 3: officer_id number - backend MySQL me number expect karta hai
export const assignOfficerToIssue = (issueId: ID, data: { officerId?: string; officer_id: number; deadline?: string }) =>
  API.patch(`/manager/issues/${issueId}/assign`, data);

export const updateManagerIssueStatus = (issueId: ID, data: { status: string; reason?: string }) =>
  API.patch(`/manager/issues/${issueId}/status`, data);

export const exportIssuesToCSV = () => API.get("/manager/export-csv", { responseType: "blob" });

// Transparency APIs
export const getPublicTransparencyData = (areaFilter?: string) =>
  API.get(`/public/transparency${areaFilter && areaFilter !== "all" ? `?area=${areaFilter}` : ""}`);

// Admin Management APIs - FIX: ID type number | string
export const getDepartments = () => API.get("/admin/departments");
export const createDepartment = (data: any) => API.post("/admin/departments", data);
export const updateDepartment = (id: ID, data: any) => API.put(`/admin/departments/${id}`, data);
export const deleteDepartment = (id: ID) => API.delete(`/admin/departments/${id}`);

export const getCategories = () => API.get("/admin/categories");
export const createCategory = (data: any) => API.post("/admin/categories", data);
export const updateCategory = (id: ID, data: any) => API.put(`/admin/categories/${id}`, data);
export const deleteCategory = (id: ID) => API.delete(`/admin/categories/${id}`);

export const getAreas = () => API.get("/admin/areas");
export const createArea = (data: any) => API.post("/admin/areas", data);
export const updateArea = (id: ID, data: any) => API.put(`/admin/areas/${id}`, data);
export const deleteArea = (id: ID) => API.delete(`/admin/areas/${id}`);

export const getStaffList = () => API.get("/admin/staff");
export const createStaff = (data: any) => API.post("/admin/staff", data);
export const updateStaff = (id: ID, data: any) => API.put(`/admin/staff/${id}`, data);
export const toggleStaffStatus = (id: ID) => API.patch(`/admin/staff/${id}/toggle-status`);

export const getAdminActivityLogs = (page = 1) => API.get(`/admin/activity-logs?page=${page}`);

// Paginated API Endpoints
export const getIssuesList = (page = 1, limit = 8, queryParams = "") =>
  API.get(`/issues?page=${page}&limit=${limit}${queryParams ? `&${queryParams}` : ""}`);

export const getIssueComments = (issueId: ID, page = 1, limit = 10) =>
  API.get(`/issues/${issueId}/comments?page=${page}&limit=${limit}`);

export const getNotificationsList = (page = 1, limit = 10) =>
  API.get(`/notifications?page=${page}&limit=${limit}`);

export const getAdminUsers = (page = 1, limit = 10, role = "") =>
  API.get(`/admin/users?page=${page}&limit=${limit}${role ? `&role=${role}` : ""}`);

export const getAdminCategories = (page = 1, limit = 10) =>
  API.get(`/admin/categories?page=${page}&limit=${limit}`);

export const getAdminDepartments = (page = 1, limit = 10) =>
  API.get(`/admin/departments?page=${page}&limit=${limit}`);

export const getAdminAreas = (page = 1, limit = 10) =>
  API.get(`/admin/areas?page=${page}&limit=${limit}`);

export const getOfficersPaginated = (page = 1, limit = 10) =>
  API.get(`/manager/officers?page=${page}&limit=${limit}`);

export default API;