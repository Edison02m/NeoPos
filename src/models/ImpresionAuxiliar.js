class ImpresionAuxiliar {
  // Tabla: impresionauxiliar (nombre TEXT(25), valor TEXT(200), trial275 TEXT(1))
  static async findAll(){
    const sql = 'SELECT nombre, valor, trial275 FROM impresionauxiliar ORDER BY nombre';
    const result = await window.electronAPI.dbQuery(sql, []);
    if(!result.success) throw new Error(result.error);
    return result.data || [];
  }
  static async upsert(record){
    const { nombre, valor='', trial275='' } = record;
    if(!nombre) throw new Error('nombre requerido');
    const exists = await window.electronAPI.dbGetSingle('SELECT nombre FROM impresionauxiliar WHERE nombre=?', [nombre]);
    if(exists.success && exists.data){
      const upd = await window.electronAPI.dbRun('UPDATE impresionauxiliar SET valor=?, trial275=? WHERE nombre=?', [valor, trial275, nombre]);
      if(!upd.success) throw new Error(upd.error);
      return { updated:true };
    } else {
      const ins = await window.electronAPI.dbRun('INSERT INTO impresionauxiliar (nombre, valor, trial275) VALUES (?,?,?)', [nombre, valor, trial275]);
      if(!ins.success) throw new Error(ins.error);
      return { inserted:true };
    }
  }
  static async bulkSave(records=[]){
    for(const r of records){
      await ImpresionAuxiliar.upsert(r);
    }
    return { success:true };
  }
}
export default ImpresionAuxiliar;
