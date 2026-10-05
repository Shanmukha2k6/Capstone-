import { useCallback, useEffect, useState } from "react";

const ROUTES = ["app", "login"];
const matches = (hash, name) => hash === `#/${name}` || hash.startsWith(`#/${name}/`);
export const isAppHash = (hash) => matches(hash, "app");
/** "#/app" → workspace, "#/login" → sign-in page, anything else → marketing site. */
export const routeFromHash = (hash) => ROUTES.find((name) => matches(hash, name)) || "home";
const readRoute = () => routeFromHash(window.location.hash);

export function useHashRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const onChange = () => setRoute(readRoute());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  const navigate = useCallback((next) => {
    window.location.hash = next === "home" ? "/" : `/${next}`;
    window.scrollTo(0, 0);
    setRoute(next);
  }, []);
  return [route, navigate];
}
