/* SheCare API client — credentials use HTTP-only cookies and localStorage Bearer fallback. */
(function(){
  const base=(window.SHECARE_API_BASE||'').replace(/\/$/,'');
  async function request(path, options={}){
    const token = localStorage.getItem('sc_token');
    const headers = {
      ...(options.body ? {'Content-Type':'application/json'} : {}),
      ...(token ? {'Authorization': `Bearer ${token}`} : {}),
      ...(options.headers || {})
    };
    const opts = { ...options, credentials: 'include', headers };
    const r = await fetch(base + path, opts);
    let data = {};
    try { data = await r.json(); } catch {}
    if (!r.ok) {
      if (r.status === 401) localStorage.removeItem('sc_token');
      const e = new Error(data.error || `Request failed (${r.status})`);
      e.status = r.status;
      throw e;
    }
    const resPayload = data.data !== undefined ? data.data : data;
    if (resPayload && resPayload.token) {
      localStorage.setItem('sc_token', resPayload.token);
    }
    return resPayload;
  }

  const privatePages=['profile.html','onboarding.html'];
  const current=(location.pathname.split('/').slice(-2).join('/'))||'index.html';

  window.SheCareAPI={
    base,request,
    me:()=>request('/api/auth/me'),
    register:(data)=>request('/api/auth/register',{method:'POST',body:JSON.stringify(data)}),
    registerStart:(data)=>request('/api/auth/register/start',{method:'POST',body:JSON.stringify(data)}),
    verifyEmailOtp:(challengeId,code)=>request('/api/auth/register/verify-email',{method:'POST',body:JSON.stringify({challengeId,code})}),
    verifyPhoneOtp:(challengeId,tokenOrCode)=>request('/api/auth/register/verify-phone',{method:'POST',body:JSON.stringify(typeof tokenOrCode==='string'&&tokenOrCode.length<20?{challengeId,code:tokenOrCode}:{challengeId,idToken:tokenOrCode})}),
    verifyBoth:(challengeId,code)=>request('/api/auth/register/verify-both',{method:'POST',body:JSON.stringify({challengeId,code})}),
    completeRegistration:(challengeId)=>request('/api/auth/register/complete',{method:'POST',body:JSON.stringify({challengeId})}),
    sendLoginOtp:(id)=>request('/api/auth/login/otp/send',{method:'POST',body:JSON.stringify(typeof id==='string'?(id.includes('@')?{email:id}:{phone:id}):id)}),
    verifyLoginOtp:(data)=>request('/api/auth/login/otp/verify',{method:'POST',body:JSON.stringify(typeof data==='string'?{code:data}:data)}),
    sendPhoneLoginOtp:(phone)=>request('/api/auth/login/phone/send',{method:'POST',body:JSON.stringify(typeof phone==='string'?(phone.includes('@')?{email:phone}:{phone}):phone)}),
    verifyPhoneLoginOtp:(param)=>request('/api/auth/login/phone/verify',{method:'POST',body:JSON.stringify(typeof param==='string'?{code:param}:param)}),

    login:(data)=>request('/api/auth/login',{method:'POST',body:JSON.stringify(data)}),
    logout:()=>{ localStorage.removeItem('sc_token'); return request('/api/auth/logout',{method:'POST'}); },

    forgot:(email)=>request('/api/auth/forgot-password',{method:'POST',body:JSON.stringify({email})}),
    reset:(token,password)=>request('/api/auth/reset-password',{method:'POST',body:JSON.stringify({token,password})}),
    profile:{get:()=>request('/api/profile'),put:(data)=>request('/api/profile',{method:'PUT',body:JSON.stringify(data)}),delete:()=>request('/api/profile',{method:'DELETE'})},
    emergency:{list:()=>request('/api/emergency-contacts'),create:(d)=>request('/api/emergency-contacts',{method:'POST',body:JSON.stringify(d)}),update:(id,d)=>request('/api/emergency-contacts/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify(d)}),delete:(id)=>request('/api/emergency-contacts/'+encodeURIComponent(id),{method:'DELETE'})},
    sos:(d)=>request('/api/sos',{method:'POST',body:JSON.stringify(d||{})}),
    chat:(message,conversationId)=>request('/api/chat',{method:'POST',body:JSON.stringify(conversationId?{message,conversationId}:{message})}),
    pregnancy:{get:()=>request('/api/pregnancy'),save:(d)=>request('/api/pregnancy',{method:'POST',body:JSON.stringify(d)})},
    conversations:()=>request('/api/chat/conversations'),
    history:(limit=100)=>request('/api/history?limit='+encodeURIComponent(limit)),
    hospitalVisits:{list:()=>request('/api/hospital-visits'),create:(d)=>request('/api/hospital-visits',{method:'POST',body:JSON.stringify(d)}),delete:(id)=>request('/api/hospital-visits/'+encodeURIComponent(id),{method:'DELETE'})},
    hospitals:{nearby:(lat,lng,radius=25,specialty='all')=>request(`/api/hospitals/nearby?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radius=${encodeURIComponent(radius)}&specialty=${encodeURIComponent(specialty)}`)},
    wearables: {
      getProviders: () => request('/api/wearables/providers'),
      getStatus: (demo = false) => request(`/api/wearables/status${demo ? '?demo=true' : ''}`),
      connect: (data) => request('/api/wearables/connect', { method: 'POST', body: JSON.stringify(data) }),
      sync: (data) => request('/api/wearables/sync', { method: 'POST', body: JSON.stringify(data) }),
      generateDemo: (days = 7, metrics) => request('/api/wearables/demo/generate', { method: 'POST', body: JSON.stringify({ days, metrics }) }),
      getLatest: (demo = false) => request(`/api/wearables/latest${demo ? '?demo=true' : ''}`),
      getHistory: (metric = 'HEART_RATE', period = '7d', demo = false) => request(`/api/wearables/history?metric=${encodeURIComponent(metric)}&period=${encodeURIComponent(period)}${demo ? '&demo=true' : ''}`),
      getDailySummary: (days = 14, demo = false) => request(`/api/wearables/daily-summary?days=${encodeURIComponent(days)}${demo ? '&demo=true' : ''}`),
      disconnect: (provider, demo = false) => request('/api/wearables/disconnect', { method: 'POST', body: JSON.stringify({ provider, isDemo: demo }) }),
      revoke: (provider, purgeData = false, demo = false) => request('/api/wearables/revoke', { method: 'POST', body: JSON.stringify({ provider, purgeData, isDemo: demo }) }),
      getAlerts: () => request('/api/wearables/alerts'),
      dismissAlert: (id) => request(`/api/wearables/alerts/${encodeURIComponent(id)}/dismiss`, { method: 'POST' })
    },
    resource:(name)=>({list:()=>request('/api/'+name),create:(d)=>request('/api/'+name,{method:'POST',body:JSON.stringify(d)}),update:(id,d)=>request('/api/'+name+'/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify(d)}),delete:(id)=>request('/api/'+name+'/'+encodeURIComponent(id),{method:'DELETE'})})
  };
  document.addEventListener('DOMContentLoaded',()=>{ if(privatePages.includes(current)){ SheCareAPI.me().catch(e=>{if(e.status===401) location.href=location.pathname.includes('/pages/')?'../login.html':'login.html';}); } });
})();
