import {
    defineConfig,
    minimal2023Preset as preset,
} from '@vite-pwa/assets-generator/config'

export default defineConfig({
    headLinkOptions: {
        preset: '2023',
    },
    preset,
    // Use only favicon-swas.png as requested (place it at client/public/favicon-swas.png)
    images: ['public/favicon-swas.png'],
})
