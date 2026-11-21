import { useEffect, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { phoneStatus, getVolunteerProfile, getVolunteerCatalogs, getJornadasConFiltros } from '../api.js';
import { Icon } from '../components/Icons.jsx';
import MapaOaxaca, { claveRegion } from '../components/panel/MapaOaxaca.jsx';
import { entradaPanel } from '../components/panel/PanelLayout.jsx';
import { Kpi, Tarjeta, Chip, EstadoPostulacion, Vacio, diaCorto, fechaCorta, fechaHora, hora, plural } from '../components/panel/piezas.jsx';
import { useMotion } from '../motion/useMotion.js';
import { REGIONES } from '../data/fuentes.js';

const ZONA = 'America/Mexico_City';
const DISP = { entre_semana: 'Entre semana', fin_semana: 'Fines de semana', variable: 'Variable' };
const ACTIVAS = ['pendiente', 'aceptada'];
const dia = (v) => new Date(v).toLocaleDateString('es-MX', { day: 'numeric', timeZone: ZONA });
const mes = (v) => new Date(v).toLocaleDateString('es-MX', { month: 'short', timeZone: ZONA }).replace('.', '');

export default function MiEspacio() {
  const { user } = useAuth();
  const { postulaciones } = useOutletContext();
  const roles = user?.roles || [];
  const esVoluntario = roles.includes('voluntario');

  const [tel, setTel] = useState({ cargando: true, dato: null, error: '' });
  const [perfil, setPerfil] = useState({ cargando: esVoluntario, creado: false, dato: null, cat: null, error: '' });
  const [pub, setPub] = useState({ cargando: true, lista: [], error: '' });
  const [vista, setVista] = useState('mapa');
  const [region, setRegion] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    let ok = true;
    phoneStatus().then((d) => ok && setTel({ cargando: false, dato: d, error: '' }))
      .catch((e) => ok && setTel({ cargando: false, dato: null, error: e.message }));
    getJornadasConFiltros().then((r) => ok && setPub({ cargando: false, lista: r.jornadas, error: '' }))
      .catch((e) => ok && setPub({ cargando: false, lista: [], error: e.message }));
    if (esVoluntario) {
      Promise.all([getVolunteerProfile(), getVolunteerCatalogs()])
        .then(([r, cat]) => ok && setPerfil({ cargando: false, creado: Boolean(r.perfilCreado), dato: r.perfil ?? null, cat, error: '' }))
        .catch((e) => ok && setPerfil((x) => ({ ...x, cargando: false, error: e.message })));
    }
    return () => { ok = false; };
  }, [esVoluntario]);

  const listo = !postulaciones.cargando && !pub.cargando && !perfil.cargando;
  useMotion(ref, listo ? entradaPanel : null, [listo]);

  // ---- Datos derivados (todo sale de la API) ----
  const filas = postulaciones.filas;
  const activas = filas.filter((p) => ACTIVAS.includes(p.estado)).sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
  const aceptadas = activas.filter((p) => p.estado === 'aceptada').length;
  const pendientes = activas.length - aceptadas;
  const ahora = Date.now();
  const proximas = activas.filter((p) => new Date(p.fin || p.inicio).getTime() >= ahora);
  const proxima = proximas[0];
  const comunidades = new Set(activas.map((p) => `${p.comunidad}|${p.municipio}`));
  const municipios = [...new Set(activas.map((p) => p.municipio))];
  const telOk = Boolean(tel.dato?.telefonoVerificado);

  const dato = perfil.dato;
  const nombreDe = (lista, id) => lista?.find((x) => String(x.id) === String(id))?.nombre;
  const miComunidad = perfil.cat?.comunidades?.find((c) => String(c.id) === String(dato?.comunidadId));
  const miRegion = claveRegion(miComunidad?.region || '');
  const habilidades = (dato?.habilidades || []).map((id) => nombreDe(perfil.cat?.habilidades, id)).filter(Boolean);
  const lenguas = (dato?.lenguas || []).map((l) => nombreDe(perfil.cat?.lenguas, l.lenguaId)).filter(Boolean);
  const checks = esVoluntario ? [
    ['Perfil guardado', perfil.creado],
    ['Comunidad de referencia', Boolean(dato?.comunidadId)],
    ['Habilidades', habilidades.length > 0],
    ['Lenguas que hablas', lenguas.length > 0],
    ['Presentación personal', Boolean(dato?.biografia?.trim())],
    ['Teléfono verificado', telOk],
  ] : [['Correo verificado', true], ['Teléfono verificado', telOk]];
  const hechos = checks.filter((c) => c[1]).length;
  const pct = Math.round((hechos / checks.length) * 100);

  const misIds = new Set(filas.map((p) => String(p.jornadaId)));
  const activasIds = new Set(activas.map((p) => String(p.jornadaId)));
  const conteo = {};
  pub.lista.forEach((j) => { const k = claveRegion(j.region || ''); if (k) conteo[k] = (conteo[k] || 0) + 1; });
  const pines = pub.lista.map((j) => ({ id: j.id, clave: claveRegion(j.region || ''), tono: activasIds.has(String(j.id)) ? 'ocre' : 'verde' }));
  const enRegion = region ? pub.lista.filter((j) => claveRegion(j.region || '') === region) : [];
  const nombreRegion = REGIONES.find((r) => r.clave === region)?.nombre;
  const recos = pub.lista
    .filter((j) => !misIds.has(String(j.id)))
    .sort((a, b) => Number(claveRegion(b.region || '') === miRegion && Boolean(miRegion)) - Number(claveRegion(a.region || '') === miRegion && Boolean(miRegion))
      || new Date(a.inicio) - new Date(b.inicio))
    .slice(0, 3);
  const otros = [
    roles.includes('representante') && { to: '/panel-institucional', t: 'Panel institucional', d: 'Publica jornadas y revisa postulaciones.', i: 'building' },
    roles.includes('administrador') && { to: '/admin', t: 'Administración', d: 'Solicitudes, instituciones, usuarios y jornadas.', i: 'shield' },
  ].filter(Boolean);

  return <div ref={ref}>
    <h1 className="sr-only">Mi espacio · Panel de voluntariado</h1>
    {postulaciones.error && <p className="p-msg p-msg--error" role="alert"><Icon name="info" size={17} />No se pudieron consultar tus postulaciones: {postulaciones.error}</p>}

    <section className="p-kpis" aria-label="Resumen de tu participación">
      {esVoluntario ? <>
        <Kpi icono="flag" etiqueta="Postulaciones activas" valor={activas.length}
          sub={activas.length ? `${plural(aceptadas, 'aceptada', 'aceptadas')} · ${pendientes} en revisión` : 'Aún no te postulas a una jornada'}
          hilo={activas.length ? (aceptadas / activas.length) * 100 : 0} hiloEtiqueta="Parte de tus postulaciones que ya fue aceptada" />
        <Kpi icono="calendar" etiqueta="Próxima jornada" valor={proxima ? fechaCorta(proxima.inicio) : 'Sin fecha'}
          sub={proxima ? `${proxima.titulo} · ${proxima.comunidad}` : 'Cuando te postules, aquí verás la fecha más cercana'}
          pie={proxima && <EstadoPostulacion estado={proxima.estado} />} />
        <Kpi icono="pin" etiqueta="Comunidades" valor={comunidades.size}
          sub={municipios.length ? municipios.slice(0, 3).join(' · ') : 'Las comunidades de tus jornadas aparecerán aquí'} />
        <Kpi icono="sparkle" etiqueta="Perfil completo" valor={pct} unidad="%" hilo={pct} hiloEtiqueta="Avance de tu perfil"
          pie={<Chip tono={pct === 100 ? 'ok' : 'aviso'}>{pct === 100 ? 'Perfil completo' : `Te ${checks.length - hechos === 1 ? 'falta 1 dato' : `faltan ${checks.length - hechos} datos`}`}</Chip>} />
      </> : <>
        <Kpi icono="calendar" etiqueta="Jornadas vigentes" valor={pub.lista.length} sub="Publicadas por instituciones verificadas" />
        <Kpi icono="map" etiqueta="Regiones con jornadas" valor={Object.keys(conteo).length} sub="De las 8 regiones de Oaxaca" hilo={(Object.keys(conteo).length / 8) * 100} />
        <Kpi icono="mail" etiqueta="Correo" valor="Verificado" sub={user?.correo} />
        <Kpi icono="phone" etiqueta="Teléfono" valor={telOk ? 'Verificado' : 'Pendiente'} sub={telOk ? tel.dato.telefono : 'Opcional, desde Seguridad'} />
      </>}
    </section>

    <div className="p-grid">
      <div className="p-col">
        <Tarjeta titulo="Mapa de oportunidades · Oaxaca" icono="map" sub="Jornadas vigentes por región. Toca una región para ver cuáles son."
          accion={<div className="p-toggle" role="group" aria-label="Forma de ver las regiones">
            <button type="button" aria-pressed={vista === 'mapa'} onClick={() => setVista('mapa')}><Icon name="map" size={15} /> Mapa</button>
            <button type="button" aria-pressed={vista === 'lista'} onClick={() => setVista('lista')}><Icon name="list" size={15} /> Lista</button>
          </div>}>
          {pub.error ? <p className="p-msg p-msg--error" role="alert"><Icon name="info" size={17} />No se pudieron consultar las jornadas: {pub.error}</p>
            : pub.cargando ? <p className="p-cargando" role="status">Consultando jornadas…</p>
            : vista === 'mapa' ? <>
              <MapaOaxaca conteo={conteo} pines={pines} activa={region} onElegir={setRegion} etiqueta="Jornadas vigentes por región de Oaxaca"
                detalle={region && <>
                  <strong><Icon name="pin" size={15} /> {nombreRegion}</strong>
                  {enRegion.length ? <ul>{enRegion.slice(0, 3).map((j) => <li key={j.id}>
                    <Link to={`/jornadas/${j.id}`}>{j.titulo}</Link><br /><small>{j.comunidad} · {fechaCorta(j.inicio)}</small>
                  </li>)}</ul> : <p style={{ margin: '4px 0 0' }}>Sin jornadas vigentes en esta región por ahora.</p>}
                  {enRegion.length > 3 && <Link className="p-link" to={`/jornadas?region=${encodeURIComponent(enRegion[0].region)}`}>Ver las {enRegion.length} <Icon name="arrow" size={14} /></Link>}
                </>} />
              <div className="p-mapa-leyenda">
                <span><i /> Jornada vigente</span>
                {esVoluntario && <span><i className="ocre" /> Te postulaste</span>}
                <span><i className="zona" /> Color más intenso, más jornadas</span>
              </div>
              <p className="p-nota">Esquema por regiones, no a escala.</p>
            </> : <ul className="p-regiones-lista">{REGIONES.map((r) => <li key={r.clave}><span>{r.nombre}</span><strong>{conteo[r.clave] || 0}</strong></li>)}</ul>}

          {esVoluntario && <>
            <h3>Mis jornadas en curso</h3>
            {postulaciones.cargando ? <p className="p-cargando" role="status">Consultando postulaciones…</p>
              : activas.length === 0 ? <Vacio icono="flag" titulo="Todavía no tienes jornadas en curso"
                accion={<Link className="btn btn-primary btn-sm" to="/jornadas">Explorar jornadas <Icon name="arrow" size={15} /></Link>}>
                Explora las jornadas vigentes y postúlate a la que te quede mejor.</Vacio>
              : <table className="p-tabla">
                <thead><tr><th scope="col">Jornada</th><th scope="col">Fecha</th><th scope="col">Estado</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
                <tbody>{activas.slice(0, 4).map((p) => <tr key={p.id}>
                  <td className="p-celda-t"><strong>{p.titulo}</strong><small>{p.institucion} · {p.comunidad}, {p.municipio}</small></td>
                  <td data-label="Fecha" className="p-num">{fechaCorta(p.inicio)}<small>{hora(p.inicio)}</small></td>
                  <td data-label="Estado"><span className="p-chips"><EstadoPostulacion estado={p.estado} />{p.esDemo && <Chip tono="neutro">Demostración</Chip>}</span></td>
                  <td className="p-celda-accion"><Link className="p-link" to={`/jornadas/${p.jornadaId}`}>Ver jornada <Icon name="arrow" size={15} /></Link></td>
                </tr>)}</tbody>
              </table>}
            {activas.length > 4 && <Link className="p-link" to="/mis-postulaciones">Ver mis {activas.length} postulaciones <Icon name="arrow" size={15} /></Link>}
          </>}
        </Tarjeta>
      </div>

      <div className="p-col">
        {esVoluntario && <Tarjeta titulo="Mi agenda" icono="clock" sub="Fechas de las jornadas a las que te postulaste.">
          {postulaciones.cargando ? <p className="p-cargando" role="status">Consultando…</p>
            : proximas.length ? <ol className="p-agenda">{proximas.slice(0, 5).map((p) => <li key={p.id}>
              <span className="p-agenda-cuando">{diaCorto(p.inicio)}<small>{hora(p.inicio)}</small></span>
              <span className={`p-agenda-nodo${p.estado === 'pendiente' ? ' p-agenda-nodo--aviso' : ''}`} aria-hidden="true" />
              <span className="p-agenda-que"><strong>{p.titulo}</strong><small>{p.comunidad} · {p.estado === 'aceptada' ? 'Confirmada' : 'En revisión'}</small></span>
            </li>)}</ol>
            : <Vacio icono="calendar" titulo="Sin fechas próximas">Cuando te postules a una jornada, su fecha aparecerá aquí.</Vacio>}
        </Tarjeta>}

        {esVoluntario && <Tarjeta titulo="Mi perfil de voluntariado" icono="user"
          accion={<Link className="p-link" to="/mi-perfil-voluntario">{perfil.creado ? 'Editar' : 'Completar'} <Icon name="edit" size={14} /></Link>}>
          {perfil.cargando ? <p className="p-cargando" role="status">Consultando tu perfil…</p>
            : perfil.error ? <p className="p-msg p-msg--error" role="alert"><Icon name="info" size={17} />{perfil.error}</p>
            : <>
              <ul className="p-checklist">{checks.map(([t, ok]) => <li key={t} className={ok ? 'is-ok' : ''}>
                <Icon name={ok ? 'check' : 'plus'} size={15} />{t}<span className="sr-only">{ok ? ': listo' : ': pendiente'}</span></li>)}</ul>
              <dl className="p-datos">
                <dt>Comunidad</dt><dd>{miComunidad ? `${miComunidad.nombre}, ${miComunidad.municipio}` : 'Sin indicar'}</dd>
                <dt>Disponibilidad</dt><dd>{perfil.creado ? (DISP[dato?.disponibilidad] || 'Sin indicar') : 'Sin indicar'}</dd>
              </dl>
              {habilidades.length > 0 && <div className="p-chips">{habilidades.map((h) => <Chip key={h} tono="menta">{h}</Chip>)}</div>}
              {lenguas.length > 0 && <div className="p-chips" style={{ marginTop: 8 }}>{lenguas.map((l) => <Chip key={l} tono="aviso" icono="language">{l}</Chip>)}</div>}
            </>}
        </Tarjeta>}

        <Tarjeta titulo="Seguridad de la cuenta" icono="shield">
          <ul className="p-lista">
            <li><span className="p-icono-t"><Icon name="mail" size={18} /></span>
              <span className="p-lista-txt"><strong>Correo verificado</strong><small>{user?.correo}</small></span><Chip tono="ok">Listo</Chip></li>
            <li><span className={`p-icono-t${telOk ? '' : ' p-icono-t--ocre'}`}><Icon name="phone" size={18} /></span>
              <span className="p-lista-txt"><strong>Teléfono</strong><small>{tel.cargando ? 'Consultando…' : tel.error ? 'No se pudo consultar' : telOk ? tel.dato.telefono : 'Sin verificar (opcional)'}</small></span>
              {telOk ? <Chip tono="ok">Verificado</Chip> : <span className="p-lista-acc"><Link className="btn btn-outline btn-sm" to="/verificar-telefono">Verificar</Link></span>}</li>
          </ul>
        </Tarjeta>

        {otros.length > 0 && <Tarjeta titulo="Tus otros paneles" icono="grid">
          <ul className="p-lista">{otros.map((o) => <li key={o.to}>
            <span className="p-icono-t"><Icon name={o.i} size={18} /></span>
            <span className="p-lista-txt"><strong>{o.t}</strong><small>{o.d}</small></span>
            <span className="p-lista-acc"><Link className="btn btn-primary btn-sm" to={o.to}>Abrir</Link></span>
          </li>)}</ul>
        </Tarjeta>}
      </div>
    </div>

    {recos.length > 0 && <section aria-labelledby="recos-t">
      <div className="p-cabeza" style={{ marginBottom: 14, marginTop: 30 }}>
        <h2 className="p-seccion-t" id="recos-t" style={{ margin: 0 }}>Oportunidades para ti en Oaxaca</h2>
        <Link className="p-link" to="/jornadas">Ver todas las jornadas <Icon name="arrow" size={15} /></Link>
      </div>
      <div className="p-recos">{recos.map((j, i) => {
        const cerca = Boolean(miRegion) && claveRegion(j.region || '') === miRegion;
        return <article className="p-reco" key={j.id} data-panel-card>
          <div className="p-reco-cab">
            <span className="p-fecha-tile" aria-hidden="true"><strong>{dia(j.inicio)}</strong><small>{mes(j.inicio)}</small></span>
            <div><h3>{j.titulo}</h3><p>{j.comunidad}, {j.municipio}{j.region ? ` · ${j.region}` : ''}</p></div>
          </div>
          <p>{j.institucion} · {fechaHora(j.inicio)}</p>
          <div className="p-reco-pie">
            <span>{j.es_demo ? <Chip tono="aviso">Demostración</Chip> : cerca ? <Chip tono="menta" icono="pin">Cerca de tu comunidad</Chip> : 'Jornada vigente'}</span>
            <Link className={`btn btn-sm ${i === 0 ? 'btn-primary' : 'btn-outline'}`} to={`/jornadas/${j.id}`}>{i === 0 ? 'Ver y postularme' : 'Ver detalles'}</Link>
          </div>
        </article>;
      })}</div>
    </section>}
  </div>;
}
