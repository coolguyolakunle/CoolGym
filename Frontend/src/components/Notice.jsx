import { useEffect } from 'react';

const styles = {
  success: 'bg-green-950 border-green-700 text-green-300',
  error: 'bg-red-950 border-red-700 text-red-300',
  info: 'bg-dark-700 border-gray-600 text-gray-300',
};

export default function Notice({ type = 'info', message, onDismiss }) {
  useEffect(() => {
    if (type !== 'success' || !message || !onDismiss) return undefined;

    const timeout = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timeout);
  }, [type, message, onDismiss]);

  if (!message) return null;
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm flex items-start justify-between gap-3 ${styles[type] || styles.info}`}>
      <span>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="opacity-60 hover:opacity-100">
          <i className="fa-solid fa-xmark" />
        </button>
      )}
    </div>
  );
}
