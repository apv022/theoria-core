import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaStatus() {
  const [install, setInstall] = useState<InstallEvent>();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    const listener = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", listener);
    return () => window.removeEventListener("beforeinstallprompt", listener);
  }, []);
  if (needRefresh)
    return (
      <div className="pwa-toast" role="status">
        <span>An update is ready.</span>
        <button className="button" onClick={() => void updateServiceWorker(true)}>
          Update
        </button>
        <button className="text-button" onClick={() => setNeedRefresh(false)}>
          Later
        </button>
      </div>
    );
  if (install)
    return (
      <button
        className="install-button"
        onClick={() => {
          void install
            .prompt()
            .then(() => install.userChoice)
            .then(() => setInstall(undefined));
        }}
      >
        Install Theoria
      </button>
    );
  return null;
}
