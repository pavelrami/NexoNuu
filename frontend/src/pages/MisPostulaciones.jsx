import { useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { retirarPostulacion } from '../api.js';
import { Icon } from '../components/Icons.jsx';
import { entradaPanel } from '../components/panel/PanelLayout.jsx';
import { PanelCabeza, Tarjeta, Filtros, EstadoPostulacion, Chip, Vacio, Mensajes, fechaCorta, hora } from '../components/panel/piezas.jsx';
import { useMotion } from '../motion/useMotion.js';

const GRUPOS = { activas: ['pendiente', 'aceptada'], pendiente: ['pendiente'], aceptada: ['aceptada'], cerradas: ['rechazada', 'retirada'] };

export default function MisPostulaciones() {
  const { postulaciones, recargar } = useOutletContext();
  const [filtro, setFiltro] = useState('todas');
  const [trabajando, setTrabajando] = useState(null);
  const [aviso, setAviso] = useState({ error: '', exito: '' });
  const ref = useRef(null);
  useMotion(ref, postulaciones.cargando ? null : entradaPanel, [postulaciones.cargando]);

  async function retirar(id) {
    if (!window.confirm('¿Retirar esta solicitud pendiente? No podrás volver a postularte a la misma jornada.')) return;
    setTrabajando(id); setAviso({ error: '', exito: '' });
    try { await retirarPostulacion(id); await recargar(); setAviso({ error: '', exito: 'Solicitud retirada.' }); }
    catch (e) { setAviso({ error: e.message, exito: '' }); }
    finally { setTrabajando(null); }
  }

  const filas = postulaciones.filas;
  const cuenta = (g) => filas.filter((p) => GRUPOS[g].includes(p.estado)).length;
  const visibles = filtro === 'todas' ? filas : filas.filter((p) => GRUPOS[filtro].includes(p.estado));

  return <div ref={ref}>
    <PanelCabeza kicker="Conectar · Mi participación" titulo="Mis postulaciones"
      acciones={<Link className="btn btn-primary" to="/jornadas"><Icon name="search" size={17} /> Buscar más jornadas</Link>}>
      Consulta tus solicitudes. Solo la persona que representa a una institución verificada puede aceptarlas o rechazarlas, y te avisamos por correo.
    </PanelCabeza>
    <Mensajes error={postulaciones.error || aviso.error} exito={aviso.exito} />

    <Tarjeta titulo="Solicitudes" icono="flag"
      accion={<Filtros etiqueta="Filtrar postulaciones" valor={filtro} onCambio={setFiltro} opciones={[
        ['todas', 'Todas', filas.length], ['pendiente', 'En revisión', cuenta('pendiente')],
        ['aceptada', 'Aceptadas', cuenta('aceptada')], ['cerradas', 'Cerradas', cuenta('cerradas')],
      ]} />}>
      {postulaciones.cargando ? <p className="p-cargando" role="status">Consultando solicitudes…</p>
        : filas.length === 0 ? <Vacio icono="flag" titulo="Aún no tienes postulaciones"
          accion={<Link className="btn btn-primary btn-sm" to="/jornadas">Explorar jornadas <Icon name="arrow" size={15} /></Link>}>
          Cuando te postules a una jornada, aquí verás su estado.</Vacio>
        : visibles.length === 0 ? <Vacio icono="search" titulo="Nada en este filtro">Prueba con otro estado.</Vacio>
        : <div className="p-tabla-marco"><table className="p-tabla">
          <thead><tr><th scope="col">Jornada</th><th scope="col">Institución</th><th scope="col">Fecha</th><th scope="col">Estado</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>{visibles.map((p) => <tr key={p.id}>
            <td className="p-celda-t"><strong>{p.titulo}</strong><small>{p.comunidad}, {p.municipio}</small>
              {p.esDemo && <small>Simulación académica; no es una inscripción real.</small>}</td>
            <td data-label="Institución">{p.institucion}</td>
            <td data-label="Fecha" className="p-num">{fechaCorta(p.inicio)}<small>{hora(p.inicio)}</small></td>
            <td data-label="Estado"><span className="p-chips"><EstadoPostulacion estado={p.estado} />{p.esDemo && <Chip tono="neutro">Demostración</Chip>}</span></td>
            <td className="p-celda-accion"><span className="p-acciones" style={{ justifyContent: 'flex-end' }}>
              <Link className="btn btn-outline btn-sm" to={`/jornadas/${p.jornadaId}`}>Ver jornada</Link>
              {p.estado === 'pendiente' && <button type="button" className="btn btn-outline btn-sm btn-peligro" disabled={trabajando !== null} onClick={() => retirar(p.id)}>
                {trabajando === p.id ? 'Retirando…' : 'Retirar'}</button>}
            </span></td>
          </tr>)}</tbody>
        </table></div>}
    </Tarjeta>
  </div>;
}
