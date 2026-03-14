import type { Service } from 'bonjour-service';
import ServiceDetailsModal from '../components/ServiceDetailsModal.vue';

export function useServiceModal() {
  const overlay = useOverlay();
  const modal = overlay.create(ServiceDetailsModal);

  function open(service: Service) {
    modal.open({ service });
  }

  return { open };
}
