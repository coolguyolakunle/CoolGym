export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

async function request(path, { method = 'GET', body, isFormData = false } = {}) {
  const opts = {
    method,
    credentials: 'include', // send/receive the cross-site session cookie
    headers: {},
  };

  if (body !== undefined) {
    if (isFormData) {
      opts.body = body; // browser sets multipart headers
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }

  const res = await fetch(`${API_URL}${path}`, opts);
  const rawResponse = await res.text();
  let data = null;
  try {
    data = rawResponse ? JSON.parse(rawResponse) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = (data && data.message) || (data && data.error) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    if (isFormData) {
      const image = body?.get?.('image');
      console.error('[api upload] request failed', err, {
        path,
        status: err.status,
        statusText: res.statusText,
        imageName: image instanceof File ? image.name : null,
        imageType: image instanceof File ? image.type : null,
        imageSizeMB: image instanceof File ? Number((image.size / 1024 / 1024).toFixed(2)) : null,
        response: err.data,
        rawResponse,
      });
    }
    throw err;
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: body || {} }),
  postForm: (path, formData) => request(path, { method: 'POST', body: formData, isFormData: true }),
};
