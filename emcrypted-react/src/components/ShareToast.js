import React, { useEffect } from 'react';
import '../styles/ShareToast.css';

const ShareToast = ({ message, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onDismiss) onDismiss();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="shareToast" role="status" aria-live="polite">
      {message}
    </div>
  );
};

export default ShareToast;
