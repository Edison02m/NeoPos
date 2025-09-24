// Utilidades financieras centralizadas
// Soporta CommonJS y ES Modules

function round2(n){
  const x = Math.round((Number(n)||0)*100)/100;
  return x === 0 ? 0 : x; // evita -0
}

/**
 * Distribuye cuotas para un saldo financiado agregando interés plano
 * @param {Object} opts
 * @param {number} opts.saldoBase Saldo base sobre el que se calcula interés (ya neto de anticipo)
 * @param {number} opts.interesPorc Porcentaje de interés (ej. 5 para 5%)
 * @param {number} opts.numCuotas Número de cuotas (>=1)
 * @returns {{interesTotal:number,totalFinanciado:number,valoresCuota:number[],interesesCuota:number[],valorCuotaProm:number}}
 */
function distribuirCuotas({ saldoBase, interesPorc, numCuotas }){
  const cuotas = Math.max(parseInt(numCuotas||0,10)||0,1);
  const interesPct = Math.max(Number(interesPorc)||0,0);
  const interesTotal = interesPct>0 ? round2(saldoBase * (interesPct/100)) : 0;
  const totalFinanciado = round2(saldoBase + interesTotal);
  const baseCuota = Math.floor((totalFinanciado / cuotas) * 100) / 100;
  let restoCent = Math.round(totalFinanciado*100) - Math.round(baseCuota*100)*cuotas;
  const valoresCuota = Array.from({length:cuotas},()=> baseCuota);
  for(let i=0;i<valoresCuota.length && restoCent>0;i++){ valoresCuota[i] = round2(valoresCuota[i] + 0.01); restoCent--; }
  const baseInt = cuotas>0 ? Math.floor((interesTotal/cuotas)*100)/100 : 0;
  let restoInt = Math.round(interesTotal*100) - Math.round(baseInt*100)*cuotas;
  const interesesCuota = Array.from({length:cuotas},()=> baseInt);
  for(let i=0;i<interesesCuota.length && restoInt>0;i++){ interesesCuota[i] = round2(interesesCuota[i] + 0.01); restoInt--; }
  const valorCuotaProm = round2(totalFinanciado / cuotas);
  return { interesTotal, totalFinanciado, valoresCuota, interesesCuota, valorCuotaProm };
}

/**
 * Calcula descuento sobre base (base incluye IVA si así se arma) según tipo
 * @param {number} base Base sobre la que se aplica descuento
 * @param {'percent'|'valor'} tipo Tipo de descuento
 * @param {number} valor Valor o porcentaje ingresado
 */
function calcularDescuento(base, tipo, valor){
  const b = round2(Number(base)||0);
  if(tipo === 'percent'){
    const perc = Math.min(100, Math.max(0, Number(valor)||0));
    return round2(b * (perc/100));
  }
  return Math.min(b, Math.max(0, round2(valor)));
}

// ESM exports solamente (evita conflicto con harmony module decorator)
export { round2, distribuirCuotas, calcularDescuento };
export default { round2, distribuirCuotas, calcularDescuento };
