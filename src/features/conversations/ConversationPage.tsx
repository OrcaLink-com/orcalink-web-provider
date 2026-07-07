import { useNavigate, useParams } from 'react-router-dom';
import { ConversationChat } from './ConversationChat';

/**
 * Rota dedicada da conversa (deep-link). O conteúdo vem de `ConversationChat`,
 * reusado também no `ConversationDrawer` a partir de Trabalhos / detalhe do orçamento.
 */
export function ConversationPage() {
  const { conversationId = '' } = useParams();
  const navigate = useNavigate();

  return (
    <div className="h-[calc(100dvh-9rem)] overflow-hidden rounded-2xl border border-border">
      <ConversationChat conversationId={conversationId} onBack={() => navigate('/app/negocios')} />
    </div>
  );
}
