import { useRef, useState } from 'react';

export const useSubmitLock = () => {
  const lockRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runWithSubmitLock = async (callback) => {
    if (lockRef.current) {
      return false;
    }

    lockRef.current = true;
    setIsSubmitting(true);

    try {
      await callback();
      return true;
    } finally {
      lockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    runWithSubmitLock
  };
};

export default useSubmitLock;