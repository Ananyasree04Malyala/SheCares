const os = require('os');
const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');
const { recordHistory } = require('./history');
const realtime = require('./realtimeService');

// Dynamically determine host addresses (localhost, Wi-Fi LAN IP, and Tunnel)
function getNetworkEndpoints() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ interface: name, ip: iface.address });
      }
    }
  }

  // Priority to real Wi-Fi / WLAN interface
  const primaryLan = addresses.find(a => /wi-?fi|wireless|wlan/i.test(a.interface)) || addresses.find(a => !/virtual|vethernet|host-only/i.test(a.interface)) || addresses[0] || { ip: '127.0.0.1' };

  let tunnelUrl = null;
  let tunnelPassword = null;
  try {
    const statusPath = path.join(__dirname, '../../scratch/tunnel_status.json');
    if (fs.existsSync(statusPath)) {
      const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
      if (status.status === 'online' && status.tunnelUrl) {
        tunnelUrl = status.tunnelUrl;
        tunnelPassword = status.tunnelPassword;
      }
    }
  } catch {}

  return {
    localhostUrl: 'http://localhost:3000',
    wifiLanUrl: `http://${primaryLan.ip}:3000`,
    wifiIp: primaryLan.ip,
    port: 3000,
    publicTunnelUrl: tunnelUrl,
    tunnelPassword: tunnelPassword,
    apiSyncEndpoint: '/api/device/sync',
    allInterfaces: addresses
  };
}

async function processDeviceSync({ userId, deviceType, connectionType, deviceName, data }) {
  if (!deviceType) throw new Error('deviceType is required (glucose or bp)');
  connectionType = connectionType || 'bluetooth';
  deviceName = deviceName || (connectionType === 'bluetooth' ? 'Bluetooth Medical Device' : 'Wi-Fi Health Monitor');

  let result = null;
  let historyDetails = '';

  if (deviceType === 'glucose') {
    const val = Number(data.value);
    if (!val || val < 10 || val > 1000) {
      throw new Error('Valid glucose reading (10-1000 mg/dL) required.');
    }
    const readingType = data.readingType || 'Random';
    const notes = `Synced via ${connectionType.toUpperCase()} from ${deviceName}`;

    result = await prisma.glucoseRecord.create({
      data: {
        userId,
        value: val,
        readingType,
        notes
      }
    });

    historyDetails = `Glucose: ${val} mg/dL (${readingType}) via ${connectionType.toUpperCase()} [${deviceName}]`;
    await recordHistory({
      userId,
      action: 'SYNC',
      module: 'Diabetic Care',
      title: 'Device Sync: Blood Glucose',
      details: historyDetails,
      entityId: result.id
    });

    // Clinical status
    let status = 'Normal';
    let alertLevel = 'routine';
    if (val < 54) { status = 'Critical Hypoglycemia'; alertLevel = 'emergency'; }
    else if (val < 70) { status = 'Hypoglycemia'; alertLevel = 'urgent'; }
    else if (val > 300) { status = 'Severe Hyperglycemia'; alertLevel = 'emergency'; }
    else if (val >= 200) { status = 'High Glucose'; alertLevel = 'urgent'; }
    else if (val > 140) { status = 'Elevated'; alertLevel = 'moderate'; }

    const output = {
      record: result,
      deviceType: 'glucose',
      deviceName,
      connectionType,
      value: val,
      unit: 'mg/dL',
      clinicalStatus: status,
      alertLevel,
      syncedAt: new Date().toISOString()
    };

    try {
      realtime.broadcast('device_reading', output, userId || null);
    } catch {}

    return output;
  } else if (deviceType === 'bp') {
    const sbp = Number(data.systolic);
    const dbp = Number(data.diastolic);
    const pulse = data.pulse ? Number(data.pulse) : null;

    if (!sbp || sbp < 40 || sbp > 320) throw new Error('Valid systolic reading (40-320 mmHg) required.');
    if (!dbp || dbp < 30 || dbp > 220) throw new Error('Valid diastolic reading (30-220 mmHg) required.');

    const notes = `Synced via ${connectionType.toUpperCase()} from ${deviceName}`;

    result = await prisma.bloodPressureRecord.create({
      data: {
        userId,
        systolic: sbp,
        diastolic: dbp,
        pulse,
        notes
      }
    });

    historyDetails = `BP: ${sbp}/${dbp} mmHg${pulse ? `, Pulse: ${pulse} bpm` : ''} via ${connectionType.toUpperCase()} [${deviceName}]`;
    await recordHistory({
      userId,
      action: 'SYNC',
      module: 'Blood Pressure',
      title: 'Device Sync: Blood Pressure',
      details: historyDetails,
      entityId: result.id
    });

    // Clinical classification
    let status = 'Normal';
    let alertLevel = 'routine';
    if (sbp >= 180 || dbp >= 120) { status = 'Hypertensive Crisis Range'; alertLevel = 'emergency'; }
    else if (sbp >= 140 || dbp >= 90) { status = 'Stage 2 Hypertension'; alertLevel = 'urgent'; }
    else if (sbp >= 130 || dbp >= 80) { status = 'Stage 1 Hypertension'; alertLevel = 'moderate'; }
    else if (sbp >= 120 && dbp < 80) { status = 'Elevated Blood Pressure'; alertLevel = 'routine'; }

    const output = {
      record: result,
      deviceType: 'bp',
      deviceName,
      connectionType,
      systolic: sbp,
      diastolic: dbp,
      pulse,
      unit: 'mmHg',
      clinicalStatus: status,
      alertLevel,
      syncedAt: new Date().toISOString()
    };

    try {
      realtime.broadcast('device_reading', output, userId || null);
    } catch {}

    return output;
  }

  throw new Error(`Unsupported device type: ${deviceType}`);
}

module.exports = { getNetworkEndpoints, processDeviceSync };
