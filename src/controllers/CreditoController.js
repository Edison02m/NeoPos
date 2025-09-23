import Credito from '../models/Credito';
import Cliente from '../models/Cliente';
import AbonoLegacy from '../models/AbonoLegacy';
import Cuota from '../models/Cuota';

class CreditoController {
  async listarCreditos(){
    try { const data = await Credito.findAll(); return { success:true, data }; } catch(e){ return { success:false, error:e.message }; }
  }
  async obtenerPorVenta(idventa){
    try { const data = await Credito.findByVenta(idventa); return { success:true, data }; } catch(e){ return { success:false, error:e.message }; }
  }
  async crearCredito({ idventa, plazo, saldo, cliente }){
    try {
      if(!idventa) return { success:false, error:'idventa requerido'};
      const res = await Credito.create({ idventa, plazo, saldo });
      return { success:true, data:{ id:res.id } };
    } catch(e){ return { success:false, error:e.message }; }
  }
  async actualizarSaldo({ idventa, saldo }){
    try { await Credito.updateSaldo(idventa, saldo); return { success:true }; } catch(e){ return { success:false, error:e.message }; }
  }
  async eliminar({ idventa }){
    try { await Credito.delete(idventa); return { success:true }; } catch(e){ return { success:false, error:e.message }; }
  }

  // Lista extendida relacionando credito -> venta -> cliente
  async listarExtendido(){
    try {
      // Traer todos los créditos
      const creditos = await Credito.findAll();
      if(!creditos || creditos.length===0) return { success:true, data:[] };

      // Obtener ids de venta
      const ids = creditos.map(c=> c.idventa);
      // Consultar ventas (sin JOIN porque las tablas son sueltas)
      let ventasMap = new Map();
      try {
        const placeholders = ids.map(()=>'?').join(',');
        const resVentas = await window.electronAPI.dbQuery(`SELECT id, fecha, idcliente, fpago, total FROM venta WHERE id IN (${placeholders})`, ids);
        if(resVentas.success){
          resVentas.data.forEach(v=> {
            ventasMap.set(v.id, { ...v, cedula_cliente: v.idcliente });
          });
        }
      } catch(_){ }

      // Recolectar cédulas desde idcliente
      const cedulas = Array.from(new Set(Array.from(ventasMap.values()).map(v=> v.cedula_cliente).filter(Boolean)));
      let clienteMap = new Map();
      if(cedulas.length){
        try {
          const placeholdersCed = cedulas.map(()=>'?').join(',');
          const resCli = await window.electronAPI.dbQuery(`SELECT cedula, apellidos, nombres FROM cliente WHERE cedula IN (${placeholdersCed})`, cedulas);
          if(resCli.success){
            resCli.data.forEach(c=> clienteMap.set(c.cedula, c));
          }
        } catch(_){ }
      }

      const data = creditos.map((c, idx)=> {
        const venta = ventasMap.get(c.idventa) || {};
        // Normalizar fecha: aceptar formato ISO o DD/MM/YYYY
        let fechaNorm = '';
        if(venta.fecha){
          try {
            if(/\d{4}-\d{2}-\d{2}/.test(venta.fecha)) {
              fechaNorm = String(venta.fecha).substring(0,10);
            } else if(/\d{2}\/\d{2}\/\d{4}/.test(venta.fecha)) {
              // convertir DD/MM/YYYY -> YYYY-MM-DD
              const [d,m,y] = venta.fecha.split('/');
              fechaNorm = `${y}-${m}-${d}`;
            } else {
              const d = new Date(venta.fecha);
              if(!isNaN(d.getTime())) fechaNorm = d.toISOString().substring(0,10);
            }
          } catch(_){ fechaNorm=''; }
        }
  const cli = venta.cedula_cliente ? (clienteMap.get(venta.cedula_cliente) || null) : null;
  const nombresCli = cli ? `${cli.apellidos||''} ${cli.nombres||''}`.trim() : (c.cliente || '');
        return {
          num: idx+1,
          idventa: c.idventa,
            fecha: fechaNorm,
          plazo: (c.plazo ?? '') || '',
          saldo: Number(c.saldo)||0,
          cliente: nombresCli || '',
          empresa: '', // placeholder: agregar join a empresa si existe relación futura
        };
      });
      return { success:true, data };
    } catch(e){ return { success:false, error:e.message }; }
  }

  // Detalle completo para modal
  async detalleCredito(idventa){
    try {
      const credito = await Credito.findByVenta(idventa);
      if(!credito) return { success:false, error:'Crédito no encontrado'};

      // Obtener venta asociada
      let venta = null;
      try {
        const resVenta = await window.electronAPI.dbGetSingle('SELECT * FROM venta WHERE id = ?', [idventa]);
        if(resVenta.success) venta = resVenta.data;
      } catch(_){}

      // Obtener cliente (por cedula o idcliente en venta)
      let cliente = null;
      const cedulaRef = venta?.cedula || venta?.idcliente;
      if(cedulaRef){
        try {
          const resCli = await window.electronAPI.dbGetSingle('SELECT cedula, apellidos, nombres, telefono, direccion FROM cliente WHERE cedula = ?', [cedulaRef]);
          if(resCli.success) cliente = resCli.data;
        } catch(_){ }
      }

      // Abonos legacy
      let abonos = [];
      try { abonos = await AbonoLegacy.listByVenta(idventa); } catch(_) {}
      // Cuotas
      let cuotas = [];
      try { cuotas = await Cuota.listByVenta(idventa); } catch(_) {}
      // Productos asociados
      let productos = [];
      try {
        // Tabla válida legacy: ventadet
        const res = await window.electronAPI.dbQuery?.('SELECT d.codprod as codigo, p.producto as descripcion, d.cantidad, d.precio as precio FROM ventadet d LEFT JOIN producto p ON p.codigo = d.codprod WHERE d.idventa = ?', [idventa]);
        if(res?.success) productos = res.data;
      } catch(_){ }

      // Enriquecer cálculo: total abonado & saldo calculado
  const totalAbonos = abonos.reduce((s,a)=> s + Number(a.monto||a.valor||0), 0);
      const totalVenta = venta?.total ? Number(venta.total) : undefined;
      const saldoCalculado = (totalVenta !== undefined) ? Math.max(totalVenta - totalAbonos, 0) : undefined;
  const clienteNombre = cliente ? `${cliente.apellidos||''} ${cliente.nombres||''}`.trim() : '';
      // Coherencia: si el saldo guardado difiere > 0.01 del saldoCalculado, exponer bandera
      let saldoDesfase = false;
      if(saldoCalculado !== undefined && credito && Math.abs((Number(credito.saldo)||0) - saldoCalculado) > 0.01){
        saldoDesfase = true;
      }
  return { success:true, data:{ credito, venta, cliente, abonos, cuotas, productos, meta:{ totalAbonos, saldoCalculado, clienteNombre, saldoDesfase } } };
    } catch(e){ return { success:false, error:e.message }; }
  }
}

export default CreditoController;
