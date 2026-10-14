import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
// ✅ FIX: Tumhari file ka sahi naam - src/api/axios.ts
import API from "../services/api.ts";

const Profile: React.FC = () => {
  // Auth se real user lo - dummy nahi!
  const { user } = useAuth(); // token unused hata diya
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // ✅ Dynamic - Backend se real profile fetch karo
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Option 1: AuthContext se user already hai
        if (user) {
          const userAny = user as any;
          setProfile(user);
          setFormData({
            name: user.name || "",
            email: user.email || "",
            phone: userAny.phone || "",
          });

          // ✅ Extra: Stats bhi fetch karo API se
          try {
            const statsRes = await API.get("/issues/my-issues");
            const issues = statsRes.data.data || [];
            const resolved = issues.filter((i: any) => i.status === "Resolved").length;
            setProfile((prev: any) => ({
             ...prev,
              totalIssues: issues.length,
              resolvedIssues: resolved,
              pendingIssues: issues.length - resolved,
            }));
          } catch {}

          setLoading(false);
          return;
        }

        // Option 2: API se fetch
        const res = await API.get("/auth/me");
        const data = res.data.data || res.data;
        setProfile(data);
        setFormData({
          name: data?.name || "",
          email: data?.email || "",
          phone: (data as any)?.phone || "",
        });
      } catch (error) {
        console.error("Failed to load profile:", error);
        const localUser = localStorage.getItem("user");
        if (localUser) {
          const parsed = JSON.parse(localUser) as any;
          setProfile(parsed);
          setFormData({
            name: parsed.name || "",
            email: parsed.email || "",
            phone: parsed.phone || "",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // ✅ Update profile - Dynamic
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // ✅ Tumhari API instance use kar rahi hai - token auto attach
      const res = await API.put("/auth/update-profile", formData);
      const updatedData = res.data.data || res.data;
      setProfile(updatedData);
      localStorage.setItem("user", JSON.stringify(updatedData));
      setEditMode(false);
      alert("Profile updated! ✅");
    } catch (error: any) {
      alert(error.response?.data?.message || "Update failed! ❌");
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading profile... ⏳</div>;
  }

  if (!profile) {
    return <div className="p-8 text-center">No profile found! Please login again. ❌</div>;
  }

  return (
    // Full profile page - dynamic data
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Profile 👤</h1>

      <div className="bg-white rounded-xl shadow-lg p-6">
        {/* Profile Header - Real Data */}
        <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
            {profile.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div>
            <h2 className="text-2xl font-semibold">{profile.name}</h2>
            <p className="text-gray-600">{profile.email}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm capitalize">
              {profile.role}
            </span>
          </div>
        </div>

        {/* Stats - Dynamic */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-50 p-4 rounded-lg text-center">
            <p className="text-2xl font-bold text-indigo-600">{(profile as any).totalIssues || 0}</p>
            <p className="text-sm text-gray-600">Total Issues</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-600">{(profile as any).resolvedIssues || 0}</p>
            <p className="text-sm text-gray-600">Resolved</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg text-center">
            <p className="text-2xl font-bold text-orange-600">{(profile as any).pendingIssues || 0}</p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>
        </div>

        {/* Edit Form - Dynamic */}
        {editMode? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full border rounded-lg px-4 py-2 bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                placeholder="03XX-XXXXXXX"
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Save ✅
              </button>
              <button type="button" onClick={() => setEditMode(false)} className="px-6 py-2 bg-gray-200 rounded-lg">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Name:</span>
              <span className="font-medium">{profile.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium">{profile.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Role:</span>
              <span className="font-medium capitalize">{profile.role}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Member Since:</span>
              <span className="font-medium">{new Date((profile as any).createdAt || (profile as any).created_at || Date.now()).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Phone:</span>
              <span className="font-medium">{(profile as any).phone || "Not added"}</span>
            </div>

            <button onClick={() => setEditMode(true)} className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Edit Profile ✏️
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;