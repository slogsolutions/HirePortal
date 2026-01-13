const request = require("supertest");
const bcrypt = require("bcrypt");
const app = require("../app");
const User = require("../models/User.model");

describe("POST /api/auth/login", () => {

  it("logs in successfully with correct credentials", async () => {

    const hashed = await bcrypt.hash("123456", 10);

    await User.create({
      name: "Test User",
      email: "test@example.com",
      password: hashed,
      role: "admin"
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "test@example.com",
        password: "123456"
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("test@example.com");
  });

  it("fails with wrong password", async () => {
    const hashed = await bcrypt.hash("123456", 10);

    await User.create({
      name: "Test User",
      email: "test@example.com",
      password: hashed,
      role: "admin"
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "test@example.com",
        password: "wrong"
      });

    expect(res.statusCode).toBe(401);
  });

});
