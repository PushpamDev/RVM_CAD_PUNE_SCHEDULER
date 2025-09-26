const getApiBaseUrl = () => {
  const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;

  // If the environment variable is not set, default to localhost for development.
  if (!rawBaseUrl) {
    return "http://localhost:3001";
  }

  // If the URL already starts with http:// or https://, use it as is.
  if (
    rawBaseUrl.startsWith("http://") ||
    rawBaseUrl.startsWith("https://")
  ) {
    return rawBaseUrl;
  }

  // For other cases (like just a domain name), assume https for production.
  return `https://${rawBaseUrl}`;
};

export const API_BASE_URL = getApiBaseUrl();