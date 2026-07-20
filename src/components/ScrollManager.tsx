import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previous = useRef(location.key);
  useEffect(() => {
    if (previous.current === location.key) return;
    previous.current = location.key;
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
    else if (navigationType !== "POP") window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.hash, location.key, navigationType]);
  return null;
}
