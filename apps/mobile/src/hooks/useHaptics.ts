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

  return { light, medium, selection, notificationSuccess };
}
