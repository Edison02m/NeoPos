class ImpresionOffset {
  // Tabla: impresionoffset ("offset" REAL(3,1), trial275 TEXT(1))
  static async getOffset(){
    const res = await window.electronAPI.dbGetSingle('SELECT offset, trial275 FROM impresionoffset LIMIT 1', []);
    if(!res.success) throw new Error(res.error);
    return res.data || { offset:0 };
  }
  static async setOffset(offsetValue){
    const existing = await window.electronAPI.dbGetSingle('SELECT offset FROM impresionoffset LIMIT 1', []);
    if(existing.success && existing.data){
      const upd = await window.electronAPI.dbRun('UPDATE impresionoffset SET offset=?', [offsetValue]);
      if(!upd.success) throw new Error(upd.error);
      return { updated:true };
    } else {
      const ins = await window.electronAPI.dbRun('INSERT INTO impresionoffset (offset) VALUES (?)', [offsetValue]);
      if(!ins.success) throw new Error(ins.error);
      return { inserted:true };
    }
  }
}
export default ImpresionOffset;
