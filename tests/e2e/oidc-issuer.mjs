import { createServer } from "node:http";

const issuer = new URL(process.env.AUTH_ISSUER_URL);

createServer((request, response) => {
  const { pathname } = new URL(request.url, issuer);

  if (pathname === "/.well-known/openid-configuration") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        issuer: issuer.origin,
        authorization_endpoint: new URL("/authorize", issuer).href,
        token_endpoint: new URL("/token", issuer).href,
        jwks_uri: new URL("/jwks", issuer).href,
        code_challenge_methods_supported: ["S256"],
      })
    );
  } else if (pathname === "/authorize") {
    response.writeHead(200, { "content-type": "text/html" });
    response.end("<h1>Fixture AuthNEI</h1>");
  } else {
    response.writeHead(404).end();
  }
}).listen(Number(issuer.port), "127.0.0.1");
