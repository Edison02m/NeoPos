const fs = require('fs');
const path = require('path');

// Leer package.json
const packagePath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Extraer versión actual
const currentVersion = packageJson.version;
const versionParts = currentVersion.split('.');
const majorMinor = versionParts.slice(0, 2).join('.');
const patchBeta = versionParts[2];

// Incrementar beta
if (patchBeta.includes('-beta.')) {
  const [patch, betaPart] = patchBeta.split('-beta.');
  const currentBeta = parseInt(betaPart);
  const newBeta = currentBeta + 1;
  packageJson.version = `${majorMinor}.${patch}-beta.${newBeta}`;
} else {
  // Si no es beta, hacer la primera versión beta del siguiente patch
  const patch = parseInt(versionParts[2]);
  packageJson.version = `${majorMinor}.${patch + 1}-beta.1`;
}

// Escribir package.json actualizado
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`✅ Versión incrementada: ${currentVersion} → ${packageJson.version}`);
