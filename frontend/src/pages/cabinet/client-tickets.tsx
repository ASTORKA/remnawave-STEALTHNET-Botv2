import { Navigate } from "react-router-dom";

/** Старые ссылки `/cabinet/tickets` и кнопка Web App — открываем тот же чат поддержки, что и FAB в кабинете. */
export function ClientTicketsPage() {
  return <Navigate to="/cabinet/dashboard?support=1" replace />;
}
