"use strict";
const { handle } = require("../lib/score");

// The body is read raw: Vercel's parsed req.body would round wei-scale integers.
module.exports = async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const family = String(req.query?.family ?? "").toUpperCase();
  const [status, body] = await handle(req.method, family, Buffer.concat(chunks).toString("utf8"));
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
};

module.exports.config = { api: { bodyParser: false } };
