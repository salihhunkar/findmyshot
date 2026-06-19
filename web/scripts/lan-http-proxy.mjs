import http from "node:http";
import https from "node:https";

const targetUrl = new URL(process.env.LAN_PROXY_TARGET ?? "https://127.0.0.1:3000");
const listenPort = Number.parseInt(process.env.LAN_PROXY_PORT ?? "3001", 10);
const proxyClient = targetUrl.protocol === "https:" ? https : http;

const server = http.createServer((request, response) => {
  const proxyRequest = proxyClient.request(
    {
      protocol: targetUrl.protocol,
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80),
      method: request.method,
      path: request.url,
      headers: {
        ...request.headers,
        host: targetUrl.host
      },
      rejectUnauthorized: false
    },
    (proxyResponse) => {
      response.writeHead(proxyResponse.statusCode ?? 502, proxyResponse.headers);
      proxyResponse.pipe(response);
    }
  );

  proxyRequest.on("error", (error) => {
    response.statusCode = 502;
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.end(`LAN proxy error: ${error.message}`);
  });

  request.pipe(proxyRequest);
});

server.listen(listenPort, "0.0.0.0", () => {
  console.log(
    `LAN proxy ready at http://0.0.0.0:${listenPort} -> ${targetUrl.origin}`
  );
});
