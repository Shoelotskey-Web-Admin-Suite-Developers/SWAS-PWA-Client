import { useRef } from "react";

export function useDropdownHandlers(setter: React.Dispatch<React.SetStateAction<boolean>>) {
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const enterTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  return {
    onClick: () => setter(prev => !prev),

    onMouseEnter: () => {
      // Cancel leave timeout
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
        leaveTimeoutRef.current = null;
      }

      // Set enter delay
      enterTimeoutRef.current = setTimeout(() => {
        setter(true);
      }, 300); // 🕒 delay before showing
    },

    onMouseLeave: () => {
      // Cancel enter timeout
      if (enterTimeoutRef.current) {
        clearTimeout(enterTimeoutRef.current);
        enterTimeoutRef.current = null;
      }

      leaveTimeoutRef.current = setTimeout(() => {
        setter(false);
      }, 300); // 🕒 delay before hiding
    },
  };
}
