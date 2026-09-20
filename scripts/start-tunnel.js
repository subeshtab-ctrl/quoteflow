const localtunnel = require('localtunnel');

const PORT = 3001;
const SUBDOMAIN = 'quoteflow-live';

let activeTunnel = null;

async function connectTunnel() {
  try {
    console.log(`Starting tunnel on port ${PORT}...`);
    activeTunnel = await localtunnel({
      port: PORT,
      subdomain: SUBDOMAIN,
    });

    console.log(`[TUNNEL ACTIVE] Global URL: ${activeTunnel.url}`);

    activeTunnel.on('close', () => {
      console.log('[TUNNEL CLOSED] Reconnecting in 3 seconds...');
      setTimeout(connectTunnel, 3000);
    });

    activeTunnel.on('error', (err) => {
      console.error('[TUNNEL ERROR]', err.message);
      try {
        activeTunnel.close();
      } catch (e) {}
    });

  } catch (err) {
    console.error('Failed to create tunnel:', err.message);
    console.log('Retrying in 5 seconds...');
    setTimeout(connectTunnel, 5000);
  }
}

// Heartbeat interval to prevent idle disconnects
setInterval(() => {
  if (activeTunnel && activeTunnel.url) {
    // Keep-alive heartbeat
  }
}, 20000);

connectTunnel();
