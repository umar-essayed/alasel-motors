import type { Plugin } from 'vite';
import http from 'http';

export function voiceTranscriptionPlugin(): Plugin {
  return {
    name: 'voice-transcription-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/voice/')) {
          return next();
        }

        // Forward to Python voice server on port 5175
        const targetPath = req.url.replace('/api/voice', '');
        const options: http.RequestOptions = {
          hostname: '127.0.0.1',
          port: 5175,
          path: targetPath,
          method: req.method,
          headers: {
            ...req.headers,
            host: '127.0.0.1:5175',
          },
        };

        const proxyReq = http.request(options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
          proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
          console.error('Voice proxy error:', err.message);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              error: 'خادم الصوت المحلي غير متاح حالياً على المنفذ 5175',
            })
          );
        });

        req.pipe(proxyReq);
      });
    },
  };
}
