import * as http from "node:http";
import { handleRequest } from "./handler";

const PORT = Number(process.env.PORT ?? 8080);

const server = http.createServer(handleRequest);

// Long enough that a validator reusing a connection is never cut off mid-request.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 70_000;

server.listen(PORT, () => {
  process.stdout.write(`livecert listening on :${PORT}
`);
});

for (const sig of ["SIGTERM", "SIGINT"] as const) {
  process.on(sig, () => {
    server.close(() => process.exit(0));
  });
}
