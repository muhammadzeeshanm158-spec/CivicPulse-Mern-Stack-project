import type { Response, Request, NextFunction } from "express";

// ============================================================
// 🏢 DEPARTMENT VALIDATION
// ============================================================
// Naya department banate waqt name check karta hai.
// PDF ke mutabiq department ka unique name hona chahiye (DB constraint se handle hoga).
export const validateDepartment = (req: Request, res: Response, next: NextFunction) => {
  const { name } = req.body;
  
  if (!name || name.trim() === "") {
    return res.status(400).json({ success: false, message: "Department name is required! 🏢" });
  }
  
  next();
};

// ============================================================
// 🏷️ CATEGORY VALIDATION
// ============================================================
// Category ke liye name, department_id, severityLevel, defaultSlaHours validate karta hai.
//
// ⚠️ MISSING: severityLevel 1-5 range check (PDF requirement).
// ⚠️ MISSING: defaultSlaHours positive number check.
export const validateCategory = (req: Request, res: Response, next: NextFunction) => {
  const { name, department_id, severityLevel, defaultSlaHours } = req.body;
  
  if (!name || name.trim() === "") {
    return res.status(400).json({ success: false, message: "Category name is required! 🏷️" });
  }
  
  if (!department_id || isNaN(Number(department_id))) {
    return res.status(400).json({ success: false, message: "A valid department_id is required! 🔍" });
  }

  // ✅ ADD: severityLevel 1-5 range check (PDF requirement)
  if (severityLevel !== undefined) {
    const sev = Number(severityLevel);
    if (isNaN(sev) || sev < 1 || sev > 5) {
      return res.status(400).json({ success: false, message: "severityLevel must be between 1 and 5! ⚠️" });
    }
  }

  // ✅ ADD: defaultSlaHours positive check
  if (defaultSlaHours !== undefined) {
    const sla = Number(defaultSlaHours);
    if (isNaN(sla) || sla <= 0) {
      return res.status(400).json({ success: false, message: "defaultSlaHours must be a positive number! ⏱️" });
    }
  }
  
  next();
};

// ============================================================
// 📍 AREA VALIDATION
// ============================================================
// Area name aur city check karta hai.
export const validateArea = (req: Request, res: Response, next: NextFunction) => {
  const { name, city } = req.body;
  
  if (!name || name.trim() === "") {
    return res.status(400).json({ success: false, message: "Area name is required! 📍" });
  }
  
  if (!city || city.trim() === "") {
    return res.status(400).json({ success: false, message: "City name is required! 🏙️" });
  }
  
  next();
};

// ============================================================
// 🛠️ GEOJSON POLYGON VALIDATION
// ============================================================
// Spatial area boundary ke liye GeoJSON polygon validate karta hai.
// ✅ Achha kaam — first point = last point (closed loop) check ho raha hai.
//
// ⚠️ MISSING: Coordinate bounds check (lat -90..90, lng -180..180)
// ⚠️ MISSING: GeoJSON `type: "Polygon"` check
export const validateGeoJSONPolygonInput = (req: Request, res: Response, next: NextFunction) => {
  const { name, city, coordinates } = req.body;

  if (!name || name.trim() === "" || !city || city.trim() === "") {
    return res.status(400).json({ success: false, error: "Area metadata names parameters (name and city) are mandatory! 📍" });
  }

  // Polygon array structure check: at least 1 ring, ring mein at least 4 points
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 1 || coordinates[0].length < 4) {
    return res.status(400).json({ success: false, error: "Invalid GeoJSON structural matrix! Polygon array lines must hold at least 4 coordinated points. 📐" });
  }

  // Closed loop check: first point = last point
  const firstPoint = coordinates[0][0];
  const lastPoint = coordinates[0][coordinates[0].length - 1];
  
  if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
    return res.status(400).json({ success: false, error: "Open loop boundary warning! Polygon first point entry metrics coordinate parameters must perfectly match final coordinate parameter inputs. 🛑" });
  }

  // ✅ ADD: Coordinate bounds check (optional but good practice)
  // for (const ring of coordinates) {
  //   for (const [lng, lat] of ring) {
  //     if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
  //       return res.status(400).json({ success: false, error: "Coordinates out of valid range! 🌐" });
  //     }
  //   }
  // }

  next();
};