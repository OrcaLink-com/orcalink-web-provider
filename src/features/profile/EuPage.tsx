import { LuPencil } from 'react-icons/lu';
import { useAuth } from '../../auth/AuthContext';
import { useProfile, useRating } from '../../lib/queries';
import { Avatar, Button, ButtonLink, Card, ListRow, RatingStars } from '../../components/ui';
import { IconAgenda, IconArea, IconInbox, IconWallet, IconLogout } from '../../components/icons';

/** "Eu" do prestador: reputação + Meu negócio (área, agenda) + sair. */
export function EuPage() {
  const { user, logout } = useAuth();
  const ratingQ = useRating();
  const rating = ratingQ.data;
  const profile = useProfile();

  return (
    <div className="space-y-6">
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
        <ButtonLink to="/perfil" variant="secondary" size="sm" startContent={<LuPencil size={14} />}>
          Editar
        </ButtonLink>
      </div>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Meu negócio</h2>
        <Card className="divide-y divide-border p-0">
          <ListRow icon={<LuPencil size={18} />} title="Meu perfil" subtitle="Dados, negócio, endereço e senha" to="/perfil" />
          <ListRow icon={<IconWallet size={18} />} title="Financeiro" subtitle="Recebimentos e repasses" to="/financeiro" />
          <ListRow icon={<IconInbox size={18} />} title="Notificações" to="/inbox" />
          <ListRow icon={<IconArea size={18} />} title="Área de atendimento" to="/area" />
          <ListRow icon={<IconAgenda size={18} />} title="Disponibilidade & bloqueios" to="/agenda" />
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
