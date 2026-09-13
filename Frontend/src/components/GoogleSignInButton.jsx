import { useEffect, useRef, useState } from 'react';

const GIS_SCRIPT_ID = 'google-identity-services';

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.id) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let script = document.getElementById(GIS_SCRIPT_ID);
    if (!script) {
      script = document.createElement('script');
      script.id = GIS_SCRIPT_ID;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', () => reject(new Error('Google Sign-In could not be loaded.')), { once: true });
  });
}

export default function GoogleSignInButton({ onCredential, onError }) {
  const container = useRef(null);
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);
  const [loadError, setLoadError] = useState(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  onCredentialRef.current = onCredential;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!clientId) {
      setLoadError('Google Sign-In is not configured.');
      return undefined;
    }

    let cancelled = false;
    loadGoogleIdentityServices()
      .then(() => {
        if (cancelled || !container.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) onCredentialRef.current(response.credential);
            else onErrorRef.current?.(new Error('Google did not return a sign-in credential.'));
          },
        });
        window.google.accounts.id.renderButton(container.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: Math.max(container.current.clientWidth, 280),
        });
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error.message);
          onErrorRef.current?.(error);
        }
      });
    return () => { cancelled = true; };
  }, [clientId]);

  if (loadError) return <p className="text-center text-sm text-gray-500">{loadError}</p>;
  return <div ref={container} className="flex justify-center" aria-label="Continue with Google" />;
}
