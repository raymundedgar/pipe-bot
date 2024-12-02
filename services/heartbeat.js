const fetch = require("node-fetch");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { readToken, loadProxies } = require("../utils/file");
const { logger } = require("../utils/logger");
const fs = require("fs").promises;

const API_BASE = "https://api.pipecdn.app/api";
// fetch points
async function fetchPoints(token, username, agent) {

    try {
    const response = await fetch(`${API_BASE}/points`, {
        headers: { Authorization: `Bearer ${token}` },
        agent,
    });

    if (response.ok) {
        const data = await response.json();
        logger(`Current Points for ${username}:`, "info", data.points);
    } else {
        logger(`Failed to fetch points for ${username}:`, 'error', response.status);
    }
    } catch (error) {
    logger(`Error fetching points for ${username}:`, 'error', error.message);
    }
}

// Function to send heartbeat
async function sendHeartbeat() {
    const proxies = await loadProxies();
    const tokens = await readToken();

    for (let i = 0; i < tokens.length; i++) {
        const { token, username } = tokens[i];
        const proxy = proxies[i % proxies.length];
        let agent = "";
        if(proxy){
            agent = new HttpsProxyAgent(proxy);
        }

        try {
            const geoInfo = await fetchGeoLocation(agent);

            const response = await fetch(`${API_BASE}/heartbeat`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                ip: geoInfo.ip,
                location: geoInfo.location,
                timestamp: Date.now(),
                }),
                agent,
            });

            if (response.ok) {
                proxyMessage = proxy ? "using proxy: ${proxy}" : "";
                logger(`Heartbeat sent successfully for ${username} ${proxyMessage}`, "success");
                await fetchPoints(token, username, agent)
            } else {
                logger(`Failed to send heartbeat for ${username}:`, "error", await response.text());
            }
        } catch (error) {
            logger(`Error sending heartbeat for ${username}:`, "error", error);
        }
    }
}

// Function to fetch GeoLocation
async function fetchGeoLocation(agent) {
  try {
    const response = await fetch('https://ipinfo.io/json', { agent });
    if (!response.ok) throw new Error('Failed to fetch Geo-location data');
    const data = await response.json();
    return {
      ip: data.ip,
      location: `${data.city}, ${data.region}, ${data.country}`,
    };
  } catch (error) {
    console.error('Geo-location error:', error);
    return { ip: 'unknown', location: 'unknown' };
  }
}
module.exports = { sendHeartbeat };
