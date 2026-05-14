// API helper
const API = {
  token: localStorage.getItem('ms_token'),

  setToken(t) {
    this.token = t;
    if (t) localStorage.setItem('ms_token', t);
    else localStorage.removeItem('ms_token');
  },

  async req(method, url, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (this.token) opts.headers['Authorization'] = 'Bearer ' + this.token;
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      API.setToken(null);
      showPage('page-login');
      throw new Error('Session expired');
    }

    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },

  get: (url) => API.req('GET', url),
  post: (url, body) => API.req('POST', url, body),
  put: (url, body) => API.req('PUT', url, body),
  delete: (url) => API.req('DELETE', url),
};
