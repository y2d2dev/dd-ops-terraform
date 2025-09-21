import type { Metadata } from 'next'
import Script from 'next/script'
import { AntdProvider } from '@/providers/AntdProvider'
import { NuqsProvider } from '@/providers/NuqsProvider'

export const metadata: Metadata = {
  title: 'DD-OPS',
  description: 'Development and Operations Dashboard',
}

/**
 * Root layout component for the application
 * @param children - Child components to render
 * @returns JSX element
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <Script
          id="clarity-tracking"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "t3d3jsfosz");
            `
          }}
        />
        <AntdProvider>
          <NuqsProvider>
            {children}
          </NuqsProvider>
        </AntdProvider>
      </body>
    </html>
  )
}