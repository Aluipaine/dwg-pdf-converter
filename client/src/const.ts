export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL - uses server-side OAuth routing
export const getLoginUrl = () => {
  return "/api/login";
};
