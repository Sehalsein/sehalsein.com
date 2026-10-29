import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 3000 },
  resolve: { dedupe: ['three'] },
  // Pre-bundle every three entry in one pass. When the optimizer discovers the
  // lazily imported Studio addons later, it can emit a second copy of three,
  // and `instanceof T.Bone`/`T.Mesh` then fail inside the character rig.
  optimizeDeps: {
    include: [
      'three',
      'three/addons/environments/RoomEnvironment.js',
      'three/addons/libs/meshopt_decoder.module.js',
      'three/addons/loaders/GLTFLoader.js',
      'three/addons/postprocessing/EffectComposer.js',
      'three/addons/postprocessing/GTAOPass.js',
      'three/addons/postprocessing/OutputPass.js',
      'three/addons/postprocessing/RenderPass.js',
      'three/addons/postprocessing/UnrealBloomPass.js',
      'three/addons/utils/BufferGeometryUtils.js',
    ],
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: (id: string) => (id.includes('/node_modules/three/') ? 'three' : undefined),
      },
    },
  },
});
