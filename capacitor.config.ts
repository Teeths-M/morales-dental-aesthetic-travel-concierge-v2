import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor wraps the built SPA in a native WebView on both platforms. There is
 * no Capacitor plugin code in src/ — the app is the same bundle everywhere, so
 * anything fixed here for the web is fixed for iOS and Android too.
 *
 * `npm run mobile:sync` builds and copies `dist/` into both native projects.
 * The Android project is committed at android/. The iOS project is NOT: `cap
 * add ios` runs `pod install`, which needs CocoaPods and Xcode, i.e. a Mac.
 * Run `npm run mobile:add:ios` there once and commit the result.
 */
const config: CapacitorConfig = {
  appId: 'com.morales.medicaltravel',
  appName: 'Morales',
  webDir: 'dist',

  ios: {
    // The web layer already handles the notch and home bar via
    // env(safe-area-inset-*). Letting the WebView also inset would double it.
    contentInset: 'never',
    // Emergency screens are dark; a white flash between splash and first paint
    // is jarring and, on the SOS path, reads as a crash.
    backgroundColor: '#060B16',
    // Pull-to-refresh inside a WebView reloads the SPA and drops in-flight
    // state — including a half-completed intake or an armed check-in.
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
  },

  android: {
    backgroundColor: '#060B16',
    // Ship only over HTTPS. Cleartext would let a hostile network on the road —
    // exactly where our patients are — read or rewrite safety traffic.
    allowMixedContent: false,
  },

  server: {
    // Both platforms serve the bundle over https:// rather than the legacy
    // file:// origin, so Web Crypto (the vault and PIN hashing both need
    // crypto.subtle, which is unavailable in non-secure contexts), geolocation
    // and service workers all behave as they do on the web.
    androidScheme: 'https',
    iosScheme: 'https',
  },
};

export default config;
