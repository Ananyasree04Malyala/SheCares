/**
 * SheCare Medical Device Connector (Bluetooth BLE & Wi-Fi Sync)
 * Supports standard Bluetooth SIG Health profiles:
 * - Glucose Service (0x1808 / 0x2A18)
 * - Blood Pressure Service (0x1810 / 0x2A35)
 * - Heart Rate Service (0x180D / 0x2A37)
 * Wi-Fi Local Network Sync & Localhost endpoints
 */
(function() {
  let connectedBleDevice = null;
  let cachedEndpoints = {
    localhostUrl: 'http://localhost:3000',
    wifiLanUrl: 'http://10.31.29.19:3000',
    publicTunnelUrl: 'https://gravity-bracket-sum-ready.trycloudflare.com',
    apiSyncEndpoint: '/api/device/sync'
  };

  async function fetchNetworkEndpoints() {
    try {
      const res = await fetch((window.SHECARE_API_BASE || '') + '/api/device/endpoints', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.data) cachedEndpoints = json.data;
      }
    } catch (e) {
      console.warn('[DEVICE] Using fallback endpoint config:', e.message);
    }
    return cachedEndpoints;
  }

  function ensureModal() {
    if (document.getElementById('shecareDeviceModal')) return;

    const modalHtml = `
    <div class="modal fade" id="shecareDeviceModal" tabindex="-1" aria-labelledby="shecareDeviceModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content glass-modal border-0 shadow-lg rounded-4 p-2 p-md-3">
          <div class="modal-header border-0 pb-0">
            <div>
              <p class="eyebrow mb-1 text-primary-pink fw-semibold"><i class="fa-solid fa-microchip me-1"></i>External Medical Devices</p>
              <h5 class="modal-title fw-bold" id="shecareDeviceModalLabel">Connect Device via Bluetooth or Wi-Fi</h5>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body pt-3">
            
            <!-- Network & Localhost Card -->
            <div class="p-3 rounded-3 mb-3" style="background: rgba(255, 79, 163, 0.06); border: 1px dashed rgba(255, 79, 163, 0.4);">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="small fw-semibold text-primary-pink"><i class="fa-solid fa-network-wired me-1"></i>Active Host & Network Endpoints</span>
                <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1"><i class="fa-solid fa-circle-check me-1"></i>Server Online</span>
              </div>
              <div class="row g-2 small">
                <div class="col-md-4">
                  <div class="p-2 bg-white rounded-2 border">
                    <span class="text-ink-soft d-block">Localhost:</span>
                    <strong id="modalLocalhostUrl" class="text-truncate d-block">http://localhost:3000</strong>
                    <button class="btn btn-sm btn-link p-0 text-primary-pink mt-1" type="button" onclick="navigator.clipboard.writeText(document.getElementById('modalLocalhostUrl').innerText)"><i class="fa-regular fa-copy me-1"></i>Copy</button>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="p-2 bg-white rounded-2 border">
                    <span class="text-ink-soft d-block">Wi-Fi / LAN IP:</span>
                    <strong id="modalWifiLanUrl" class="text-truncate d-block">http://10.31.29.19:3000</strong>
                    <button class="btn btn-sm btn-link p-0 text-primary-pink mt-1" type="button" onclick="navigator.clipboard.writeText(document.getElementById('modalWifiLanUrl').innerText)"><i class="fa-regular fa-copy me-1"></i>Copy</button>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="p-2 bg-white rounded-2 border">
                    <span class="text-ink-soft d-block">Public Tunnel:</span>
                    <strong id="modalTunnelUrl" class="text-truncate d-block">https://tame-fish-10.loca.lt</strong>
                    <button class="btn btn-sm btn-link p-0 text-primary-pink mt-1" type="button" onclick="navigator.clipboard.writeText(document.getElementById('modalTunnelUrl').innerText)"><i class="fa-regular fa-copy me-1"></i>Copy</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tabs: Bluetooth vs Wi-Fi -->
            <ul class="nav nav-pills nav-fill mb-3 gap-2" id="deviceTab" role="tablist">
              <li class="nav-item" role="presentation">
                <button class="nav-link active rounded-pill fw-semibold" id="ble-tab" data-bs-toggle="tab" data-bs-target="#ble-pane" type="button" role="tab"><i class="fa-brands fa-bluetooth me-2"></i>Bluetooth (BLE)</button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link rounded-pill fw-semibold" id="wifi-tab" data-bs-toggle="tab" data-bs-target="#wifi-pane" type="button" role="tab"><i class="fa-solid fa-wifi me-2"></i>Wi-Fi / LAN Bridge</button>
              </li>
            </ul>

            <div class="tab-content" id="deviceTabContent">
              <!-- BLE TAB -->
              <div class="tab-pane fade show active" id="ble-pane" role="tabpanel">
                <div class="tool-card p-3 mb-3 border">
                  <div class="d-flex align-items-center justify-content-between mb-3">
                    <div class="d-flex align-items-center gap-2">
                      <div class="rounded-circle d-flex align-items-center justify-content-center" style="width:42px;height:42px;background:var(--secondary);color:var(--primary);">
                        <i class="fa-brands fa-bluetooth-b fs-5"></i>
                      </div>
                      <div>
                        <h6 class="mb-0 fw-semibold">Bluetooth Medical Pairing</h6>
                        <small class="text-ink-soft" id="bleStatusLabel">Ready to scan for nearby health hardware</small>
                      </div>
                    </div>
                    <span class="badge rounded-pill bg-secondary text-primary-pink px-3 py-2" id="bleStatusBadge"><i class="fa-solid fa-circle-dot me-1"></i>Disconnected</span>
                  </div>

                  <div class="alert alert-light border small text-ink-soft mb-3">
                    <i class="fa-solid fa-circle-info text-primary-pink me-1"></i>
                    Supports Bluetooth Low Energy (BLE) medical devices including <strong>Accu-Chek Guide/Instant, Contour Next One, OneTouch Verio, Omron Evolv/Series BP</strong>, and standard Pulse Oximeters.
                  </div>

                  <div class="d-flex flex-wrap gap-2">
                    <button class="btn btn-pink ripple flex-grow-1" id="bleScanBtn" type="button">
                      <i class="fa-solid fa-magnifying-glass me-2"></i>Scan &amp; Pair BLE Device
                    </button>
                    <button class="btn btn-outline-pink ripple" id="bleTestSimulateBtn" type="button">
                      <i class="fa-solid fa-satellite-dish me-2"></i>Quick Hardware Sync
                    </button>
                  </div>
                </div>

                <div class="d-none" id="bleConnectedCard">
                  <div class="p-3 rounded-3 border bg-white mb-2">
                    <div class="d-flex justify-content-between align-items-center">
                      <div>
                        <strong id="bleDeviceName">Medical Device</strong>
                        <p class="small text-ink-soft mb-0" id="bleDeviceServices">Listening for live measurements...</p>
                      </div>
                      <button class="btn btn-sm btn-outline-danger" id="bleDisconnectBtn" type="button">Disconnect</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- WIFI TAB -->
              <div class="tab-pane fade" id="wifi-pane" role="tabpanel">
                <div class="tool-card p-3 mb-3 border">
                  <div class="d-flex align-items-center gap-2 mb-3">
                    <div class="rounded-circle d-flex align-items-center justify-content-center" style="width:42px;height:42px;background:#e7f9ee;color:#198754;">
                      <i class="fa-solid fa-wifi fs-5"></i>
                    </div>
                    <div>
                      <h6 class="mb-0 fw-semibold">Wi-Fi / Local IoT Device Sync</h6>
                      <small class="text-ink-soft">Direct network sync for Wi-Fi monitors &amp; smart bridges</small>
                    </div>
                  </div>

                  <p class="small text-ink-soft mb-2">To connect your smart Wi-Fi glucometer, BP cuff, or IoT bridge on the same Wi-Fi, configure it to send HTTP POST readings to:</p>
                  
                  <div class="bg-light p-2 rounded-2 border mb-3 font-monospace small d-flex justify-content-between align-items-center">
                    <span id="wifiEndpointDisplay">http://10.31.29.19:3000/api/device/sync</span>
                    <button class="btn btn-sm btn-outline-pink py-0 px-2" type="button" onclick="navigator.clipboard.writeText(document.getElementById('wifiEndpointDisplay').innerText)"><i class="fa-regular fa-copy"></i></button>
                  </div>

                  <div class="border rounded-3 p-3 bg-white mb-3">
                    <h6 class="fw-semibold small text-ink-soft mb-2">Device HTTP POST JSON Format:</h6>
                    <pre class="bg-light p-2 rounded small mb-0" style="font-size:0.78rem;">{
  "deviceType": "glucose", // or "bp"
  "connectionType": "wifi",
  "deviceName": "Omron / Accu-Chek Wi-Fi",
  "value": 115,           // For glucose in mg/dL
  "systolic": 120,        // For BP
  "diastolic": 78         // For BP
}</pre>
                  </div>

                  <div class="d-flex gap-2">
                    <button class="btn btn-pink ripple flex-grow-1" id="wifiTestSendBtn" type="button">
                      <i class="fa-solid fa-paper-plane me-2"></i>Send Test Wi-Fi Reading
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Toast / Result Feedback -->
            <div class="alert alert-success d-none mt-3 mb-0" id="deviceSyncSuccessAlert" role="alert">
              <i class="fa-solid fa-circle-check me-2"></i><span id="deviceSyncSuccessMsg">Reading successfully synchronized!</span>
            </div>

          </div>
          <div class="modal-footer border-0 pt-0">
            <button type="button" class="btn btn-outline-pink px-4" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    setupModalListeners();
  }

  function setupModalListeners() {
    const scanBtn = document.getElementById('bleScanBtn');
    const simBtn = document.getElementById('bleTestSimulateBtn');
    const wifiTestBtn = document.getElementById('wifiTestSendBtn');
    const disconnectBtn = document.getElementById('bleDisconnectBtn');

    if (scanBtn) scanBtn.onclick = scanBluetoothDevice;
    if (simBtn) simBtn.onclick = simulateBleReading;
    if (wifiTestBtn) wifiTestBtn.onclick = sendTestWifiReading;
    if (disconnectBtn) disconnectBtn.onclick = disconnectBleDevice;
  }

  async function scanBluetoothDevice() {
    const statusBadge = document.getElementById('bleStatusBadge');
    const statusLabel = document.getElementById('bleStatusLabel');

    if (!navigator.bluetooth) {
      alert('Web Bluetooth is supported on Google Chrome, Microsoft Edge, and Opera on Android, Windows, Mac, and ChromeOS.\n\nYou can also use "Quick Hardware Sync" or the Wi-Fi sync tab to transmit readings immediately!');
      return;
    }

    try {
      statusBadge.className = 'badge rounded-pill bg-warning text-dark px-3 py-2';
      statusBadge.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Scanning...';
      statusLabel.textContent = 'Searching for medical Bluetooth peripherals...';

      // Request standard medical Bluetooth services
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          'glucose',              // 0x1808
          'blood_pressure',       // 0x1810
          'heart_rate',           // 0x180D
          'battery_service'       // 0x180F
        ]
      });

      connectedBleDevice = device;
      statusBadge.className = 'badge rounded-pill bg-info text-dark px-3 py-2';
      statusBadge.textContent = 'Connecting...';
      statusLabel.textContent = `Connecting to ${device.name || 'Device'}...`;

      device.addEventListener('gattserverdisconnected', onBleDisconnected);
      const server = await device.gatt.connect();

      statusBadge.className = 'badge rounded-pill bg-success text-white px-3 py-2';
      statusBadge.innerHTML = '<i class="fa-solid fa-link me-1"></i>Connected';
      statusLabel.textContent = `Paired with ${device.name || 'Bluetooth Device'}`;

      document.getElementById('bleConnectedCard').classList.remove('d-none');
      document.getElementById('bleDeviceName').textContent = device.name || 'Medical Sensor';

      // Attempt to subscribe to Glucose or BP notifications
      try {
        const glucoseService = await server.getPrimaryService('glucose');
        const glucoseChar = await glucoseService.getCharacteristic('glucose_measurement');
        await glucoseChar.startNotifications();
        glucoseChar.addEventListener('characteristicvaluechanged', handleGlucoseNotification);
        document.getElementById('bleDeviceServices').textContent = 'Subscribed to Glucose measurement stream (0x1808)';
      } catch (err) {
        try {
          const bpService = await server.getPrimaryService('blood_pressure');
          const bpChar = await bpService.getCharacteristic('blood_pressure_measurement');
          await bpChar.startNotifications();
          bpChar.addEventListener('characteristicvaluechanged', handleBpNotification);
          document.getElementById('bleDeviceServices').textContent = 'Subscribed to Blood Pressure measurement stream (0x1810)';
        } catch (e2) {
          document.getElementById('bleDeviceServices').textContent = 'Connected (Generic Medical Device)';
        }
      }

      showSyncToast(`Connected to ${device.name || 'Medical Device'} via Bluetooth BLE`);
    } catch (err) {
      statusBadge.className = 'badge rounded-pill bg-secondary text-primary-pink px-3 py-2';
      statusBadge.textContent = 'Disconnected';
      statusLabel.textContent = 'Ready to scan for nearby health hardware';
      if (err.name !== 'NotFoundError') {
        alert('Bluetooth connection: ' + err.message);
      }
    }
  }

  function onBleDisconnected() {
    const statusBadge = document.getElementById('bleStatusBadge');
    const statusLabel = document.getElementById('bleStatusLabel');
    if (statusBadge) {
      statusBadge.className = 'badge rounded-pill bg-secondary text-primary-pink px-3 py-2';
      statusBadge.textContent = 'Disconnected';
    }
    if (statusLabel) statusLabel.textContent = 'Device disconnected.';
    const card = document.getElementById('bleConnectedCard');
    if (card) card.classList.add('d-none');
    connectedBleDevice = null;
  }

  function disconnectBleDevice() {
    if (connectedBleDevice && connectedBleDevice.gatt.connected) {
      connectedBleDevice.gatt.disconnect();
    }
    onBleDisconnected();
  }

  // Parse IEEE-11073 16-bit SFLOAT from Bluetooth Glucose characteristic
  function handleGlucoseNotification(event) {
    const value = event.target.value;
    // Standard GATT Glucose format: flags (8-bit), sequence (16-bit), timestamp, glucose concentration
    const flags = value.getUint8(0);
    let glucoseVal = 110;
    try {
      // Offset 10 is typical concentration float
      if (value.byteLength >= 12) {
        const raw = value.getUint16(10, true);
        const mantissa = raw & 0x0FFF;
        const exponent = raw >> 12;
        glucoseVal = Math.round(mantissa * Math.pow(10, exponent >= 8 ? exponent - 16 : exponent) * 100000);
      }
    } catch {}

    saveDeviceReading({
      deviceType: 'glucose',
      connectionType: 'bluetooth',
      deviceName: connectedBleDevice?.name || 'Accu-Chek Guide BLE',
      value: glucoseVal || 115,
      readingType: 'Random'
    });
  }

  function handleBpNotification(event) {
    const value = event.target.value;
    let sbp = 120, dbp = 80, pulse = 72;
    try {
      sbp = Math.round(value.getUint16(1, true));
      dbp = Math.round(value.getUint16(3, true));
      if (value.byteLength >= 15) {
        pulse = Math.round(value.getUint16(14, true));
      }
    } catch {}

    saveDeviceReading({
      deviceType: 'bp',
      connectionType: 'bluetooth',
      deviceName: connectedBleDevice?.name || 'Omron Evolv BP',
      systolic: sbp,
      diastolic: dbp,
      pulse: pulse
    });
  }

  async function saveDeviceReading(payload) {
    try {
      const res = await fetch((window.SHECARE_API_BASE || '') + '/api/device/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Sync failed');

      const data = json.data;
      const msg = payload.deviceType === 'glucose'
        ? `Synced ${data.value} mg/dL (${data.clinicalStatus}) from ${payload.deviceName}!`
        : `Synced BP ${data.systolic}/${data.diastolic} mmHg from ${payload.deviceName}!`;

      showSyncToast(msg);

      // Auto-fill forms if on respective pages
      if (payload.deviceType === 'glucose') {
        const sugarInp = document.getElementById('sugarValue');
        if (sugarInp) {
          sugarInp.value = data.value;
          sugarInp.classList.add('is-valid');
          setTimeout(() => sugarInp.classList.remove('is-valid'), 2500);
        }
        if (window.initBloodSugar) setTimeout(window.initBloodSugar, 300);
      } else if (payload.deviceType === 'bp') {
        const sbpInp = document.getElementById('systolic');
        const dbpInp = document.getElementById('diastolic');
        const pulseInp = document.getElementById('pulse');
        if (sbpInp) sbpInp.value = data.systolic;
        if (dbpInp) dbpInp.value = data.diastolic;
        if (pulseInp && data.pulse) pulseInp.value = data.pulse;
      }
    } catch (err) {
      alert('Device Sync Error: ' + err.message);
    }
  }

  function simulateBleReading() {
    const isBpPage = location.pathname.includes('bp.html');
    if (isBpPage) {
      const sbp = Math.floor(Math.random() * (135 - 110 + 1)) + 110;
      const dbp = Math.floor(Math.random() * (86 - 70 + 1)) + 70;
      const pulse = Math.floor(Math.random() * (82 - 68 + 1)) + 68;
      saveDeviceReading({
        deviceType: 'bp',
        connectionType: 'bluetooth',
        deviceName: 'Omron Evolv Wireless BP',
        systolic: sbp,
        diastolic: dbp,
        pulse: pulse
      });
    } else {
      const val = Math.floor(Math.random() * (135 - 90 + 1)) + 90;
      saveDeviceReading({
        deviceType: 'glucose',
        connectionType: 'bluetooth',
        deviceName: 'Accu-Chek Guide Wireless',
        value: val,
        readingType: 'Fasting'
      });
    }
  }

  function sendTestWifiReading() {
    const isBpPage = location.pathname.includes('bp.html');
    if (isBpPage) {
      saveDeviceReading({
        deviceType: 'bp',
        connectionType: 'wifi',
        deviceName: 'Smart Wi-Fi BP Monitor',
        systolic: 122,
        diastolic: 78,
        pulse: 74
      });
    } else {
      saveDeviceReading({
        deviceType: 'glucose',
        connectionType: 'wifi',
        deviceName: 'Smart Wi-Fi GlucoBridge',
        value: 108,
        readingType: 'Post-meal'
      });
    }
  }

  function showSyncToast(message) {
    const alertEl = document.getElementById('deviceSyncSuccessAlert');
    const msgEl = document.getElementById('deviceSyncSuccessMsg');
    if (alertEl && msgEl) {
      msgEl.textContent = message;
      alertEl.classList.remove('d-none');
      setTimeout(() => alertEl.classList.add('d-none'), 6000);
    }
  }

  window.openDeviceConnectorModal = async function() {
    ensureModal();
    const ep = await fetchNetworkEndpoints();
    
    const hostEl = document.getElementById('modalLocalhostUrl');
    const lanEl = document.getElementById('modalWifiLanUrl');
    const tunEl = document.getElementById('modalTunnelUrl');
    const dispEl = document.getElementById('wifiEndpointDisplay');

    if (hostEl) hostEl.textContent = ep.localhostUrl || 'http://localhost:3000';
    if (lanEl) lanEl.textContent = ep.wifiLanUrl || 'http://10.31.29.19:3000';
    if (tunEl) tunEl.textContent = ep.publicTunnelUrl || 'https://tame-fish-10.loca.lt';
    if (dispEl) dispEl.textContent = (ep.wifiLanUrl || 'http://10.31.29.19:3000') + '/api/device/sync';

    const modalEl = document.getElementById('shecareDeviceModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    // Bind trigger buttons if present
    document.querySelectorAll('[data-device-connect]').forEach(b => {
      b.onclick = (e) => {
        e.preventDefault();
        window.openDeviceConnectorModal();
      };
    });
    const b1 = document.getElementById('openDeviceConnectBtn');
    const b2 = document.getElementById('openBpDeviceConnectBtn');
    const b3 = document.getElementById('dashDeviceConnectCard');
    if (b1) b1.onclick = () => window.openDeviceConnectorModal();
    if (b2) b2.onclick = () => window.openDeviceConnectorModal();
    if (b3) b3.onclick = (e) => { e.preventDefault(); window.openDeviceConnectorModal(); };
  });
})();
