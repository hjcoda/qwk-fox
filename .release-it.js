import { readFileSync, writeFileSync, execSync } from 'fs';
import { resolve } from 'path';

const versionBumpScript = ({ version }) => {
  const jsonFiles = [
    './package.json',
    './src-tauri/tauri.conf.json'
  ];

  const cargoFiles = [
    './src-tauri/Cargo.toml',
    './src-tauri/qwk_rs/Cargo.toml'
  ];

  for (const file of jsonFiles) {
    const content = JSON.parse(readFileSync(file, 'utf8'));
    content.version = version;
    writeFileSync(resolve(file), JSON.stringify(content, null, 2) + '\n');
  }

  for (const file of cargoFiles) {
    let content = readFileSync(resolve(file), 'utf8');
    content = content.replace(/^version = ".*"$/m, `version = "${version}"`);
    writeFileSync(resolve(file), content);
  }

  execSync('npm install', { stdio: 'inherit' });
  execSync('cd src-tauri && cargo update', { stdio: 'inherit' });

  return true;
};

export default {
  github: {
    release: true,
    draft: true
  },
  git: {
    commitMessage: 'Bump version to ${version} [skip ci]',
    tagName: 'v${version}',
    push: true
  },
  hooks: {
    'bump:version': versionBumpScript
  },
  plugins: {
    '@release-it/conventional-changelog': {
      preset: 'angular',
      infile: 'CHANGELOG.md',
      header: '# Changelog'
    }
  }
};
