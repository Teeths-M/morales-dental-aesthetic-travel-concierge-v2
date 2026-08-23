// Type-checking-only stub for 'three', pointed to via jsconfig.json's
// `paths` remap ("three": ["./src/types/three-stub.d.ts"]).
//
// A plain `declare module 'three';` ambient declaration does NOT suppress
// checking here: three's package.json has no `types`/`typings` field, so
// under `moduleResolution: "bundler"` TypeScript successfully resolves the
// bare specifier to the real build/three.module.js — and once a real file
// resolves, `checkJs: true` pulls that huge bundled file into the program
// as its own first-class checkable module, deep-diving into it (Color/
// number union mismatches, helper-class property access, __THREE_DEVTOOLS__
// globals) regardless of any ambient shim. ~30 spurious errors, nothing to
// do with this app's own code.
//
// A `paths` remap operates at module RESOLUTION, before ambient
// declarations are ever consulted — it stops TS from ever opening the real
// three.module.js at all. This only affects TypeScript's own type
// resolution; Vite's real bundler resolution (and the actual runtime
// import) is untouched, since Vite ignores jsconfig/tsconfig `paths`.
declare const THREE: any;
export = THREE;
