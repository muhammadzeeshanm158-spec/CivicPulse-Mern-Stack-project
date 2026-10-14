import React, { useState, useEffect, useId } from "react";
import API from "../services/api";
import {
  MapPin,
  Upload,
  X,
  Send,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Category {
  id: number;
  name: string;
}
interface Area {
  id: number;
  name: string;
}

const ReportIssue: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [areaId, setAreaId] = useState<number | "">("");
  const [latitude, setLatitude] = useState<number>(24.8607);
  const [longitude, setLongitude] = useState<number>(67.0011);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const titleId = useId();
  const descId = useId();
  const catId = useId();
  const areaIdInput = useId();

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [catRes, areaRes] = await Promise.all([
          API.get("/admin/categories"),
          API.get("/admin/areas"),
        ]);
        setCategories(catRes.data.data || catRes.data || []);
        setAreas(areaRes.data.data || areaRes.data || []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchMeta();
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
      });
    }
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 3) {
      alert("Max 3 images allowed");
      return;
    }
    setImages([...images, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setPreviews([...previews, ...newPreviews]);
  };
  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const validate = () => {
    const err: any = {};
    if (!title.trim() || title.trim().length < 5)
      err.title = "Title min 5 chars";
    if (!description.trim() || description.trim().length < 10)
      err.description = "Description min 10 chars";
    if (!categoryId) err.category_id = "Category required";
    if (!areaId) err.area_id = "Area required";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category_id", String(categoryId));
      formData.append("area_id", String(areaId));
      formData.append("latitude", String(latitude));
      formData.append("longitude", String(longitude));
      formData.append("is_anonymous", String(isAnonymous ? 1 : 0));
      formData.append("isAnonymous", String(isAnonymous)); // backward compat
      images.forEach((img) => formData.append("images", img));
      formData.append("before_image", images[0] || ("" as any)); // some backend expect single

      await API.post("/issues", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Issue reported successfully!");
      navigate("/my-issues");
    } catch (err: any) {
      setErrors({ api: err.response?.data?.message || "Failed to report" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-12 space-y-6">
      <div className="bg-white p-6 rounded-2xl border shadow-xs">
        <h1 className="text-xl font-bold">Report Civic Issue</h1>
        <p className="text-xs text-slate-500 mt-1">
          Fill details, location will be auto-detected.
        </p>
      </div>
      {errors.api && (
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs text-rose-700 flex gap-2">
          <AlertCircle className="w-4 h-4" /> {errors.api}
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-2xl border space-y-4"
        noValidate
      >
        <div>
          <label htmlFor={titleId} className="text-xs font-bold">
            Title *
          </label>
          <input
            id={titleId}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Pothole on Main Road"
            className={`w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs ${errors.title ? "border-rose-500" : "border-slate-200"}`}
          />
          {errors.title && (
            <p className="text- text-rose-600 mt-1">{errors.title}</p>
          )}
        </div>
        <div>
          <label htmlFor={descId} className="text-xs font-bold">
            Description *
          </label>
          <textarea
            id={descId}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe issue in detail..."
            className={`w-full mt-1 p-3 bg-slate-50 border rounded-xl text-xs ${errors.description ? "border-rose-500" : "border-slate-200"}`}
          />
          {errors.description && (
            <p className="text- text-rose-600 mt-1">{errors.description}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={catId} className="text-xs font-bold">
              Category *
            </label>
            <select
              id={catId}
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value) || "")}
              className={`w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs ${errors.category_id ? "border-rose-500" : "border-slate-200"}`}
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.category_id && (
              <p className="text- text-rose-600 mt-1">{errors.category_id}</p>
            )}
          </div>
          <div>
            <label htmlFor={areaIdInput} className="text-xs font-bold">
              Area / Ward *
            </label>
            <select
              id={areaIdInput}
              value={areaId}
              onChange={(e) => setAreaId(Number(e.target.value) || "")}
              className={`w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs ${errors.area_id ? "border-rose-500" : "border-slate-200"}`}
            >
              <option value="">Select Area</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {errors.area_id && (
              <p className="text- text-rose-600 mt-1">{errors.area_id}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold flex gap-1">
              <MapPin className="w-3 h-3" /> Latitude
            </label>
            <input
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(Number(e.target.value))}
              className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-bold flex gap-1">
              <MapPin className="w-3 h-3" /> Longitude
            </label>
            <input
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(Number(e.target.value))}
              className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs"
            />
          </div>
        </div>
        <div>
          <span className="text-xs font-bold flex gap-1">
            <ImageIcon className="w-3 h-3" /> Photos (Max 3)
          </span>
          <label className="mt-1 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100">
            <Upload className="w-6 h-6 text-slate-400" />
            <span className="text-xs font-bold text-indigo-600 mt-1">
              Click to upload
            </span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="sr-only"
            />
          </label>
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {previews.map((src, i) => (
                <div key={i} className="relative">
                  <img
                    src={src}
                    alt=""
                    className="w-full h-20 object-cover rounded-xl border"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            id="anon"
          />
          <label htmlFor="anon" className="text-xs font-semibold">
            Report as Anonymous (identity hidden)
          </label>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 flex justify-center gap-2"
        >
          <Send className="w-4 h-4" />{" "}
          {loading ? "Submitting..." : "Submit Issue"}
        </button>
      </form>
    </div>
  );
};
export default ReportIssue;
