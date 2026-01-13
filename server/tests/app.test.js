const request = require("supertest");
const app = require("../app");

describe("Basic API Tests", () => {
  it("Health check should return 200 OK", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe("OK");
  });
});
