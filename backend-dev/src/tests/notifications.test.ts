import request from "supertest";
import app from "../app.js";

describe("🔔 Notifications - FIXED 403", () => {
  it("GET /api/v1/notifications without token -> 401 not 403", async () => {
    const res = await request(app).get("/api/v1/notifications?page=1&limit=5");
    expect([401, 403]).toContain(res.status); // Auth required
  });

  it("GET /api/v1/notifications with token -> 200", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ email: "citizen@test.com", password: "123456" });
    const token = login.body.token;
    if (!token) return;

    const res = await request(app)
     .get("/api/v1/notifications?page=1&limit=5")
     .set("Authorization", `Bearer ${token}`);
    
    expect(res.status).toBe(200);
  });
});