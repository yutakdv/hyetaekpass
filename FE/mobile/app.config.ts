import type {ExpoConfig} from 'expo/config';
const production = process.env.APP_ENV === 'production';
if(production&&process.env.EXPO_PUBLIC_VALIDATION_BUILD==='true')throw Error('Production cannot enable the validation HTTP exception.');
const config: ExpoConfig = {
  name: '혜택패스', slug: 'hyetaekpass', version: '0.1.0', scheme: 'hyetaekpass',
  icon: '../../assets/brand/app-icon-1024.png', orientation: 'portrait', userInterfaceStyle: 'light',
  ios: {bundleIdentifier: 'com.hyetaekpass.app', supportsTablet: true, infoPlist: {NSAppTransportSecurity: {NSAllowsArbitraryLoads: !production}}},
  android: {blockedPermissions: ['android.permission.READ_EXTERNAL_STORAGE','android.permission.WRITE_EXTERNAL_STORAGE','android.permission.SYSTEM_ALERT_WINDOW',...(production?['android.permission.ACCESS_BACKGROUND_LOCATION','android.permission.FOREGROUND_SERVICE_LOCATION','android.permission.FOREGROUND_SERVICE']:[])],package: 'com.hyetaekpass.app', adaptiveIcon: {foregroundImage: '../../assets/brand/app-icon-1024.png', backgroundColor: '#086653'}},
  web: {favicon: '../../assets/brand/app-icon-1024.png'},
  plugins: [
    ['expo-secure-store', {configureAndroidBackup: true, faceIDPermission: false}],
    ['expo-location', {locationWhenInUsePermission: '요청하신 주변 목록의 거리 순서를 단말에서 계산합니다. 위치는 서버에 보내지 않습니다.', locationAlwaysAndWhenInUsePermission: production?false:'선택한 파일럿의 주변 안내에만 사용하며 관측이 부족하면 알리지 않습니다.', locationAlwaysPermission: production?false:'선택한 파일럿의 주변 안내에만 위치를 사용합니다.', motionUsagePermission: false, isIosBackgroundLocationEnabled: !production, isAndroidBackgroundLocationEnabled: !production}],
    ['expo-notifications', {color: '#086653'}],
    ['expo-build-properties', {android: {usesCleartextTraffic: !production}}], ...(!production?['expo-dev-client']:[])
  ]
};
export default config;
