class ImpresionNC {
  // Tabla: impresionnc (objeto TEXT(80), posx REAL, posy REAL, trial275 TEXT(1))
  static async findAll(){
    const sql = 'SELECT objeto, posx, posy, trial275 FROM impresionnc ORDER BY objeto';
    const result = await window.electronAPI.dbQuery(sql, []);
    if(!result.success) throw new Error(result.error);
    return result.data || [];
  }
  static async upsert(record){
    const { objeto, posx=null, posy=null, trial275='' } = record;
    if(!objeto) throw new Error('objeto requerido');
    const exists = await window.electronAPI.dbGetSingle('SELECT objeto FROM impresionnc WHERE objeto=?', [objeto]);
    if(exists.success && exists.data){
      const upd = await window.electronAPI.dbRun('UPDATE impresionnc SET posx=?, posy=?, trial275=? WHERE objeto=?', [posx, posy, trial275, objeto]);
      if(!upd.success) throw new Error(upd.error);
      return { updated:true };
    } else {
      const ins = await window.electronAPI.dbRun('INSERT INTO impresionnc (objeto, posx, posy, trial275) VALUES (?,?,?,?)', [objeto, posx, posy, trial275]);
      if(!ins.success) throw new Error(ins.error);
      return { inserted:true };
    }
  }
  static async bulkSave(records=[]){
    for(const r of records){
      await ImpresionNC.upsert(r);
    }
    return { success:true };
  }
}
export default ImpresionNC;
