# Code Citations

## License: unknown
https://github.com/ManeeshDev/nextjs-leafy-hut/tree/4dea1f65bc7e9071d995d47ff15508ab0c97ce5f/pages/_app.tsx

```
AppProps } from 'next/app';
import Layout from '../components/Layout';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  )
```
