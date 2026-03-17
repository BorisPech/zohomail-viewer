const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // OAuth callback - redirect back to index with code
  if (pathname === '/callback') {
    const code = parsed.query.code;
    const state = parsed.query.state;
    if (code) {
      // Redirect to main page with the code as a query param
      res.writeHead(302, { Location: `/?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state||'')}` });
      res.end();
    } else {
      res.writeHead(302, { Location: '/?error=no_code' });
      res.end();
    }
    return;
  }

  // Serve index.html for all other routes
  const filePath = path.join(__dirname, 'index.html');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('index.html not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n✅ ZohoMail Viewer running at: http://localhost:${PORT}`);
  console.log(`📬 Open your browser and go to: http://localhost:${PORT}\n`);
});
