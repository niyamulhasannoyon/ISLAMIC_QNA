import * as Haptics from 'expo-haptics';

export function useHaptics() {
  const light = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const medium = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  };

  const heavy = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
  };

  const selection = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
  };

  const notificationSuccess = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  return { light, medium, heavy, selection, notificationSuccess };
}
