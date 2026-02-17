import { useAppStore } from '@/stores/appStore';

export default function Toast() {
  const toastMessage = useAppStore(s => s.toastMessage);

  if (!toastMessage) return null;

  return (
    <div className="toast show">
      {toastMessage}
    </div>
  );
}
