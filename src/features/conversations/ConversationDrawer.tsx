import { Drawer, DrawerContent, DrawerBody } from '@heroui/react';
import { ConversationChat } from './ConversationChat';

interface ConversationDrawerProps {
  /** Conversa a exibir; quando null o drawer fica fechado. */
  conversationId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Conversa do prestador em um Drawer lateral — abre por cima de Trabalhos /
 * detalhe do orçamento sem navegar de página. Reusa `ConversationChat`.
 */
export function ConversationDrawer({ conversationId, isOpen, onClose }: ConversationDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen && Boolean(conversationId)}
      onClose={onClose}
      placement="right"
      size="lg"
      hideCloseButton
      backdrop="blur"
      classNames={{ base: 'bg-background', body: 'p-0' }}
    >
      <DrawerContent>
        <DrawerBody className="flex min-h-0 flex-col p-0">
          {conversationId && <ConversationChat conversationId={conversationId} onBack={onClose} />}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
