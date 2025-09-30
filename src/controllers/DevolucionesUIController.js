// Controlador UI (renderer) para Devoluciones de Ventas y Compras
// Encapsula TODAS las consultas SQL usando window.electronAPI

export const DevolucionVentaUI = {
  // Listar ventas activas/parciales para el modal de nueva devolución
  async cargarVentas({ desde, hasta, clienteFiltro }){
    const where = []; const params = [];
    if(desde){ where.push('date(fecha) >= date(?)'); params.push(desde); }
    if(hasta){ where.push('date(fecha) <= date(?)'); params.push(hasta); }
    // Mostrar ventas activas ('1') y parciales ('2'). Excluir completadas ('0')
    where.push("COALESCE(trial279,'1') IN ('1','2')");
    const whereSql = where.length? ('WHERE ' + where.join(' AND ')) : '';
    const sql = `SELECT id, fecha, idcliente, total, formapago, fpago, trial279 FROM venta ${whereSql} ORDER BY fecha DESC, id DESC LIMIT 200`;
    const res = await window.electronAPI.dbQuery(sql, params);
    if(!res.success) throw new Error(res.error||'No se pudo consultar ventas');
    let list = res.data||[];
    if(clienteFiltro && clienteFiltro.trim()){
      const term = clienteFiltro.trim().toLowerCase();
      list = list.filter(v => String(v.idcliente||'').toLowerCase().includes(term));
    }
    const out = [];
    for(const v of list){
      let clienteNombre = '';
      try{
        const c = await window.electronAPI.dbGetSingle('SELECT apellidos, nombres, cedula FROM cliente WHERE cedula = ? OR cod = ? LIMIT 1', [v.idcliente, v.idcliente]);
        if(c.success && c.data){ clienteNombre = `${c.data.apellidos||''} ${c.data.nombres||''}`.trim() || (c.data.cedula||''); }
      }catch(_){ }
      // Calcular total devuelto acumulado para esta venta usando devventa (cabecera)
      let totalDevuelto = 0;
      let subtotalNeto = Number(v.subtotal||0);
      let ivaNeto = Number(v.iva||0);
      try{
        // Solo leer si la columna existe; NO modificar esquema desde un listado
        const info = await window.electronAPI.dbQuery("PRAGMA table_info('devventa')", []);
        const hasOrigen = info?.success && Array.isArray(info.data) && info.data.some(col => String(col.name||'').toLowerCase()==='idventa_origen');
        if(hasOrigen){
          // 1) Total devuelto (incluye IVA ya calculado al momento de devolver)
          const s = await window.electronAPI.dbGetSingle('SELECT SUM(total) as dev FROM devventa WHERE idventa_origen = ?', [v.id]);
          totalDevuelto = Number(s?.data?.dev||0);

          // 2) IVA proporcional: base gravada original vs base gravada devuelta
          // Base gravada de la venta original
          let baseGravadaVenta = 0;
          try{
            const b = await window.electronAPI.dbGetSingle(`SELECT SUM(CASE WHEN COALESCE(p.grabaiva,'1')='1' THEN d.cantidad*d.precio ELSE 0 END) as base
              FROM ventadet d LEFT JOIN producto p ON p.codigo=d.codprod WHERE d.idventa = ?`, [v.id]);
            baseGravadaVenta = Number(b?.data?.base||0);
          }catch(_){ baseGravadaVenta = 0; }
          // Base y subtotal devuelto desde detalle de devoluciones
          let baseDevuelta = 0, subtotalDevuelto = 0;
          try{
            const q = await window.electronAPI.dbGetSingle(`SELECT 
                SUM(dd.cantidad*dd.precio) as sub,
                SUM(CASE WHEN COALESCE(p.grabaiva,'1')='1' THEN dd.cantidad*dd.precio ELSE 0 END) as base
              FROM devventadet dd 
              JOIN devventa dv ON dv.id = dd.idventa 
              LEFT JOIN producto p ON p.codigo = dd.codprod 
              WHERE dv.idventa_origen = ?`, [v.id]);
            subtotalDevuelto = Number(q?.data?.sub||0);
            baseDevuelta = Number(q?.data?.base||0);
          }catch(_){ baseDevuelta = 0; subtotalDevuelto = 0; }

          // IVA proporcional a lo devuelto (según IVA registrado en la venta original)
          const ivaOriginalVenta = Number(v.iva||0);
          const ivaDevuelto = baseGravadaVenta>0 ? (ivaOriginalVenta * (baseDevuelta / baseGravadaVenta)) : 0;

          // Netos
          subtotalNeto = Math.max(0, Number(v.subtotal||0) - subtotalDevuelto);
          ivaNeto = Math.max(0, ivaOriginalVenta - ivaDevuelto);
        }
      }catch(_){ totalDevuelto = 0; }
      const totalNeto = Math.max(0, (Number(v.total||0) - totalDevuelto));
      out.push({ ...v, clienteNombre, totalDevuelto, totalNeto, subtotalNeto, ivaNeto });
    }
    return out;
  },

  // Cargar items de una venta
  async cargarItemsVenta(ventaId){
    const v = await window.electronAPI.dbGetSingle('SELECT * FROM venta WHERE id = ? LIMIT 1', [ventaId]);
    if(!v.success || !v.data) throw new Error('Venta no encontrada');
    const det = await window.electronAPI.dbQuery(`SELECT d.codprod, d.cantidad, d.precio, COALESCE(d.producto, p.producto) AS descripcion, COALESCE(p.grabaiva,'1') AS grabaiva, COALESCE(p.iva_percentage, 12.0) AS iva_percentage FROM ventadet d LEFT JOIN producto p ON p.codigo = d.codprod WHERE d.idventa = ? ORDER BY CAST(d.item as INTEGER) ASC`, [ventaId]);
    const rows = (det.success? det.data:[]);
    // Devoluciones previas por producto (sumadas) usando cabeceras con idventa_origen
    let devPrevMap = {};
    try{
      const q = await window.electronAPI.dbQuery('SELECT dd.codprod, SUM(dd.cantidad) as dev FROM devventadet dd JOIN devventa dv ON dv.id = dd.idventa WHERE dv.idventa_origen = ? GROUP BY dd.codprod', [ventaId]);
      if(q.success){ for(const r of q.data||[]){ devPrevMap[r.codprod] = Number(r.dev)||0; } }
    }catch(_){ }
    const baseIvaVenta = rows.reduce((s,row)=> s + (String(row.grabaiva||'1')==='1' ? (Number(row.cantidad)||0)*(Number(row.precio)||0) : 0), 0);
    const items = rows.map(d => {
      const vendida = Number(d.cantidad)||0;
      const yaDev = Number(devPrevMap[d.codprod]||0);
      const restante = Math.max(0, vendida - yaDev);
      const precio = Number(d.precio)||0;
      const graba = String(d.grabaiva||'1')==='1';
      const ivaOriginalVenta = Number(v?.data?.iva)||0;
      const ivaUnitShare = (graba && baseIvaVenta>0) ? (ivaOriginalVenta * (precio / baseIvaVenta)) : 0;
      return { codprod: d.codprod, descripcion: d.descripcion, cantidadVendida: vendida, yaDevuelta: yaDev, cantidadRestante: restante, precio, grabaiva: String(d.grabaiva||'1'), iva_percentage: Number(d.iva_percentage)||12, ivaUnitShare, devolver: 0 };
    });
    return { venta: v.data, baseIvaVenta, items };
  },

  // Guardar devolución de venta
  async guardarDevolucionVenta({ venta, devolverItems, subtotal, total }){
    if(!venta?.id) throw new Error('Venta inválida');
    if(!Array.isArray(devolverItems) || devolverItems.length===0) throw new Error('Sin items');
    await window.electronAPI.dbRun('BEGIN');
    try{
      const now = new Date().toISOString();
      const idDev = String(now.replace(/[^0-9]/g,'').slice(0,14));
      // Asegurar columna idventa_origen en devventa
      try{
        const infoCab = await window.electronAPI.dbQuery("PRAGMA table_info('devventa')", []);
        const hasOrigen = infoCab?.success && Array.isArray(infoCab.data) && infoCab.data.some(col => String(col.name||'').toLowerCase()==='idventa_origen');
        if(!hasOrigen){ await window.electronAPI.dbRun("ALTER TABLE devventa ADD COLUMN idventa_origen TEXT(14)"); }
      }catch(_){ /* continuar */ }
      await window.electronAPI.dbRun(`INSERT INTO devventa (id, idcliente, fecha, subtotal, descuento, total, fpago, formapago, trial275, idventa_origen) VALUES (?, ?, ?, ?, 0, ?, ?, ?, '0', ?)`, [
        idDev, venta.idcliente||null, now, subtotal, total, Number(venta.fpago)||0, Number(venta.formapago)||1, venta.id||null
      ]);
      // Asegurar columna iddevventa en devventadet y numeración de item por idventa (id de la devolución)
      let hasIdDevVenta = false;
      try{
        const info = await window.electronAPI.dbQuery("PRAGMA table_info('devventadet')", []);
        hasIdDevVenta = info?.success && Array.isArray(info.data) && info.data.some(col => String(col.name||'').toLowerCase()==='iddevventa');
        if(!hasIdDevVenta){ await window.electronAPI.dbRun("ALTER TABLE devventadet ADD COLUMN iddevventa TEXT(14)"); hasIdDevVenta = true; }
      }catch(_){ /* continuar sin iddevventa si falla */ }
      // Continuar secuencia para evitar UNIQUE(item,idventa)
      let baseItem = 0;
      try{
        const mx = await window.electronAPI.dbGetSingle('SELECT MAX(CAST(item as INTEGER)) as maxItem FROM devventadet WHERE idventa = ?', [idDev]);
        baseItem = Number(mx?.data?.maxItem)||0;
      }catch(_){ baseItem = 0; }
      let i=baseItem+1;
      for(const it of devolverItems){
        if(hasIdDevVenta){
          await window.electronAPI.dbRun(`INSERT INTO devventadet (item, idventa, iddevventa, codprod, cantidad, precio, trial275) VALUES (?, ?, ?, ?, ?, ?, '0')`, [
            i++, idDev, idDev, it.codprod, Number(it.cantidad)||0, Number(it.precio)||0
          ]);
        } else {
          await window.electronAPI.dbRun(`INSERT INTO devventadet (item, idventa, codprod, cantidad, precio, trial275) VALUES (?, ?, ?, ?, ?, '0')`, [
            i++, idDev, it.codprod, Number(it.cantidad)||0, Number(it.precio)||0
          ]);
        }
        await window.electronAPI.dbRun('UPDATE producto SET almacen = almacen + ? WHERE codigo = ?', [Number(it.cantidad)||0, it.codprod]);
      }
      // Estado en venta
      // Recalcular estado por CANTIDADES: si las devueltas >= vendidas -> '0', si 0 -> '1', caso contrario '2'
      const r1 = await window.electronAPI.dbGetSingle('SELECT SUM(cantidad) as total FROM ventadet WHERE idventa = ?', [venta.id]);
      const r2 = await window.electronAPI.dbGetSingle('SELECT SUM(dd.cantidad) as total FROM devventadet dd JOIN devventa dv ON dv.id = dd.idventa WHERE dv.idventa_origen = ?', [venta.id]);
      const tc = Number(r1?.data?.total||0); const td = Number(r2?.data?.total||0);
      const estado = td<=0 ? '1' : (td>=tc ? '0' : '2');
      await window.electronAPI.dbRun('UPDATE venta SET trial279 = ? WHERE id = ?', [estado, venta.id]);
      await window.electronAPI.dbRun('COMMIT');
      return { success:true, id: idDev };
    }catch(e){ await window.electronAPI.dbRun('ROLLBACK'); throw e; }
  },
  async listar({ desde, hasta }){
    const where = []; const params = [];
    if(desde){ where.push('date(fecha) >= date(?)'); params.push(desde); }
    if(hasta){ where.push('date(fecha) <= date(?)'); params.push(hasta); }
    const sql = `SELECT id, idcliente AS tercero, fecha, subtotal, descuento, total, formapago AS fpago FROM devventa ${where.length?('WHERE '+where.join(' AND ')):''} ORDER BY fecha DESC, id DESC LIMIT 1000`;
    const res = await window.electronAPI.dbQuery(sql, params);
    if(!res.success) throw new Error(res.error||'No se pudo consultar devoluciones');
    return res.data||[];
  },
  async eliminar(ids = []){
    for(const id of ids){
      try{
        // Recuperar id de venta original desde cabecera devventa
        let originalId = null;
        try{
          const dv = await window.electronAPI.dbGetSingle('SELECT idventa_origen FROM devventa WHERE id = ? LIMIT 1', [id]);
          if(dv.success) originalId = dv.data?.idventa_origen || null;
        }catch(_){ }
        const det = await window.electronAPI.dbQuery('SELECT codprod, cantidad FROM devventadet WHERE idventa = ?', [id]);
        if(det.success){ for(const it of det.data||[]){ await window.electronAPI.dbRun('UPDATE producto SET almacen = almacen - ? WHERE codigo = ?', [Number(it.cantidad)||0, it.codprod]); } }
        await window.electronAPI.dbRun('DELETE FROM devventadet WHERE idventa = ?', [id]);
        await window.electronAPI.dbRun('DELETE FROM devventa WHERE id = ?', [id]);
        if(originalId){
          const r1 = await window.electronAPI.dbGetSingle('SELECT SUM(cantidad) as total FROM ventadet WHERE idventa = ?', [originalId]);
          const r2 = await window.electronAPI.dbGetSingle('SELECT SUM(dd.cantidad) as total FROM devventadet dd JOIN devventa dv ON dv.id = dd.idventa WHERE dv.idventa_origen = ?', [originalId]);
          const tc = Number(r1?.data?.total||0); const td = Number(r2?.data?.total||0);
          const estado = td<=0 ? '1' : (td<tc ? '2' : '0');
          await window.electronAPI.dbRun('UPDATE venta SET trial279 = ? WHERE id = ?', [estado, originalId]);
        }
      }catch(_){ /* continuar */ }
    }
  }
};

