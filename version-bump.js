// Usage: node version-bump.js
const { readFileSync, writeFileSync } = require('fs');

const targetVersion = process.env.npm_package_version;

// Проверка, задана ли версия
if (!targetVersion) {
  console.error("❌ Ошибка: npm_package_version не задан. Запускайте через 'npm version patch'.");
  process.exit(1);
}

try {
  // Читаем текущий manifest
  const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));

  // Читаем или создаем versions.json
  let versions = {};
  try {
    versions = JSON.parse(readFileSync('versions.json', 'utf8'));
  } catch (error) {
    console.error('❌ Ошибка при чтении versions.json:', error);
    console.warn('⚠️ Warning: versions.json не найден, создается новый.');
  }

  // Обновляем версию в manifest.json
  manifest.version = targetVersion;
  writeFileSync('manifest.json', JSON.stringify(manifest, null, 4));

  // Обновляем versions.json
  versions[targetVersion] = manifest.minAppVersion || 'unknown';
  writeFileSync('versions.json', JSON.stringify(versions, null, 4));

  // Читаем и обновляем community-plugins.json
  const communityPlugins = JSON.parse(readFileSync('community-plugins.json', 'utf8'));
  const pluginIndex = communityPlugins.findIndex(plugin => plugin.id === 'groq-chat-plugin');
  if (pluginIndex !== -1) {
    communityPlugins[pluginIndex].version = targetVersion;
    writeFileSync('community-plugins.json', JSON.stringify(communityPlugins, null, 4));
    console.log(`✅ Версия обновлена до ${targetVersion} в community-plugins.json`);
  } else {
    console.warn('⚠️ Warning: Плагин groq-chat-plugin не найден в community-plugins.json');
  }

  console.log(`✅ Версия обновлена до ${targetVersion}`);
} catch (error) {
  console.error('❌ Ошибка обновления версии:', error);
  process.exit(1);
}
