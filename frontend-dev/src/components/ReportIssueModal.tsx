import React, { useState, useEffect, useId } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import {
  X,
  Upload,
  MapPin,
  AlertTriangle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import API from "../services/api"; // FIX: API import add kiya - pehle fake setTimeout tha

// Leaflet marker icon fix - default icon path set karna zaroori hai
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}
interface ExistingIssue {
  id: string | number;
  title: string;
  lat: number;
  lng: number;
  category: string;
}
interface FormErrors {
  title?: string;
  category?: string;
  description?: string;
  location?: string;
}

const CATEGORIES = [
  { id: 1, name: "Roads & Potholes" },
  { id: 2, name: "Garbage & Waste" },
  { id: 3, name: "Street Lighting" },
  { id: 4, name: "Water Supply & Sewage" },
  { id: 5, name: "Traffic & Signals" },
];

const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">(""); // FIX: category string nahi, category_id number bhejnge
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [position, setPosition] = useState<{ lat: number; lng: number }>({
    lat: 24.8607,
    lng: 67.0011,
  });
  const [address, setAddress] = useState<string>(
    "Click on the map to pick location",
  );
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [nearbyIssues, setNearbyIssues] = useState<ExistingIssue[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] =
    useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalTitleId = useId();
  const titleInputId = useId();
  const categorySelectId = useId();
  const descriptionInputId = useId();
  const anonymousCheckboxId = useId();
  const imageUploadId = useId();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const fetchAddress = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      );
      const data = await res.json();
      if (data && data.display_name) {
        setAddress(data.display_name);
        if (fieldErrors.location)
          setFieldErrors({ ...fieldErrors, location: undefined });
      } else setAddress(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
    } catch {
      setAddress(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
    } finally {
      setIsGeocoding(false);
    }
  };

  const checkNearbyIssues = (lat: number, lng: number) => {
    const nearby = [
      {
        id: 1,
        title: "Broken Water Pipeline",
        lat: 24.8607,
        lng: 67.0011,
        category: "Water",
      },
    ].filter(
      (issue) => Math.hypot(issue.lat - lat, issue.lng - lng) * 111000 < 300,
    );
    setNearbyIssues(nearby);
    setShowDuplicateWarning(nearby.length > 0);
  };

  const LocationPicker = () => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setPosition({ lat, lng });
        fetchAddress(lat, lng);
        checkNearbyIssues(lat, lng);
      },
    });
    return <Marker position={[position.lat, position.lng]} />;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 5) {
      setError("You can only upload up to 5 images.");
      return;
    }
    setError(null);
    setImages([...images, ...files]);
    setImagePreviews((prev) => [
      ...prev,
      ...files.map((file) => URL.createObjectURL(file)),
    ]);
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const validateModalForm = (): boolean => {
    const errors: FormErrors = {};
    if (!title.trim()) errors.title = "Issue title is required.";
    else if (title.trim().length < 5)
      errors.title = "Title must be at least 5 characters.";
    if (!categoryId) errors.category = "Please select a category.";
    if (!description.trim()) errors.description = "Description is required.";
    else if (description.trim().length < 15)
      errors.description = "Provide at least 15 characters of detail.";
    if (address.includes("Click on the map"))
      errors.location = "Please click on the map to select a location.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateModalForm()) return;
    setLoading(true);

    try {
      // FIX 1: Real API call - pehle yahan fake setTimeout tha, ab real backend call hai
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category_id", String(categoryId)); // FIX: category string nahi, category_id number
      formData.append("area_id", "1"); // FIX: area bhi id se jayega - abhi hardcode, baad me dropdown se loge
      formData.append("is_anonymous", String(isAnonymous)); // FIX: isAnonymous nahi, is_anonymous (snake_case)
      formData.append("latitude", String(position.lat));
      formData.append("longitude", String(position.lng));
      formData.append("address", address); // FIX: address field add kiya
      // FIX: photos nahi, before_image field name hai backend me
      if (images.length > 0) {
        formData.append("before_image", images[0]); // pehli image hi before_image hai
        // baaki images agar multiple support hai to:
        // images.forEach((img) => formData.append('images', img));
      }

      // Real API hit
      const res = await API.post("/issues", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("Issue reported successfully:", res.data);
      if (onSuccess) onSuccess();
      onClose();

      // Reset form
      setTitle("");
      setDescription("");
      setCategoryId("");
      setImages([]);
      setImagePreviews([]);
      setAddress("Click on the map to pick location");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to report issue. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h- overflow-y-auto p-6 shadow-2xl relative border border-slate-200">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
          <h2
            id={modalTitleId}
            className="text-xl font-bold text-slate-900 flex items-center gap-2"
          >
            <MapPin className="text-indigo-600" /> Report a Civic Issue
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-500 hover:bg-slate-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2"
          >
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor={titleInputId}
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Issue Title *
              </label>
              <input
                id={titleInputId}
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (fieldErrors.title)
                    setFieldErrors({ ...fieldErrors, title: undefined });
                }}
                placeholder="e.g. Broken streetlight"
                className={`w-full border rounded-xl px-3 py-2 text-xs text-slate-800 outline-none ${fieldErrors.title ? "border-rose-500" : "border-slate-200 focus:ring-2 focus:ring-indigo-600"}`}
              />
              {fieldErrors.title && (
                <p className="text- text-rose-600 font-semibold mt-1">
                  {fieldErrors.title}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor={categorySelectId}
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Category *
              </label>
              <select
                id={categorySelectId}
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(Number(e.target.value) || "");
                  if (fieldErrors.category)
                    setFieldErrors({ ...fieldErrors, category: undefined });
                }}
                className={`w-full border rounded-xl px-3 py-2 text-xs text-slate-800 outline-none ${fieldErrors.category ? "border-rose-500" : "border-slate-200 focus:ring-2 focus:ring-indigo-600"}`}
              >
                <option value="">Select Category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {fieldErrors.category && (
                <p className="text- text-rose-600 font-semibold mt-1">
                  {fieldErrors.category}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor={descriptionInputId}
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Description *
            </label>
            <textarea
              id={descriptionInputId}
              rows={3}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (fieldErrors.description)
                  setFieldErrors({ ...fieldErrors, description: undefined });
              }}
              placeholder="Describe the issue in detail..."
              className={`w-full border rounded-xl px-3 py-2 text-xs text-slate-800 outline-none ${fieldErrors.description ? "border-rose-500" : "border-slate-200 focus:ring-2 focus:ring-indigo-600"}`}
            />
            {fieldErrors.description && (
              <p className="text- text-rose-600 font-semibold mt-1">
                {fieldErrors.description}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Location Picker (Click on map) *
            </label>
            <div
              className={`h-56 w-full rounded-xl overflow-hidden border ${fieldErrors.location ? "border-rose-500" : "border-slate-200"}`}
            >
              <MapContainer
                center={[position.lat, position.lng]}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPicker />
              </MapContainer>
            </div>
            <div
              className={`mt-2 text-xs p-2.5 rounded-xl border flex justify-between items-center ${fieldErrors.location ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-slate-50 border-slate-200 text-slate-700"}`}
            >
              <div>
                <span className="font-bold">Selected Address: </span>
                {isGeocoding ? "Fetching address..." : address}
              </div>
              <div className="font-mono text-slate-500">
                [{position.lat.toFixed(5)}, {position.lng.toFixed(5)}]
              </div>
            </div>
            {fieldErrors.location && (
              <p className="text- text-rose-600 font-semibold mt-1">
                {fieldErrors.location}
              </p>
            )}
          </div>

          {showDuplicateWarning && (
            <div
              role="alert"
              className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900"
            >
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <AlertTriangle size={16} className="text-amber-600" />
                <span>Nearby Existing Issues Found!</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 font-medium">
                {nearbyIssues.map((issue) => (
                  <li key={issue.id}>
                    <strong>{issue.title}</strong> ({issue.category})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Upload Photos (Max 5)
            </label>
            <div className="flex flex-wrap gap-3 items-center">
              {imagePreviews.map((src, index) => (
                <div
                  key={index}
                  className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200"
                >
                  <img
                    src={src}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 hover:bg-rose-700 transition"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label
                  htmlFor={imageUploadId}
                  className="w-20 h-20 border-2 border-dashed border-slate-300 hover:border-indigo-600 rounded-xl flex flex-col items-center justify-center cursor-pointer transition"
                >
                  <Upload size={20} className="text-slate-500" />
                  <span className="text- font-bold text-slate-600 mt-1">
                    Add Image
                  </span>
                  <input
                    id={imageUploadId}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="sr-only"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={anonymousCheckboxId}
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4"
            />
            <label
              htmlFor={anonymousCheckboxId}
              className="text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Report Anonymously (Hide your name in public view)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-2 font-semibold transition disabled:opacity-50"
            >
              <>
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : null}
                {loading ? "Submitting..." : "Submit Issue"}
              </>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportIssueModal;