export const DevolucionCompraUI = {
  // Listar compras para el modal de nueva devolución (con filtro proveedor opcional)
  async cargarCompras({ desde, hasta, provFiltro }){
    const where = []; const params = [];
    if(desde){ where.push('date(fecha) >= date(?)'); params.push(desde); }
    if(hasta){ where.push('date(fecha) <= date(?)'); params.push(hasta); }
    // Compras con posibilidad de devolución: estados '1' (activa) y '2' (parcial)
    where.push("COALESCE(trial272,'1') IN ('1','2')");
    const whereSql = where.length? ('WHERE ' + where.join(' AND ')) : '';
    const sql = `SELECT id, fecha, idprov, subtotal, iva, total, fpago, trial272 FROM compra ${whereSql} ORDER BY fecha DESC, id DESC LIMIT 200`;
    const res = await window.electronAPI.dbQuery(sql, params);
    if(!res.success) throw new Error(res.error||'No se pudo consultar compras');
    let list = res.data||[];
    // Enriquecer con proveedor y calcular total devuelto (con IVA proporcional) y total neto
    const out = [];
    for(const c of list){
      let provNombre = '';
      try{
        const p = await window.electronAPI.dbGetSingle('SELECT empresa, representante, ruc, cod FROM proveedor WHERE cod = ? OR ruc = ? LIMIT 1', [c.idprov, c.idprov]);
        if(p.success && p.data){ provNombre = (p.data.empresa||p.data.representante||'').trim() || (p.data.ruc||''); }
      }catch(_){ }
      // Subtotal devuelto (sin IVA)
      let subDev = 0;
      try{
        const d = await window.electronAPI.dbGetSingle('SELECT SUM(cantidad * precio) as dev FROM devcompradet WHERE idcompra = ?', [c.id]);
        subDev = Number(d?.data?.dev||0);
      }catch(_){ subDev = 0; }
      // Bases para IVA proporcional
      let baseCompra = 0, baseDevuelta = 0;
      try{
        const b1 = await window.electronAPI.dbGetSingle(`SELECT SUM(CASE WHEN COALESCE(p.grabaiva,'1')='1' THEN d.cantidad*d.precio ELSE 0 END) as base
          FROM compradet d LEFT JOIN producto p ON p.codigo=d.codprod WHERE d.idcompra = ?`, [c.id]);
        baseCompra = Number(b1?.data?.base||0);
        const b2 = await window.electronAPI.dbGetSingle(`SELECT SUM(CASE WHEN COALESCE(p.grabaiva,'1')='1' THEN dd.cantidad*dd.precio ELSE 0 END) as base
          FROM devcompradet dd LEFT JOIN producto p ON p.codigo=dd.codprod WHERE dd.idcompra = ?`, [c.id]);
        baseDevuelta = Number(b2?.data?.base||0);
      }catch(_){ baseCompra = 0; baseDevuelta = 0; }
      const ivaOriginal = Number(c.iva||0);
      const ivaDev = baseCompra>0 ? (ivaOriginal * (baseDevuelta/baseCompra)) : 0;
      const totalDev = subDev + ivaDev;
      const totalNeto = Math.max(0, Number(c.total||0) - totalDev);
      out.push({ ...c, provNombre, totalDevuelto: totalDev, totalNeto });
    }
    if(provFiltro && provFiltro.trim()){
      const term = provFiltro.trim().toLowerCase();
      return out.filter(v => String(v.idprov||'').toLowerCase().includes(term) || String(v.provNombre||'').toLowerCase().includes(term));
    }
    return out;
  },

  // Cargar items con "restantes" de una compra original
  async cargarItemsCompra(compraId){
    const v = await window.electronAPI.dbGetSingle('SELECT * FROM compra WHERE id = ? LIMIT 1', [compraId]);
    if(!v.success || !v.data) throw new Error('Compra no encontrada');
    const det = await window.electronAPI.dbQuery(`SELECT d.codprod, d.cantidad, d.precio, COALESCE(p.producto, p.descripcion, '') AS descripcion, COALESCE(p.grabaiva,'1') AS grabaiva FROM compradet d LEFT JOIN producto p ON p.codigo = d.codprod WHERE d.idcompra = ? ORDER BY CAST(d.item as INTEGER) ASC`, [compraId]);
    const rows = (det.success? det.data:[]);
    let devPrev = {};
    try{
      const q = await window.electronAPI.dbQuery('SELECT codprod, SUM(cantidad) as dev FROM devcompradet WHERE idcompra = ? GROUP BY codprod', [compraId]);
      if(q.success){ for(const r of q.data||[]){ devPrev[r.codprod] = Number(r.dev)||0; } }
    }catch(_){ }
    // Base gravada de la compra (para prorratear IVA original por unidad)
    const baseIvaCompra = rows.reduce((s,row)=> s + (String(row.grabaiva||'1')==='1' ? (Number(row.cantidad)||0)*(Number(row.precio)||0) : 0), 0);
    const ivaOriginalCompra = Number(v?.data?.iva)||0;
    const items = rows.map(d => {
      const comprado = Number(d.cantidad)||0;
      const yaDev = Number(devPrev[d.codprod]||0);
      const restante = Math.max(0, comprado - yaDev);
      const precio = Number(d.precio)||0;
      const graba = String(d.grabaiva||'1')==='1';
      const ivaUnitShare = (graba && baseIvaCompra>0) ? (ivaOriginalCompra * (precio / baseIvaCompra)) : 0;
      return { codprod: d.codprod, descripcion: d.descripcion, yaDevuelto: yaDev, cantidadRestante: restante, precio, grabaiva: String(d.grabaiva||'1'), ivaUnitShare, devolver: 0 };
    });
    return { compra: v.data, items, baseIvaCompra };
  },

  // Guardar devolución de compra desde el modal
  async guardarDevolucionCompra({ compra, devolverItems, subtotal, total }){
    if(!compra?.id) throw new Error('Compra inválida');
    if(!Array.isArray(devolverItems) || devolverItems.length===0) throw new Error('Sin items');
    await window.electronAPI.dbRun('BEGIN');
    try{
      const now = new Date().toISOString();
      const idDev = String(now.replace(/[^0-9]/g,'').slice(0,14));
      // Validar restantes por producto y construir items efectivos
      const det = await window.electronAPI.dbQuery('SELECT codprod, cantidad, precio FROM compradet WHERE idcompra = ?', [compra.id]);
      const compradoPorProd = {};
      for(const r of (det.success? det.data:[])){ compradoPorProd[r.codprod] = (compradoPorProd[r.codprod]||0) + Number(r.cantidad||0); }
      const devPrev = {};
      try{
        const q = await window.electronAPI.dbQuery('SELECT codprod, SUM(cantidad) as dev FROM devcompradet WHERE idcompra = ? GROUP BY codprod', [compra.id]);
        if(q.success){ for(const r of q.data||[]){ devPrev[r.codprod] = Number(r.dev)||0; } }
      }catch(_){ }
      const efectivos = [];
      for(const it of devolverItems){
        const comprado = Number(compradoPorProd[it.codprod]||0);
        const yaDev = Number(devPrev[it.codprod]||0);
        const restante = Math.max(0, comprado - yaDev);
        const cant = Math.max(0, Math.min(Number(it.cantidad)||0, restante));
        if(cant>0){ efectivos.push({ codprod: it.codprod, cantidad: cant, precio: Number(it.precio)||0 }); }
      }
      if(efectivos.length===0) throw new Error('No hay cantidades válidas a devolver');
      // Recalcular subtotales reales con los efectivos
      let subCalc = 0; for(const e of efectivos){ subCalc += e.cantidad * e.precio; }
      // Asegurar columna idcompra en devcompra para relacionar cabecera con compra original
      try{
        const infoCab = await window.electronAPI.dbQuery("PRAGMA table_info('devcompra')", []);
        const hasIdCompra = infoCab?.success && Array.isArray(infoCab.data) && infoCab.data.some(col => String(col.name||'').toLowerCase()==='idcompra');
        if(!hasIdCompra){ await window.electronAPI.dbRun("ALTER TABLE devcompra ADD COLUMN idcompra TEXT(14)"); }
      }catch(_){ /* continuar si falla */ }
      await window.electronAPI.dbRun(`INSERT INTO devcompra (id, idprov, fecha, subtotal, descuento, total, fpago, trial275, idcompra) VALUES (?, ?, ?, ?, 0, ?, ?, '0', ?)`, [
        idDev, compra.idprov||'', now, subCalc, subCalc, compra.fpago||0, compra.id||null
      ]);
      // Asegurar columna iddevcompra en devcompradet para asociar con devcompra.id
      let hasIdDevCompra = false;
      try{
        const info = await window.electronAPI.dbQuery("PRAGMA table_info('devcompradet')", []);
        hasIdDevCompra = info?.success && Array.isArray(info.data) && info.data.some(col => String(col.name||'').toLowerCase()==='iddevcompra');
        if(!hasIdDevCompra){ await window.electronAPI.dbRun("ALTER TABLE devcompradet ADD COLUMN iddevcompra TEXT(14)"); hasIdDevCompra = true; }
      }catch(_){ /* continuar si falla */ }
      // Continuar secuencia de items por idcompra para evitar conflicto UNIQUE(item,idcompra)
      let baseItem = 0;
      try{
        const mx = await window.electronAPI.dbGetSingle('SELECT MAX(CAST(item as INTEGER)) as maxItem FROM devcompradet WHERE idcompra = ?', [compra.id]);
        baseItem = Number(mx?.data?.maxItem)||0;
      }catch(_){ baseItem = 0; }
      let i = baseItem + 1;
      for(const it of efectivos){
        if(hasIdDevCompra){
          await window.electronAPI.dbRun(`INSERT INTO devcompradet (item, idcompra, iddevcompra, codprod, cantidad, precio, trial275) VALUES (?, ?, ?, ?, ?, ?, '0')`, [
            i++, compra.id, idDev, it.codprod, it.cantidad, it.precio
          ]);
        } else {
          await window.electronAPI.dbRun(`INSERT INTO devcompradet (item, idcompra, codprod, cantidad, precio, trial275) VALUES (?, ?, ?, ?, ?, '0')`, [
            i++, compra.id, it.codprod, it.cantidad, it.precio
          ]);
        }
        await window.electronAPI.dbRun('UPDATE producto SET almacen = almacen - ? WHERE codigo = ?', [it.cantidad, it.codprod]);
      }
      // Estado parcial/total
      const r1 = await window.electronAPI.dbGetSingle('SELECT SUM(cantidad) as total FROM compradet WHERE idcompra = ?', [compra.id]);
      const r2 = await window.electronAPI.dbGetSingle('SELECT SUM(cantidad) as total FROM devcompradet WHERE idcompra = ?', [compra.id]);
      const tc = Number(r1?.data?.total||0); const td = Number(r2?.data?.total||0);
      const estado = td >= tc ? '0' : '2';
      await window.electronAPI.dbRun('UPDATE compra SET trial272 = ? WHERE id = ?', [estado, compra.id]);
      await window.electronAPI.dbRun('COMMIT');
      return { success:true, id: idDev };
    }catch(e){ await window.electronAPI.dbRun('ROLLBACK'); throw e; }
  },
  async listar({ desde, hasta }){
    const where = []; const params = [];
    if(desde){ where.push('date(fecha) >= date(?)'); params.push(desde); }
    if(hasta){ where.push('date(fecha) <= date(?)'); params.push(hasta); }
    const sql = `SELECT id, idprov AS tercero, fecha, subtotal, descuento, total, fpago FROM devcompra ${where.length?('WHERE '+where.join(' AND ')):''} ORDER BY fecha DESC, id DESC LIMIT 1000`;
    const res = await window.electronAPI.dbQuery(sql, params);
    if(!res.success) throw new Error(res.error||'No se pudo consultar devoluciones');
    const data = res.data||[];
    // Enriquecer con nombre de proveedor
    const out = [];
    for(const r of data){
      let proveedorNombre = '';
      try{
        const p = await window.electronAPI.dbGetSingle('SELECT empresa, ruc FROM proveedor WHERE cod = ? OR ruc = ? LIMIT 1', [r.tercero, r.tercero]);
        if(p.success && p.data){ proveedorNombre = p.data.empresa || p.data.ruc || ''; }
      }catch(_){ }
      out.push({ ...r, proveedorNombre });
    }
    return out;
  },
  async eliminar(ids = []){
    for(const id of ids){
      try{
        const det = await window.electronAPI.dbQuery('SELECT codprod, cantidad, idcompra FROM devcompradet WHERE idcompra = ?', [id]);
        let originalId = null;
        if(det.success){
          for(const it of det.data||[]){
            await window.electronAPI.dbRun('UPDATE producto SET almacen = almacen + ? WHERE codigo = ?', [Number(it.cantidad)||0, it.codprod]);
            originalId = originalId || it.idcompra;
          }
        }
        await window.electronAPI.dbRun('DELETE FROM devcompradet WHERE idcompra = ?', [id]);
        await window.electronAPI.dbRun('DELETE FROM devcompra WHERE id = ?', [id]);
        if(originalId){
          const r1 = await window.electronAPI.dbGetSingle('SELECT SUM(cantidad) as total FROM compradet WHERE idcompra = ?', [originalId]);
          const r2 = await window.electronAPI.dbGetSingle('SELECT SUM(cantidad) as total FROM devcompradet WHERE idcompra = ?', [originalId]);
          const tc = Number(r1?.data?.total||0); const td = Number(r2?.data?.total||0);
          const estado = td<=0 ? '1' : (td<tc ? '2' : '0');
          await window.electronAPI.dbRun('UPDATE compra SET trial272 = ? WHERE id = ?', [estado, originalId]);
        }
      }catch(_){ /* continuar */ }
    }
  }
};
