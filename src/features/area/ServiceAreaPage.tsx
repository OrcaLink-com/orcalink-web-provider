import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useServiceArea, useSetServiceArea } from '../../lib/queries';
import { api } from '../../lib/api';

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
  const [saved, setSaved] = useState(false);

  async function pickByCep() {
    setGeoError(null);
    setCepInfo(null);
    setCepBusy(true);
    try {
      const r = await api.geocodeCep(cep.trim());
      setLat(r.latitude);
      setLng(r.longitude);
      setCepInfo(
        r.city ? `Coordenadas de ${r.city}${r.state ? `/${r.state}` : ''} aplicadas.` : 'Coordenadas aplicadas.',
      );
    } catch (err) {
      setGeoError((err as Error).message);
    } finally {
      setCepBusy(false);
    }
  }

  useEffect(() => {
    if (!areaQ.data) return;
    setLat(areaQ.data.latitude);
    setLng(areaQ.data.longitude);
    setRadiusKm(areaQ.data.radiusKm ?? 20);
  }, [areaQ.data]);

  function pickLocation() {
    if (!('geolocation' in navigator)) {
      setGeoError('Seu dispositivo não suporta geolocalização.');
      return;
    }
    setGeoBusy(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
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
      setGeoError('Defina um ponto base (use sua localização ou digite as coordenadas).');
      return;
    }
    await save.mutateAsync({ latitude: lat, longitude: lng, radiusKm });
    setSaved(true);
  }

  if (areaQ.isLoading) return <p className="text-text-muted">Carregando…</p>;

  return (
    <div className="space-y-3">
      <Link to="/app" className="text-sm text-text-muted underline">
        ← Início
      </Link>
      <h1 className="text-xl font-semibold">Área de atendimento</h1>
      <p className="text-sm text-text-muted">
        Você só recebe oportunidades dentro deste raio (docs/ux/10).
      </p>

      <form onSubmit={onSave} className="space-y-4 rounded-lg border border-border p-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Ponto base</label>
          <button
            type="button"
            onClick={pickLocation}
            disabled={geoBusy}
            className="rounded-md border border-brand px-3 py-1.5 text-sm font-medium text-brand disabled:opacity-50"
          >
            {geoBusy ? 'Obtendo…' : '📍 Usar minha localização'}
          </button>

          {/* Alternativa ao GPS: definir o ponto base por CEP. */}
          <div className="mt-2 flex gap-2">
            <input
              inputMode="numeric"
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              placeholder="CEP (ex.: 01001-000)"
              className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void pickByCep()}
              disabled={cepBusy || cep.replace(/\D/g, '').length !== 8}
              className="rounded-md border border-brand px-3 py-1.5 text-sm font-medium text-brand disabled:opacity-50"
            >
              {cepBusy ? 'Buscando…' : 'Usar CEP'}
            </button>
          </div>
          {cepInfo && <p className="mt-1 text-xs text-status-finished">{cepInfo}</p>}
          {geoError && <p className="mt-1 text-xs text-danger">{geoError}</p>}

          <div className="mt-2 flex gap-2">
            <input
              type="number"
              step="any"
              value={lat ?? ''}
              onChange={(e) => setLat(e.target.value === '' ? null : Number(e.target.value))}
              placeholder="Latitude"
              className="w-1/2 rounded-md border border-border bg-bg px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="any"
              value={lng ?? ''}
              onChange={(e) => setLng(e.target.value === '' ? null : Number(e.target.value))}
              placeholder="Longitude"
              className="w-1/2 rounded-md border border-border bg-bg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Raio (km)</label>
          <div className="flex flex-wrap gap-2">
            {RADIUS_PRESETS.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setRadiusKm(r)}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  radiusKm === r ? 'border-brand bg-card font-medium text-brand' : 'border-border'
                }`}
              >
                {r} km
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={200}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Math.max(1, Math.min(200, Number(e.target.value))))}
              className="w-20 rounded-md border border-border bg-bg px-2 py-1 text-sm"
            />
          </div>
        </div>

        {save.isError && (
          <p className="text-sm text-danger">{(save.error as Error).message}</p>
        )}
        {saved && !save.isPending && (
          <p className="text-sm text-status-finished">✓ Área salva. O feed já reflete o novo raio.</p>
        )}

        <button
          type="submit"
          disabled={save.isPending}
          className="w-full rounded-md bg-brand px-4 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {save.isPending ? 'Salvando…' : 'Salvar área'}
        </button>
      </form>
    </div>
  );
}
