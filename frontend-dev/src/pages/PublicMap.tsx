import React, { useState, useEffect, useCallback } from "react";
import API from "../services/api";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, Navigation, MapPin, Tag, X, Layers } from "lucide-react";

// Custom marker icon banane ka function - status ke hisaab se color change hoga
const createCustomIcon = (status: string): L.DivIcon => {
  let color = "#f59e0b"; // default pending ka color
  const s = String(status).toLowerCase();
  if (s.includes("progress")) color = "#3b82f6"; // in progress neela
  if (s === "resolved") color = "#10b981"; // resolved hara

  return L.divIcon({
    html: `<div style="background:${color}; width:32px; height:32px; border-radius:50% 50% 50% 0; transform:rotate(-45deg); border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center;"><div style="width:10px; height:10px; background:white; border-radius:50%; transform:rotate(45deg);"></div></div>`,
    className: "custom-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

interface Issue {
  id: number;
  _id?: string;
  title: string;
  description: string;
  category?: string;
  category_name?: string;
  location?: string;
  area?: string;
  area_name?: string;
  latitude: number;
  longitude: number;
  status: string;
  images?: string[];
  image_urls?: string[];
  before_image_url?: string;
  created_at?: string;
  createdAt?: string;
}

const PublicMap: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    24.8607, 67.0011, // Karachi default location
  ]);
  const [zoomLevel] = useState<number>(12);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [areaFilter, setAreaFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);

  // Category nikalne ka helper
  const getCategory = (i: Issue) => i.category_name || i.category || "General";
  // Area nikalne ka helper
  const getArea = (i: Issue) => i.area_name || i.area || i.location || "N/A";
  // Images nikalne ka helper - teeno format support
  const getImages = (i: Issue) =>
    i.image_urls ||
    i.images ||
    (i.before_image_url? [i.before_image_url] : []);

  // Map se issues fetch karne ka function
  const fetchMapIssues = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedCategory!== "all") params.category = selectedCategory;
      if (selectedStatus!== "all") params.status = selectedStatus;
      if (searchText) params.search = searchText;
      if (areaFilter) params.area = areaFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (bounds) {
        // map ke bounds bhejna - sirf visible area ke issues ayenge
        params.south = bounds.getSouth();
        params.north = bounds.getNorth();
        params.west = bounds.getWest();
        params.east = bounds.getEast();
      }
      const res = await API.get("/issues/public-map", { params });
      setIssues(res.data.data || res.data.issues || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [
    selectedCategory,
    selectedStatus,
    searchText,
    areaFilter,
    startDate,
    endDate,
    bounds,
  ]);

  useEffect(() => {
    fetchMapIssues();
  }, [fetchMapIssues]);

  // Map move ya zoom hone pe bounds update
  const MapEventsHandler = () => {
    const map = useMapEvents({
      moveend: () => setBounds(map.getBounds()),
      zoomend: () => setBounds(map.getBounds()),
    });
    return null;
  };

  // Near me button - user ki current location pe le jayega
  const handleNearMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setMapCenter([pos.coords.latitude, pos.coords.longitude]);
      });
    } else {
      alert("Geolocation not supported");
    }
  };

  // Saare filters reset karna
  const resetFilters = () => {
    setSearchText("");
    setSelectedCategory("all");
    setSelectedStatus("all");
    setAreaFilter("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col space-y-3">
      {/* Top filter wala section - border hata diya */}
      <div className="bg-white p-4 rounded-2xl space-y-3 shadow-sm">
        <div className="flex justify-between gap-3 flex-col md:flex-row">
          <div>
            <h1 className="text-xl font-bold flex gap-2">
              <Layers className="w-5 h-5 text-indigo-600" /> Public Civic Map
            </h1>
            <p className="text-xs text-slate-500">Explore issues real-time.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleNearMe}
              className="px-3.5 py-2 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-xl flex gap-1 hover:bg-indigo-100"
            >
              <Navigation className="w-4 h-4" /> Near Me
            </button>
            <button
              onClick={resetFilters}
              className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-semibold hover:bg-slate-200"
            >
              Reset
            </button>
          </div>
        </div>
        {/* Filters grid - saare border remove */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-3 top-2.5 text-slate-400" />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search..."
              className="w-full bg-slate-50 rounded-xl pl-8 py-2 px-3 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">All Categories</option>
            <option value="Roads & Traffic">Roads</option>
            <option value="Sanitation & Garbage">Sanitation</option>
            <option value="Water Supply">Water</option>
            <option value="Electricity & Streetlights">Electricity</option>
            <option value="Public Parks">Parks</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <input
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            placeholder="Area..."
            className="bg-slate-50 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-50 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-slate-50 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      {/* Map wala hissa - border remove */}
      <div className="relative flex-1 rounded-2xl overflow-hidden shadow-sm">
        {loading && (
          <div className="absolute top-3 right-3 z-[999] bg-white px-3 py-1.5 rounded-full shadow text-xs font-semibold">
            Loading...
          </div>
        )}
        <MapContainer
          center={mapCenter}
          zoom={zoomLevel}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapEventsHandler />
          <MarkerClusterGroup chunkedLoading>
            {issues.map((issue) => (
              <Marker
                key={String(issue.id || issue._id)}
                position={[issue.latitude, issue.longitude]}
                icon={createCustomIcon(issue.status)}
                eventHandlers={{ click: () => setSelectedIssue(issue) }}
              >
                <Popup>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm">{issue.title}</h4>
                    <p className="text-xs text-slate-500">
                      {issue.description?.slice(0, 60)}...
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
        {/* Legend - neeche left me - border hata diya */}
        <div className="absolute bottom-4 left-4 z-[999] bg-white p-3 rounded-xl shadow text-xs">
          <p className="font-bold mb-1">Legend</p>
          <div className="flex gap-2 items-center">
            <span className="w-3 h-3 bg-amber-500 rounded-full"></span> Pending
          </div>
          <div className="flex gap-2 items-center">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span> In Progress
          </div>
          <div className="flex gap-2 items-center">
            <span className="w-3 h-3 bg-emerald-500 rounded-full"></span> Resolved
          </div>
        </div>
      </div>

      {/* Issue detail ka popup modal */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-black/40 z-[1000] flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 space-y-4 max-h- overflow-y-auto relative shadow-xl">
            <button
              onClick={() => setSelectedIssue(null)}
              className="absolute top-4 right-4 bg-slate-100 p-1 rounded-full hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold pr-8">{selectedIssue.title}</h2>
            {getImages(selectedIssue).length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {getImages(selectedIssue).map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt=""
                    className="h-32 object-cover rounded-xl"
                  />
                ))}
              </div>
            )}
            <p className="text-xs text-slate-600 leading-relaxed">
              {selectedIssue.description}
            </p>
            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
              <div className="flex gap-1 items-center">
                <Tag className="w-3 h-3 text-indigo-500" /> {getCategory(selectedIssue)}
              </div>
              <div className="flex gap-1 items-center">
                <MapPin className="w-3 h-3 text-rose-500" /> {getArea(selectedIssue)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicMap;