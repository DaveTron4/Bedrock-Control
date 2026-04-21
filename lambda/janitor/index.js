"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/rcon-client/lib/packet.js
var require_packet = __commonJS({
  "node_modules/rcon-client/lib/packet.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    function encodePacket(packet) {
      const buffer = Buffer.alloc(packet.payload.length + 14);
      buffer.writeInt32LE(packet.payload.length + 10, 0);
      buffer.writeInt32LE(packet.id, 4);
      buffer.writeInt32LE(packet.type, 8);
      packet.payload.copy(buffer, 12);
      return buffer;
    }
    exports2.encodePacket = encodePacket;
    function decodePacket(buffer) {
      const length = buffer.readInt32LE(0);
      const id = buffer.readInt32LE(4);
      const type = buffer.readInt32LE(8);
      const payload = buffer.slice(12, length + 2);
      return {
        id,
        type,
        payload
      };
    }
    exports2.decodePacket = decodePacket;
    var PacketType;
    (function(PacketType2) {
      PacketType2[PacketType2["Auth"] = 3] = "Auth";
      PacketType2[PacketType2["AuthResponse"] = 2] = "AuthResponse";
      PacketType2[PacketType2["Command"] = 2] = "Command";
      PacketType2[PacketType2["CommandResponse"] = 0] = "CommandResponse";
    })(PacketType = exports2.PacketType || (exports2.PacketType = {}));
  }
});

// node_modules/rcon-client/lib/splitter.js
var require_splitter = __commonJS({
  "node_modules/rcon-client/lib/splitter.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var stream_1 = require("stream");
    function createSplitter() {
      let transform = new stream_1.Transform();
      let buffer = Buffer.alloc(0);
      transform._transform = (chunk, _encoding, callback) => {
        buffer = Buffer.concat([buffer, chunk]);
        let offset = 0;
        while (offset + 4 < buffer.length) {
          const length = buffer.readInt32LE(offset);
          if (offset + 4 + length > buffer.length)
            break;
          transform.push(buffer.slice(offset, offset + 4 + length));
          offset += 4 + length;
        }
        buffer = buffer.slice(offset);
        callback();
      };
      return transform;
    }
    exports2.createSplitter = createSplitter;
  }
});

// node_modules/rcon-client/lib/queue.js
var require_queue = __commonJS({
  "node_modules/rcon-client/lib/queue.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var PromiseQueue = class {
      constructor(maxConcurrent = 1) {
        this.maxConcurrent = maxConcurrent;
        this.paused = false;
        this.queue = [];
        this.pendingPromiseCount = 0;
      }
      async add(promiseGenerator) {
        return new Promise((resolve, reject) => {
          this.queue.push({ promiseGenerator, resolve, reject });
          this.dequeue();
        });
      }
      pause() {
        this.paused = true;
      }
      resume() {
        this.paused = false;
        this.dequeue();
      }
      async dequeue() {
        if (this.paused || this.pendingPromiseCount >= this.maxConcurrent)
          return;
        const item = this.queue.shift();
        if (!item)
          return;
        this.pendingPromiseCount++;
        try {
          const value = await item.promiseGenerator();
          item.resolve(value);
        } catch (error) {
          item.reject(error);
        } finally {
          this.pendingPromiseCount--;
          this.dequeue();
        }
      }
    };
    exports2.PromiseQueue = PromiseQueue;
  }
});

// node_modules/rcon-client/lib/rcon.js
var require_rcon = __commonJS({
  "node_modules/rcon-client/lib/rcon.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var net_1 = require("net");
    var packet_1 = require_packet();
    var splitter_1 = require_splitter();
    var queue_1 = require_queue();
    var events_1 = require("events");
    var defaultOptions = {
      port: 25575,
      timeout: 2e3,
      maxPending: 1
    };
    var Rcon2 = class _Rcon {
      constructor(config) {
        this.callbacks = /* @__PURE__ */ new Map();
        this.requestId = 0;
        this.emitter = new events_1.EventEmitter();
        this.socket = null;
        this.authenticated = false;
        this.on = this.emitter.on.bind(this.emitter);
        this.once = this.emitter.once.bind(this.emitter);
        this.off = this.emitter.removeListener.bind(this.emitter);
        this.config = { ...defaultOptions, ...config };
        this.sendQueue = new queue_1.PromiseQueue(this.config.maxPending);
        if (config.maxPending)
          this.emitter.setMaxListeners(config.maxPending);
      }
      static async connect(config) {
        const rcon = new _Rcon(config);
        await rcon.connect();
        return rcon;
      }
      async connect() {
        if (this.socket) {
          throw new Error("Already connected or connecting");
        }
        const socket = this.socket = net_1.connect({
          host: this.config.host,
          port: this.config.port
        });
        try {
          await new Promise((resolve, reject) => {
            socket.once("error", reject);
            socket.on("connect", () => {
              socket.off("error", reject);
              resolve();
            });
          });
        } catch (error) {
          this.socket = null;
          throw error;
        }
        socket.setNoDelay(true);
        socket.on("error", (error) => this.emitter.emit("error", error));
        this.emitter.emit("connect");
        this.socket.on("close", () => {
          this.emitter.emit("end");
          this.sendQueue.pause();
          this.socket = null;
          this.authenticated = false;
        });
        this.socket.pipe(splitter_1.createSplitter()).on("data", this.handlePacket.bind(this));
        const id = this.requestId;
        const packet = await this.sendPacket(packet_1.PacketType.Auth, Buffer.from(this.config.password));
        this.sendQueue.resume();
        if (packet.id != id || packet.id == -1) {
          this.sendQueue.pause();
          this.socket.destroy();
          this.socket = null;
          throw new Error("Authentication failed");
        }
        this.authenticated = true;
        this.emitter.emit("authenticated");
        return this;
      }
      /**
        Close the connection to the server.
      */
      async end() {
        if (!this.socket || this.socket.connecting) {
          throw new Error("Not connected");
        }
        if (!this.socket.writable)
          throw new Error("End called twice");
        this.sendQueue.pause();
        this.socket.end();
        await new Promise((resolve) => this.once("end", resolve));
      }
      /**
            Send a command to the server.
      
            @param command The command that will be executed on the server.
            @returns A promise that will be resolved with the command's response from the server.
          */
      async send(command) {
        const payload = await this.sendRaw(Buffer.from(command, "utf-8"));
        return payload.toString("utf-8");
      }
      async sendRaw(buffer) {
        if (!this.authenticated || !this.socket)
          throw new Error("Not connected");
        const packet = await this.sendPacket(packet_1.PacketType.Command, buffer);
        return packet.payload;
      }
      async sendPacket(type, payload) {
        const id = this.requestId++;
        const createSendPromise = () => {
          this.socket.write(packet_1.encodePacket({ id, type, payload }));
          return new Promise((resolve, reject) => {
            const onEnd = () => (reject(new Error("Connection closed")), clearTimeout(timeout));
            this.emitter.on("end", onEnd);
            const timeout = setTimeout(() => {
              this.off("end", onEnd);
              reject(new Error(`Timeout for packet id ${id}`));
            }, this.config.timeout);
            this.callbacks.set(id, (packet) => {
              this.off("end", onEnd);
              clearTimeout(timeout);
              resolve(packet);
            });
          });
        };
        if (type == packet_1.PacketType.Auth) {
          return createSendPromise();
        } else {
          return await this.sendQueue.add(createSendPromise);
        }
      }
      handlePacket(data) {
        const packet = packet_1.decodePacket(data);
        const id = this.authenticated ? packet.id : this.requestId - 1;
        const handler2 = this.callbacks.get(id);
        if (handler2) {
          handler2(packet);
          this.callbacks.delete(id);
        }
      }
    };
    exports2.Rcon = Rcon2;
  }
});

// node_modules/rcon-client/lib/index.js
var require_lib = __commonJS({
  "node_modules/rcon-client/lib/index.js"(exports2) {
    "use strict";
    function __export2(m) {
      for (var p in m) if (!exports2.hasOwnProperty(p)) exports2[p] = m[p];
    }
    Object.defineProperty(exports2, "__esModule", { value: true });
    __export2(require_rcon());
  }
});

