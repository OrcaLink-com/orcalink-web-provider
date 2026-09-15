import { useEffect, useState } from 'react';
import { useServiceArea, useSetServiceArea } from '../../lib/queries';
import { api } from '../../lib/api';
import { Button, Input, PageHeader, Spinner } from '../../components/ui';
import { FieldHint } from '../../components/FieldHint';
import { IconLocation, IconSuccess } from '../../components/icons';

const RADIUS_PRESETS = [5, 10, 20, 30, 50] as const;

export function ServiceAreaPage() {
  const areaQ = useServiceArea();
  const save = useSetServiceArea();

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(20);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [cep, setCep] = useState('');
  const [cepBusy, setCepBusy] = useState(false);
  const [cepInfo, setCepInfo] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!areaQ.data) return;
    setLat(areaQ.data.latitude);
    setLng(areaQ.data.longitude);
    setRadiusKm(areaQ.data.radiusKm ?? 20);
  }, [areaQ.data]);

  const hasPoint = lat != null && lng != null;

  async function pickByCep() {
    setGeoError(null);
    setCepInfo(null);
    setCepBusy(true);
    try {
      const r = await api.geocodeCep(cep.trim());
      setLat(r.latitude);
      setLng(r.longitude);
      setCepInfo(r.city ? `Local definido: ${r.city}${r.state ? `/${r.state}` : ''}.` : 'Local definido.');
    } catch (err) {
      setGeoError((err as Error).message);
    } finally {
      setCepBusy(false);
    }
  }

  function pickLocation() {
    if (!('geolocation' in navigator)) {
      setGeoError('Seu dispositivo não suporta geolocalização.');
      return;
    }
    setGeoBusy(true);
    setGeoError(null);
    setCepInfo(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setCepInfo('Local definido pela sua localização atual.');
        setGeoBusy(false);
      },
      (err) => {
        setGeoError(err.message || 'Não foi possível obter sua localização.');
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    if (lat == null || lng == null) {
      setGeoError('Defina o ponto base — use sua localização ou informe um CEP.');
      return;
    }
    await save.mutateAsync({ latitude: lat, longitude: lng, radiusKm });
    setSaved(true);
  }

  if (areaQ.isLoading) return <Spinner label="Carregando…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Área de atendimento"
        subtitle="Defina de onde você atende e até que distância. Só mostramos oportunidades dentro deste raio."
      />

      <form onSubmit={onSave} className="space-y-6">
        {/* Ponto base */}
        <div className="space-y-4">
          <div className="border-b border-border pb-2.5">
            <h2 className="text-sm font-semibold">Ponto base</h2>
            <p className="text-xs text-text-muted">O centro da sua área — normalmente onde você mora ou trabalha.</p>
          </div>

          <Button
            type="button"
            variant="secondary"
            full
            loading={geoBusy}
            startContent={<IconLocation size={16} />}
            onClick={pickLocation}
          >
            Usar minha localização
          </Button>

          <div className="flex items-end gap-2">
            <Input label="Ou informe um CEP" value={cep} onChange={setCep} placeholder="01001-000" />
            <Button
              type="button"
              variant="secondary"
              disabled={cepBusy || cep.replace(/\D/g, '').length !== 8}
              onClick={() => void pickByCep()}
            >
              {cepBusy ? 'Buscando…' : 'Usar CEP'}
            </Button>
          </div>

          {hasPoint && cepInfo && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-status-finished">
              <IconSuccess size={14} /> {cepInfo}
            </p>
          )}
          {geoError && <p className="text-xs text-danger">{geoError}</p>}

          {/* Ajuste fino (coordenadas) — recolhido por padrão */}
          <div>
            <button
              type="button"
              onClick={() => setShowManual((v) => !v)}
              className="text-xs font-medium text-primary hover:text-primary/80"
            >
              {showManual ? 'Ocultar coordenadas' : 'Inserir coordenadas manualmente'}
            </button>
            {showManual && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Input
                  label="Latitude"
                  type="number"
                  value={lat == null ? '' : String(lat)}
                  onChange={(v) => setLat(v === '' ? null : Number(v))}
                  placeholder="-23.55"
                />
                <Input
                  label="Longitude"
                  type="number"
                  value={lng == null ? '' : String(lng)}
                  onChange={(v) => setLng(v === '' ? null : Number(v))}
                  placeholder="-46.63"
                />
              </div>
            )}
          </div>
        </div>

        {/* Raio */}
        <div className="space-y-4">
          <h2 className="border-b border-border pb-2.5 text-sm font-semibold">Raio de atendimento</h2>
          <div className="flex flex-wrap items-center gap-2">
            {RADIUS_PRESETS.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setRadiusKm(r)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  radiusKm === r
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-text-muted hover:bg-content2'
                }`}
              >
                {r} km
              </button>
            ))}
            <label className="ml-auto flex items-center gap-1.5 text-sm text-text-muted">
              <input
                type="number"
                min={1}
                max={200}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Math.max(1, Math.min(200, Number(e.target.value))))}
                className="w-16 rounded-medium border border-border bg-content1 px-2 py-1 text-right text-sm text-foreground focus:border-primary focus:outline-none"
              />
              km
            </label>
          </div>
          <FieldHint>
            Um raio maior traz mais oportunidades, mas pode incluir deslocamentos mais longos. Comece pela
            distância que você realmente atende — dá para ajustar quando quiser.
          </FieldHint>
        </div>

        {save.isError && <p className="text-sm text-danger">{(save.error as Error).message}</p>}
        {saved && !save.isPending && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-status-finished">
            <IconSuccess size={16} /> Área salva. Seu feed de oportunidades já reflete o novo raio.
          </p>
        )}

        <Button type="submit" full loading={save.isPending} disabled={!hasPoint}>
          Salvar área
        </Button>
      </form>
    </div>
  );
}
