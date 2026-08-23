// Type-checking-only stub for the specific three/examples/jsm/* addon
// imports RoboOrb3D.jsx uses (RoomEnvironment, EffectComposer, RenderPass,
// UnrealBloomPass), pointed to via jsconfig.json's `paths` wildcard
// ("three/examples/jsm/*": [...]).
//
// Redirecting the bare 'three' specifier alone (see three-stub.d.ts) isn't
// enough: each addon .js file is its own real file on disk with its own
// internal `import { X, Y } from 'three'` statements (named imports, not
// namespace imports) — opening any of them to read RoomEnvironment/etc.'s
// real type still pulls in three's own real bundled source (to resolve
// those named imports) and full-checkJs's it, the same ~30-error cascade
// the bare-specifier stub exists to prevent, just reached a different way.
// Redirecting these deep paths too means TS never opens the real addon
// files at all for type purposes — named imports from any of them just
// resolve to `any` here instead.
export const RoomEnvironment: any;
export const EffectComposer: any;
export const RenderPass: any;
export const UnrealBloomPass: any;
