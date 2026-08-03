import api from "./axios";

/**
 * Pulls a file through the authenticated axios instance and saves it.
 *
 * window.open on an /api path cannot work here: it resolves against the site
 * origin rather than the API base URL, and it carries no Authorization header,
 * so every export it opened came back as a 404 page or a 401.
 */
export const downloadFile = async (url, filename, { params } = {}) => {
  const response = await api.get(url, { params, responseType: "blob" });

  const objectUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = objectUrl;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
};
