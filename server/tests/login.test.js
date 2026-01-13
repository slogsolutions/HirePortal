const request = require("supertest");
const app = require("../app");
const User = require("../models/User.model");

describe("POST /api/auth/login", () => {

  it("logs in successfully with correct credentials", async () => {

    await User.create({
      name: "Test User",
      email: "login@test.com",   // 🔥 unique per test
      password: "123456",
      role: "admin",
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "login@test.com",
        password: "123456",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("login@test.com");
  });

  it("fails with wrong password", async () => {

    await User.create({
      name: "Test User",
      email: "wrong@test.com",   // 🔥 different email
      password: "123456",
      role: "admin",
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "wrong@test.com",
        password: "wrong",
      });

    expect(res.statusCode).toBe(401);
  });
});
