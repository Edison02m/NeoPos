class Impresion {
  // Nueva definición sin columna 'tipo'
  // Tabla real (después de alter): impresion (objeto TEXT(80) PRIMARY KEY, posx REAL, posy REAL, TEXTo TEXT(100), trial275 TEXT(1))
  static async findAll(){
    const sql = 'SELECT objeto, posx, posy, TEXTo, trial275 FROM impresion ORDER BY objeto';
    const result = await window.electronAPI.dbQuery(sql, []);
    if(!result.success) throw new Error(result.error);
    return result.data || [];
  }
  static async upsert(record){
    const { objeto, posx=null, posy=null, TEXTo='', trial275='' } = record;
    if(!objeto) throw new Error('objeto requerido');
    const exists = await window.electronAPI.dbGetSingle('SELECT objeto FROM impresion WHERE objeto=?', [objeto]);
    if(exists.success && exists.data){
      const upd = await window.electronAPI.dbRun('UPDATE impresion SET posx=?, posy=?, TEXTo=?, trial275=? WHERE objeto=?', [posx, posy, TEXTo, trial275, objeto]);
      if(!upd.success) throw new Error(upd.error);
      return { updated:true };
    } else {
      const ins = await window.electronAPI.dbRun('INSERT INTO impresion (objeto, posx, posy, TEXTo, trial275) VALUES (?,?,?,?,?)', [objeto, posx, posy, TEXTo, trial275]);
      if(!ins.success) throw new Error(ins.error);
      return { inserted:true };
    }
  }
  static async bulkSave(records=[]){
    for(const r of records){
      await Impresion.upsert(r);
    }
    return { success:true };
  }
}
export default Impresion;
