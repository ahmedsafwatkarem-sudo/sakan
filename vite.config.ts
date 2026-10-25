import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';

const FALLBACK_HOST = 'ais-pre-wyahaiiisybikn2tkpnl2v-737510897971.europe-west2.run.app';

function dynamicOgPlugin(): Plugin {
  let detectedHost = FALLBACK_HOST;
  let detectedProto = 'https';

  return {
    name: 'dynamic-og-plugin',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const rawHost = (req.headers['x-forwarded-host'] || req.headers.host) as string;
        if (rawHost && !rawHost.includes('localhost') && !rawHost.includes('127.0.0.1')) {
          detectedHost = rawHost;
        }
        const rawProto = req.headers['x-forwarded-proto'] as string;
        if (rawProto) {
          detectedProto = rawProto;
        }
        next();
      });
    },
    transformIndexHtml(html, ctx) {
      const isLocal = detectedHost.includes('localhost') || detectedHost.includes('127.0.0.1');
      const proto = isLocal ? detectedProto : 'https';
      const origin = `${proto}://${detectedHost}`.replace(/\/$/, '');
      const defaultBanner = `${origin}/og-banner.jpg`;
      const url = ctx?.originalUrl || '';
      const match = url.match(/[?&](?:property|prop|id)=([^&#]+)/);

      // If viewing/sharing a specific property:
      if (match && match[1]) {
        const propId = decodeURIComponent(match[1]);
        try {
          const mockFilePath = path.resolve(__dirname, 'src/data/mockProperties.ts');
          if (fs.existsSync(mockFilePath)) {
            const fileContent = fs.readFileSync(mockFilePath, 'utf-8');
            const idRegex = new RegExp(`id:\\s*['"]${propId}['"][\\s\\S]*?title:\\s*['"]([^'"]+)['"][\\s\\S]*?description:\\s*['"]([^'"]+)['"][\\s\\S]*?price:\\s*(\\d+)[\\s\\S]*?images:\\s*\\[\\s*['"]([^'"]+)['"]`, 'i');
            const propMatch = fileContent.match(idRegex);

            if (propMatch) {
              const title = propMatch[1];
              const description = propMatch[2].slice(0, 150) + '...';
              const price = Number(propMatch[3]).toLocaleString('ar-EG');
              const rawImage = propMatch[4];
              const fullImage = rawImage.startsWith('http') ? rawImage : `${origin}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`;

              const fullTitle = `${title} | سكن بلس`;
              const fullDesc = `${title} بسعر ${price} ج.م. ${description}`;
              const propUrl = `${origin}/?property=${encodeURIComponent(propId)}`;

              return html
                .replace(/<title>[\s\S]*?<\/title>/, `<title>${fullTitle}</title>`)
                .replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/>/, `<meta property="og:title" content="${fullTitle}" />`)
                .replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/>/, `<meta property="og:description" content="${fullDesc}" />`)
                .replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/>/, `<meta property="og:url" content="${propUrl}" />`)
                .replace(/<meta\s+property="og:image"\s+content=".*?"\s*\/>/, `<meta property="og:image" content="${fullImage}" />`)
                .replace(/<meta\s+property="og:image:secure_url"\s+content=".*?"\s*\/>/, `<meta property="og:image:secure_url" content="${fullImage}" />`)
                .replace(/<link\s+rel="image_src"\s+href=".*?"\s*\/>/, `<link rel="image_src" href="${fullImage}" />`)
                .replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/>/, `<meta name="twitter:title" content="${fullTitle}" />`)
                .replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/>/, `<meta name="twitter:description" content="${fullDesc}" />`)
                .replace(/<meta\s+name="twitter:image"\s+content=".*?"\s*\/>/, `<meta name="twitter:image" content="${fullImage}" />`);
            }
          }
        } catch (err) {
          console.error('Error in dynamicOgPlugin:', err);
        }
      }

      // Default website link sharing: ensure all OG URLs use the detected origin and absolute paths
      return html
        .replace(/https:\/\/ais-pre-wyahaiiisybikn2tkpnl2v-737510897971\.europe-west2\.run\.app/g, origin)
        .replace(/content="\/og-banner\.jpg"/g, `content="${defaultBanner}"`)
        .replace(/href="\/og-banner\.jpg"/g, `href="${defaultBanner}"`);
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), dynamicOgPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
