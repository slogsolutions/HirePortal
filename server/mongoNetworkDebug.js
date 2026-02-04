const dns = require("dns");
const net = require("net");
const os = require("os");

async function debugMongoNetwork() {
  console.log("\n========== MONGO NETWORK DEBUG ==========\n");

  // Node + OS info
  console.log("Node version:", process.version);
  console.log("Platform:", process.platform, process.arch);
  console.log("Hostname:", os.hostname());

  // Network interfaces
  const nets = os.networkInterfaces();
  console.log("\n--- Network Interfaces ---");
  for (const name of Object.keys(nets)) {
    for (const netw of nets[name]) {
      if (!netw.internal) {
        console.log(`${name} | ${netw.family} | ${netw.address}`);
      }
    }
  }

  // DNS result order
  console.log("\nDNS default result order:", dns.getDefaultResultOrder());

  // SRV lookup (this is where your failure is)
  console.log("\n--- SRV lookup test (_mongodb._tcp) ---");
  try {
    const srv = await dns.promises.resolveSrv(
      "_mongodb._tcp.cluster0.ii34a.mongodb.net"
    );
    console.log("SRV records:", srv);
  } catch (err) {
    console.error("❌ SRV lookup FAILED:", err.code, err.message);
  }

  // A / AAAA lookup
  console.log("\n--- A / AAAA record test ---");
  try {
    const records = await dns.promises.lookup(
      "cluster0.ii34a.mongodb.net",
      { all: true }
    );
    console.log("DNS records:", records);
  } catch (err) {
    console.error("❌ DNS lookup FAILED:", err.code, err.message);
  }

  // TCP connectivity test (direct node)
  console.log("\n--- TCP connect test (27017) ---");
  await new Promise((resolve) => {
    const socket = net.createConnection(
      {
        host: "cluster0-shard-00-00.ii34a.mongodb.net",
        port: 27017,
        timeout: 5000,
      },
      () => {
        console.log("✅ TCP connection to shard successful");
        socket.end();
        resolve();
      }
    );

    socket.on("timeout", () => {
      console.error("❌ TCP connection TIMED OUT");
      socket.destroy();
      resolve();
    });

    socket.on("error", (err) => {
      console.error("❌ TCP connection FAILED:", err.code);
      resolve();
    });
  });

  console.log("\n========== END DEBUG ==========\n");
}

module.exports = { debugMongoNetwork };
