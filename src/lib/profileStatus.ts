/**
 * Completude das seções essenciais do perfil — fonte única para os indicadores
 * ("falta preencher") do sidebar, do hub "Mais" e da lista de seções do perfil.
 * Estrutural de propósito (aceita os dados de useProfile / useProviderProfile sem
 * acoplar aos tipos exatos).
 */
export interface ProfileStatusMe {
  name?: string | null;
  phone?: string | null;
  zipCode?: string | null;
  city?: string | null;
}
export interface ProfileStatusBiz {
  categoryIds: string[];
  companyName?: string | null;
  document?: string | null;
}

export interface ProfileSectionStatus {
  dados: boolean;
  empresa: boolean;
  endereco: boolean;
}

const filled = (v?: string | null) => Boolean(v && v.trim());

export function profileSectionStatus(me?: ProfileStatusMe | null, biz?: ProfileStatusBiz | null): ProfileSectionStatus {
  return {
    dados: filled(me?.name) && filled(me?.phone),
    empresa: Boolean(biz && biz.categoryIds.length > 0 && filled(biz.companyName) && filled(biz.document)),
    endereco: filled(me?.zipCode) && filled(me?.city),
  };
}

/** Quantas seções essenciais ainda faltam. */
export function profileMissingCount(s: ProfileSectionStatus): number {
  return (['dados', 'empresa', 'endereco'] as const).filter((k) => !s[k]).length;
}
