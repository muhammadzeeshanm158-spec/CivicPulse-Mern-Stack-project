import React, { useState, useEffect, useId, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  MapPin,
  Tag,
  Filter,
  Send,
  Layers,
  X,
  ThumbsUp,
  AlertTriangle,
  EyeOff,
  Loader2,
} from "lucide-react";

const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Issue {
  id: number;
  title: string;
  description: string;
  category: string;
  category_id?: number;
  category_name?: string;
  location: string;
  area_id?: number;
  area_name?: string;
  latitude?: number;
  longitude?: number;
  status: "pending" | "in_progress" | "resolved";
  images?: string[];
  upvotes?: number;
  hasUpvoted?: boolean;
  isAnonymous?: boolean;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
}
interface Area {
  id: number;
  name: string;
}

interface FormErrors {
  title?: string;
  category?: string;
  locationAddress?: string;
  description?: string;
  area_id?: string;
}

const CitizenDashboard: React.FC = () => {
  const { user } = useAuth();

  // States
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("all");

  // FIX: Backend ke liye categories + areas list
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [areasList, setAreasList] = useState<Area[]>([]);

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Roads & Traffic");
  const [categoryId, setCategoryId] = useState<number | "">(""); // FIX: backend ke liye id
  const [areaId, setAreaId] = useState<number | "">(""); // FIX: backend ke liye area_id
  const [locationAddress, setLocationAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 24.8607,
    lng: 67.0011,
  });
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [description, setDescription] = useState("");

  // Up to 5 Images State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Extra Features State
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [nearbyIssues, setNearbyIssues] = useState<Issue[]>([]);
  const [isDuplicate, setIsDuplicate] = useState(false);

  // Submit / Validation / Loading / Error States
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Accessibility Unique IDs
  const titleInputId = useId();
  const categorySelectId = useId();
  const descriptionInputId = useId();
  const anonymousCheckboxId = useId();
  const fileUploadId = useId();
  const areaSelectId = useId();

  // Client-side Validation Handler
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!title.trim()) {
      errors.title = "Issue Title is required.";
    } else if (title.trim().length < 5) {
      errors.title = "Title must be at least 5 characters long.";
    }

    if (!categoryId) {
      errors.category = "Please select a category.";
    }

    // FIX: area_id bhi required hai backend ke liye
    if (!areaId) {
      errors.area_id = "Please select area.";
    }

    if (!locationAddress.trim()) {
      errors.locationAddress =
        "Location address is required. Please select a spot on the map.";
    }

    if (!description.trim()) {
      errors.description = "Description is required.";
    } else if (description.trim().length < 15) {
      errors.description = "Description must be at least 15 characters long.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Fetch Existing Issues
  const fetchMyIssues = async () => {
    try {
      setLoading(true);
      const res = await API.get("/issues/my-issues");
      setIssues(res.data.data || []);
    } catch (err) {
      console.error("Failed to load issues:", err);
    } finally {
      setLoading(false);
    }
  };

  // FIX: Fetch categories + areas for backend ids
  const fetchMeta = async () => {
    try {
      const [catRes, areaRes] = await Promise.all([
        API.get("/admin/categories"),
        API.get("/admin/areas"),
      ]);
      const cats = catRes.data.data || catRes.data || [];
      const areas = areaRes.data.data || areaRes.data || [];
      setCategoriesList(cats);
      setAreasList(areas);
      // Default first category select
      if (cats.length > 0) {
        setCategoryId(cats[0].id);
        setCategory(cats[0].name);
      }
      if (areas.length > 0) {
        setAreaId(areas[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMyIssues();
    fetchMeta();
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        fetchAddressFromCoords(pos.coords.latitude, pos.coords.longitude);
      });
    }
  }, []);

  // Reverse Geocoding Function
  const fetchAddressFromCoords = async (lat: number, lng: number) => {
    try {
      setIsGeocoding(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      );
      const data = await response.json();
      if (data && data.display_name) {
        setLocationAddress(data.display_name);
        if (fieldErrors.locationAddress) {
          setFieldErrors((prev) => ({ ...prev, locationAddress: undefined }));
        }
      } else {
        setLocationAddress(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      setLocationAddress(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Check Nearby / Duplicate Issues
  const checkForDuplicates = useCallback(
    (newLat: number, newLng: number, currentCategory: string) => {
      const nearby = issues.filter((issue) => {
        if (!issue.latitude || !issue.longitude) return false;
        const latDiff = Math.abs(issue.latitude - newLat);
        const lngDiff = Math.abs(issue.longitude - newLng);
        return latDiff < 0.005 && lngDiff < 0.005;
      });

      setNearbyIssues(nearby);
      const exactMatch = nearby.some(
        (i) => i.category === currentCategory && i.status !== "resolved",
      );
      setIsDuplicate(exactMatch);
    },
    [issues],
  );

  // Map Click Component
  const LocationPicker = () => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setCoords({ lat, lng });
        fetchAddressFromCoords(lat, lng);
        checkForDuplicates(lat, lng, category);
      },
    });
    return <Marker position={[coords.lat, coords.lng]} />;
  };

  // Multi Image Selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (selectedFiles.length + filesArray.length > 5) {
        setErrorMessage("You can only upload up to 5 images.");
        return;
      }
      setErrorMessage(null);

      const updatedFiles = [...selectedFiles, ...filesArray];
      setSelectedFiles(updatedFiles);

      const newPreviews = filesArray.map((file) => URL.createObjectURL(file));
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  // Remove Single Image
  const removeImage = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    const updatedPreviews = imagePreviews.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    setImagePreviews(updatedPreviews);
  };

  // Performance Optimization: OPTIMISTIC UPVOTE UI
  const handleUpvote = async (id: number) => {
    // 1. Snapshot previous state for rollback
    const previousIssues = [...issues];

    // 2. IMMEDIATELY update UI state (Optimistic)
    setIssues((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          const currentlyUpvoted = i.hasUpvoted;
          const currentCount = i.upvotes || 0;
          return {
            ...i,
            upvotes: currentlyUpvoted
              ? Math.max(0, currentCount - 1)
              : currentCount + 1,
            hasUpvoted: !currentlyUpvoted,
          };
        }
        return i;
      }),
    );

    try {
      // 3. Make background API request
      await API.post(`/issues/${id}/upvote`);
    } catch (err) {
      // 4. Revert back on error
      console.error("Upvote failed, rolling back UI state:", err);
      setIssues(previousIssues);
    }
  };

  // Submit Issue - FIX: Backend ke according category_id + area_id
  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("title", title);
      // FIX: Backend ko category_id chahiye, category string nahi
      formData.append("category_id", String(categoryId));
      formData.append("category", category); // backward compat
      // FIX: Backend ko area_id chahiye
      formData.append("area_id", String(areaId));
      formData.append("location", locationAddress);
      formData.append("latitude", String(coords.lat));
      formData.append("longitude", String(coords.lng));
      formData.append("description", description);
      // FIX: Backend is_anonymous = 1/0 + isAnonymous both support
      formData.append("is_anonymous", String(isAnonymous ? 1 : 0));
      formData.append("isAnonymous", String(isAnonymous));

      selectedFiles.forEach((file) => {
        formData.append("images", file);
      });

      await API.post("/issues", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccessMessage("Issue reported successfully!");

      setTitle("");
      setDescription("");
      // keep locationAddress + coords for next report
      setSelectedFiles([]);
      setImagePreviews([]);
      setIsAnonymous(false);
      setNearbyIssues([]);
      setIsDuplicate(false);
      setFieldErrors({});

      fetchMyIssues();
    } catch (err: any) {
      console.error("Issue creation failed:", err);
      // FIX: 409 duplicate error ka user-friendly message
      const msg = err.response?.data?.message || "";
      if (
        err.response?.status === 409 ||
        msg.toLowerCase().includes("duplicate") ||
        msg.toLowerCase().includes("nearby")
      ) {
        setErrorMessage(
          "Nearby issue already reported within 100m! Please upvote existing issue.",
        );
      } else {
        setErrorMessage(msg || "Failed to submit issue. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Performance Optimization: Memoized Stats Computation
  const stats = useMemo(
    () => ({
      total: issues.length,
      pending: issues.filter((i) => i.status === "pending").length,
      inProgress: issues.filter((i) => i.status === "in_progress").length,
      resolved: issues.filter((i) => i.status === "resolved").length,
    }),
    [issues],
  );

  // Performance Optimization: Memoized Filtered Issues List
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (activeTab === "all") return true;
      return issue.status === activeTab;
    });
  }, [issues, activeTab]);

  return (
    <div className="space-y-8 selection:bg-indigo-600 selection:text-white">
      {/* PAGE BANNER */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Citizen Dashboard
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm mt-1 font-medium">
          Welcome back,{" "}
          <span className="text-indigo-600 font-bold">
            {user?.name || "Citizen"}
          </span>
          ! Report community issues & track resolution progress.
        </p>
      </div>

      {/* STATS STRIP */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
        role="region"
        aria-label="Complaint Statistics"
      >
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" aria-hidden="true" /> Total Filed
          </p>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">
            {stats.total}
          </p>
        </div>

        <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200/60 shadow-xs">
          <p className="text-amber-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />{" "}
            Pending
          </p>
          <p className="text-3xl font-extrabold text-amber-950 mt-2">
            {stats.pending}
          </p>
        </div>

        <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-200/60 shadow-xs">
          <p className="text-blue-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle
              className="w-3.5 h-3.5 text-blue-700"
              aria-hidden="true"
            />{" "}
            In Progress
          </p>
          <p className="text-3xl font-extrabold text-blue-950 mt-2">
            {stats.inProgress}
          </p>
        </div>

        <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200/60 shadow-xs">
          <p className="text-emerald-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2
              className="w-3.5 h-3.5 text-emerald-700"
              aria-hidden="true"
            />{" "}
            Resolved
          </p>
          <p className="text-3xl font-extrabold text-emerald-950 mt-2">
            {stats.resolved}
          </p>
        </div>
      </div>

      {/* MAIN CONTENT (Form + List) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: ISSUE SUBMISSION FORM */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <PlusCircle
              className="w-5 h-5 text-indigo-600"
              aria-hidden="true"
            />{" "}
            Report New Issue
          </h2>

          {/* Success / Error Banners */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-center gap-2 font-semibold"
            >
              <AlertCircle
                className="w-4 h-4 shrink-0 text-rose-600"
                aria-hidden="true"
              />{" "}
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div
              role="status"
              aria-live="polite"
              className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2 font-semibold"
            >
              <CheckCircle2
                className="w-4 h-4 shrink-0 text-emerald-600"
                aria-hidden="true"
              />{" "}
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmitIssue} className="space-y-4" noValidate>
            {/* Title */}
            <div>
              <label
                htmlFor={titleInputId}
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Issue Title *
              </label>
              <input
                id={titleInputId}
                type="text"
                placeholder="e.g. Deep pothole near Main Square"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (fieldErrors.title)
                    setFieldErrors({ ...fieldErrors, title: undefined });
                }}
                className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white transition ${
                  fieldErrors.title
                    ? "border-rose-500 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                    : "border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
                }`}
              />
              {fieldErrors.title && (
                <p className="text- text-rose-600 font-bold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />{" "}
                  {fieldErrors.title}
                </p>
              )}
            </div>

            {/* Category Selection - FIX: Backend categories list */}
            <div>
              <label
                htmlFor={categorySelectId}
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Category Selection *
              </label>
              <select
                id={categorySelectId}
                value={categoryId}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setCategoryId(id);
                  const found = categoriesList.find((c) => c.id === id);
                  if (found) setCategory(found.name);
                  if (fieldErrors.category)
                    setFieldErrors({ ...fieldErrors, category: undefined });
                  checkForDuplicates(
                    coords.lat,
                    coords.lng,
                    found?.name || category,
                  );
                }}
                className={`w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:bg-white transition ${
                  fieldErrors.category
                    ? "border-rose-500 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                    : "border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
                }`}
              >
                {categoriesList.length === 0 ? (
                  <>
                    <option value="Roads & Traffic">Roads & Traffic</option>
                    <option value="Sanitation & Garbage">
                      Sanitation & Garbage
                    </option>
                    <option value="Water Supply">Water Supply</option>
                    <option value="Electricity & Streetlights">
                      Electricity & Streetlights
                    </option>
                    <option value="Public Parks">Public Parks</option>
                  </>
                ) : (
                  categoriesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
              {fieldErrors.category && (
                <p className="text- text-rose-600 font-bold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />{" "}
                  {fieldErrors.category}
                </p>
              )}
            </div>

            {/* FIX: Area Selection - Backend ke liye required */}
            <div>
              <label
                htmlFor={areaSelectId}
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Area / Ward *
              </label>
              <select
                id={areaSelectId}
                value={areaId}
                onChange={(e) => {
                  setAreaId(Number(e.target.value) || "");
                  if (fieldErrors.area_id)
                    setFieldErrors({ ...fieldErrors, area_id: undefined });
                }}
                className={`w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:bg-white transition ${
                  fieldErrors.area_id
                    ? "border-rose-500 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                    : "border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
                }`}
              >
                <option value="">Select Area</option>
                {areasList.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              {fieldErrors.area_id && (
                <p className="text- text-rose-600 font-bold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />{" "}
                  {fieldErrors.area_id}
                </p>
              )}
            </div>

            {/* MAP & LOCATION PICKER */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Map Location Pin (Click to Drop) *
              </label>
              <div
                className={`h-44 w-full rounded-xl overflow-hidden border mb-2 ${fieldErrors.locationAddress ? "border-rose-500" : "border-slate-200"}`}
              >
                <MapContainer
                  center={[coords.lat, coords.lng]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationPicker />
                </MapContainer>
              </div>

              <div
                className={`bg-slate-50 border p-2.5 rounded-xl text-xs space-y-1 ${fieldErrors.locationAddress ? "border-rose-200 bg-rose-50/30" : "border-slate-200"}`}
              >
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <MapPin
                    className="w-3.5 h-3.5 text-rose-600 shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    {isGeocoding
                      ? "Reverse-geocoding address..."
                      : locationAddress || "Click on map to select location"}
                  </span>
                </div>
                <p className="text- text-slate-500 pl-5 font-semibold">
                  Lat:{" "}
                  <span className="font-mono text-slate-800">
                    {coords.lat.toFixed(6)}
                  </span>{" "}
                  | Lng:{" "}
                  <span className="font-mono text-slate-800">
                    {coords.lng.toFixed(6)}
                  </span>
                </p>
              </div>
              {fieldErrors.locationAddress && (
                <p className="text- text-rose-600 font-bold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />{" "}
                  {fieldErrors.locationAddress}
                </p>
              )}
            </div>

            {/* Duplicate Issue Warning */}
            {isDuplicate && (
              <div
                role="alert"
                className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2 font-semibold"
              >
                <AlertTriangle
                  className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div>
                  <strong>Possible Duplicate Warning:</strong> An active issue
                  in "{category}" already exists near this location.
                </div>
              </div>
            )}

            {/* Nearby Existing Issues Display */}
            {nearbyIssues.length > 0 && (
              <div className="p-3 bg-indigo-50/80 border border-indigo-100 rounded-xl text-xs space-y-1.5">
                <p className="font-bold text-indigo-950 flex items-center gap-1">
                  <MapPin
                    className="w-3.5 h-3.5 text-indigo-600"
                    aria-hidden="true"
                  />{" "}
                  Nearby Reported Issues ({nearbyIssues.length}):
                </p>
                <ul className="list-disc list-inside text-indigo-900 space-y-0.5 text- font-semibold">
                  {nearbyIssues.map((issue) => (
                    <li key={issue.id} className="truncate">
                      {issue.title} (
                      <span className="capitalize">{issue.status}</span>)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Description */}
            <div>
              <label
                htmlFor={descriptionInputId}
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Description *
              </label>
              <textarea
                id={descriptionInputId}
                rows={3}
                placeholder="Provide details to help municipal teams act fast..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (fieldErrors.description)
                    setFieldErrors({ ...fieldErrors, description: undefined });
                }}
                className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white transition resize-none ${
                  fieldErrors.description
                    ? "border-rose-500 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                    : "border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
                }`}
              />
              {fieldErrors.description && (
                <p className="text- text-rose-600 font-bold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />{" "}
                  {fieldErrors.description}
                </p>
              )}
            </div>

            {/* Attach Photos */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Attach Photos ({selectedFiles.length}/5)
                </span>
              </div>

              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {imagePreviews.map((src, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-lg overflow-hidden border border-slate-200 h-16 group"
                    >
                      <img
                        src={src}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        aria-label={`Remove photo ${idx + 1}`}
                        className="absolute top-0.5 right-0.5 p-1 bg-slate-900/90 text-white rounded-full transition hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-600"
                      >
                        <X className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedFiles.length < 5 && (
                <label
                  htmlFor={fileUploadId}
                  className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 hover:border-indigo-600 rounded-xl cursor-pointer bg-slate-50 hover:bg-indigo-50/30 transition text-center focus-within:ring-2 focus-within:ring-indigo-600"
                >
                  <ImageIcon
                    className="w-5 h-5 text-slate-500 mb-1"
                    aria-hidden="true"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    Click to upload photo(s)
                  </span>
                  <span className="text- text-slate-500 font-semibold">
                    Max 5 photos allowed
                  </span>
                  <input
                    id={fileUploadId}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="sr-only"
                  />
                </label>
              )}
            </div>

            {/* Anonymous Reporting Option */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id={anonymousCheckboxId}
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
              />
              <label
                htmlFor={anonymousCheckboxId}
                className="text-xs text-slate-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <EyeOff
                  className="w-3.5 h-3.5 text-slate-600"
                  aria-hidden="true"
                />{" "}
                Submit Anonymously (Hide my identity)
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              {submitting ? (
                <>
                  <Loader2
                    className="w-4 h-4 animate-spin"
                    aria-hidden="true"
                  />{" "}
                  Submitting Issue...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" aria-hidden="true" /> Submit Report
                </>
              )}
            </button>
          </form>
        </div>

        {/* RIGHT: ISSUES TRACKING LIST */}
        <div className="lg:col-span-7 space-y-5">
          {/* FILTER TABS */}
          <div
            role="tablist"
            aria-label="Filter issues by status"
            className="flex items-center justify-between bg-white p-1.5 rounded-xl border border-slate-200/80 shadow-xs"
          >
            <div className="flex gap-1 overflow-x-auto">
              {["all", "pending", "in_progress", "resolved"].map((tab) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
                    activeTab === tab
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {tab.replace("_", " ")}
                </button>
              ))}
            </div>
            <Filter
              className="w-4 h-4 text-slate-500 mr-3 hidden sm:block"
              aria-hidden="true"
            />
          </div>

          {/* CARDS LIST */}
          {loading ? (
            <div
              role="status"
              aria-live="polite"
              className="p-12 text-center text-slate-600 bg-white rounded-2xl border border-slate-200 flex justify-center items-center gap-2 font-semibold"
            >
              <Loader2
                className="w-5 h-5 animate-spin text-indigo-600"
                aria-hidden="true"
              />{" "}
              Loading reported issues...
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-600 shadow-xs font-semibold">
              No issues found in this category.
            </div>
          ) : (
            <div
              className="space-y-4"
              role="region"
              aria-label="Reported issues list"
            >
              {filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs hover:shadow-md transition flex flex-col sm:flex-row gap-4"
                >
                  {issue.images && issue.images.length > 0 && (
                    <img
                      src={issue.images[0]}
                      alt={issue.title}
                      className="w-full sm:w-28 h-28 object-cover rounded-xl border border-slate-100 shrink-0"
                    />
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">
                          {issue.title}
                        </h3>
                        {issue.isAnonymous && (
                          <span className="text- bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold inline-block mt-0.5">
                            Anonymous
                          </span>
                        )}
                      </div>
                      <span
                        className={`text- font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          issue.status === "pending"
                            ? "bg-amber-100 text-amber-900 border border-amber-200"
                            : issue.status === "in_progress"
                              ? "bg-blue-100 text-blue-900 border border-blue-200"
                              : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                        }`}
                      >
                        {issue.status.replace("_", " ")}
                      </span>
                    </div>

                    <p className="text-slate-700 text-xs leading-relaxed line-clamp-2 font-medium">
                      {issue.description}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-1">
                      <div className="flex flex-wrap items-center gap-4">
                        <span className="flex items-center gap-1 font-bold text-slate-800">
                          <Tag
                            className="w-3.5 h-3.5 text-indigo-600"
                            aria-hidden="true"
                          />{" "}
                          {issue.category}
                        </span>
                        <span
                          className="flex items-center gap-1 max-w- truncate font-semibold"
                          title={issue.location}
                        >
                          <MapPin
                            className="w-3.5 h-3.5 text-rose-600 shrink-0"
                            aria-hidden="true"
                          />{" "}
                          {issue.location}
                        </span>
                      </div>

                      {/* OPTIMISTIC UPVOTE BUTTON */}
                      <button
                        type="button"
                        onClick={() => handleUpvote(issue.id)}
                        aria-label={`Upvote issue: ${issue.title}. Current upvotes: ${issue.upvotes || 0}`}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
                          issue.hasUpvoted
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700"
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{issue.upvotes || 0}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;
