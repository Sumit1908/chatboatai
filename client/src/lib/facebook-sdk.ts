/**
 * Load the Meta / Facebook JS SDK only when a page needs embedded signup or FB login.
 * Avoids render-blocking + console noise on marketing pages.
 */
let loading: Promise<void> | null = null;

declare global {
  interface Window {
    FB?: {
      init: (opts: Record<string, unknown>) => void;
      login: (...args: unknown[]) => void;
      AppEvents?: { logPageView: () => void };
    };
    fbAsyncInit?: () => void;
    __FB_APP_ID__?: string;
  }
}

export function loadFacebookSdk(appId?: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.FB) {
    if (appId) {
      window.__FB_APP_ID__ = appId;
      window.FB.init({
        appId,
        cookie: true,
        xfbml: true,
        version: "v18.0",
      });
    }
    return Promise.resolve();
  }
  if (loading) return loading;

  if (appId) {
    window.__FB_APP_ID__ = appId;
  }

  loading = new Promise((resolve) => {
    window.fbAsyncInit = function () {
      if (window.FB) {
        window.FB.init({
          appId: window.__FB_APP_ID__ || "",
          cookie: true,
          xfbml: true,
          version: "v18.0",
        });
      }
      resolve();
    };

    const existing = document.getElementById("facebook-jssdk");
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.onload = () => {
      // fbAsyncInit may have already run
      if (window.FB) resolve();
    };
    document.body.appendChild(script);
  });

  return loading;
}
