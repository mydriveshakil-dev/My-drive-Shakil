import { useCallback } from 'react';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

export function useHaptics() {
  const trigger = useCallback((pattern: keyof typeof hapticPatterns = 'click') => {
    triggerHaptic(hapticPatterns[pattern]);
  }, []);

  return { triggerHaptic: trigger, hapticPatterns };
}
