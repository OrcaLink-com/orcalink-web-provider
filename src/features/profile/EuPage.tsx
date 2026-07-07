import { useState } from 'react';
import { LuHeadphones, LuPencil, LuDownload } from 'react-icons/lu';
import { useAuth } from '../../auth/AuthContext';
import { useProfile, useRating } from '../../lib/queries';
import { Avatar, Button, ButtonLink, Card, ListRow, RatingStars } from '../../components/ui';
import { ContactModal } from '../../components/ContactModal';
import { InstallGuide } from '../../components/InstallGuide';
import { IconAgenda, IconArea, IconInbox, IconWallet, IconLogout } from '../../components/icons';

/** "Eu" do prestador: reputação + Meu negócio (área, agenda) + sair. */
export function EuPage() {
  const { user, logout } = useAuth();
  const ratingQ = useRating();
  const rating = ratingQ.data;
  const profile = useProfile();
  const [contactOpen, setContactOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);

  return (
    <div className="space-y-6">
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} authenticated />
      <InstallGuide open={installOpen} onClose={() => setInstallOpen(false)} />
      <div className="flex items-center gap-4">
        <Avatar name={user?.name ?? 'Você'} src={profile.data?.avatarUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold">{user?.name ?? 'Você'}</p>
          {rating && rating.ratingCount > 0 ? (
            <RatingStars value={rating.ratingAvg} count={rating.ratingCount} />
          ) : (
            <p className="text-xs text-text-muted">Profissional · sem avaliações ainda</p>
          )}
        </div>
        <ButtonLink to="/app/perfil" variant="secondary" size="sm" startContent={<LuPencil size={14} />}>
          Editar
        </ButtonLink>
      </div>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Meu negócio</h2>
        <Card className="divide-y divide-border p-0">
          <ListRow icon={<LuPencil size={18} />} title="Meu perfil" subtitle="Dados, negócio, endereço e senha" to="/app/perfil" />
          <ListRow icon={<IconWallet size={18} />} title="Financeiro" subtitle="Recebimentos e repasses" to="/app/financeiro" />
          <ListRow icon={<IconInbox size={18} />} title="Notificações" to="/app/inbox" />
          <ListRow icon={<IconArea size={18} />} title="Área de atendimento" to="/app/area" />
          <ListRow icon={<IconAgenda size={18} />} title="Disponibilidade & bloqueios" to="/app/agenda" />
          <ListRow
            icon={<LuDownload size={18} />}
            title="Instalar o app"
            subtitle="Adicione à tela inicial (Android e iPhone)"
            onClick={() => setInstallOpen(true)}
          />
          <ListRow
            icon={<LuHeadphones size={18} />}
            title="Falar com a Orca Link"
            subtitle="Dúvidas, suporte, comercial"
            onClick={() => setContactOpen(true)}
          />
        </Card>
      </section>

      <Button
        variant="secondary"
        full
        onClick={() => void logout()}
        startContent={<IconLogout size={16} />}
        className="text-danger"
      >
        Sair
      </Button>
    </div>
  );
}
