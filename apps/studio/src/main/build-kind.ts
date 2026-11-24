import { devSwitches } from './env/dev-switches.js';
declare const __OFFICIAL_BUILD__: boolean;
declare const __SELF_UPDATE__: boolean;

export const OFFICIAL_BUILD = typeof __OFFICIAL_BUILD__ === 'boolean'
  ? __OFFICIAL_BUILD__
  : devSwitches.testOfficialBuild === '1';

export const SELF_UPDATE = typeof __SELF_UPDATE__ === 'boolean' && __SELF_UPDATE__;

export function buildIdentity(official: boolean): { appId: string; productName: string; dataFolder: string } {
  return official
    ? { appId: 'com.renan.renandesign', productName: 'RenanDesign', dataFolder: 'Onlook Studio' }
    : { appId: 'com.renan.renandesign.source', productName: 'RenanDesign', dataFolder: 'Onlook Studio Source' };
}