// src/index.ts
var index_exports = {};
__export(index_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(index_exports);
var import_client_ec2 = require("@aws-sdk/client-ec2");
var import_rcon_client = __toESM(require_lib());
var IDLE_THRESHOLD_MS = 20 * 60 * 1e3;
var IDLE_TAG_KEY = "mc:idle-since";
var INSTANCE_ID = process.env.EC2_INSTANCE_ID;
var REGION = process.env.AWS_REGION || "us-east-1";
var RCON_HOST = process.env.RCON_HOST;
var RCON_PORT = parseInt(process.env.RCON_PORT || "25575", 10);
var RCON_PASSWORD = process.env.RCON_PASSWORD;
var ec2 = new import_client_ec2.EC2Client({ region: REGION });
async function getInstanceInfo() {
  const res = await ec2.send(new import_client_ec2.DescribeInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
  const instance = res.Reservations?.[0]?.Instances?.[0];
  return {
    state: instance?.State?.Name ?? "unknown",
    publicIp: instance?.PublicIpAddress,
    idleSince: instance?.Tags?.find((t) => t.Key === IDLE_TAG_KEY)?.Value
  };
}
async function setIdleTag(timestampMs) {
  await ec2.send(new import_client_ec2.CreateTagsCommand({
    Resources: [INSTANCE_ID],
    Tags: [{ Key: IDLE_TAG_KEY, Value: String(timestampMs) }]
  }));
}
async function clearIdleTag() {
  await ec2.send(new import_client_ec2.DeleteTagsCommand({
    Resources: [INSTANCE_ID],
    Tags: [{ Key: IDLE_TAG_KEY }]
  }));
}
async function getPlayerCount(host) {
  const rcon = new import_rcon_client.Rcon({ host, port: RCON_PORT, password: RCON_PASSWORD, timeout: 5e3 });
  await rcon.connect();
  try {
    const response = await rcon.send("list");
    const match = response.match(/There are (\d+) of a max/i);
    return match ? parseInt(match[1], 10) : 0;
  } finally {
    await rcon.end();
  }
}
async function handler() {
  console.log("Janitor running \u2014 checking server idle state");
  const { state, publicIp, idleSince } = await getInstanceInfo();
  if (state !== "running") {
    console.log(`Instance is ${state} \u2014 nothing to do`);
    return;
  }
  const host = RCON_HOST || publicIp;
  if (!host) {
    console.error("No RCON host available \u2014 instance running but has no public IP");
    return;
  }
  let playerCount;
  try {
    playerCount = await getPlayerCount(host);
    console.log(`Players online: ${playerCount}`);
  } catch (err) {
    console.warn("RCON unreachable (server may be starting):", err.message);
    return;
  }
  const now = Date.now();
  if (playerCount > 0) {
    if (idleSince) {
      await clearIdleTag();
      console.log("Players online \u2014 idle timer cleared");
    } else {
      console.log("Players online \u2014 no idle timer to clear");
    }
    return;
  }
  if (!idleSince) {
    await setIdleTag(now);
    console.log("No players \u2014 idle timer started");
    return;
  }
  const idleMs = now - parseInt(idleSince, 10);
  const idleMinutes = Math.round(idleMs / 6e4);
  console.log(`Server has been idle for ${idleMinutes} minutes (threshold: ${IDLE_THRESHOLD_MS / 6e4} min)`);
  if (idleMs < IDLE_THRESHOLD_MS) {
    console.log("Under idle threshold \u2014 waiting");
    return;
  }
  console.log(`Idle threshold reached \u2014 stopping instance ${INSTANCE_ID}`);
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: "\u{1F6D1} Server Auto-Stopped",
            description: `No players for **${idleMinutes} minutes** \u2014 server shut down to save costs.`,
            color: 16729156,
            footer: { text: "Start it again with /start" },
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }]
        })
      });
      console.log("Discord notification sent");
    } catch (err) {
      console.warn("Discord notification failed:", err.message);
    }
  }
  await ec2.send(new import_client_ec2.StopInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
  await clearIdleTag();
  console.log("EC2 stop initiated \u2014 idle tag cleared");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
