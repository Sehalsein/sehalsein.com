import "@/styles/globals.css";
import { NextPageWithLayout } from "@/types/next";
import type { AppProps } from "next/app";
import type { ReactElement } from "react";
import Head from "next/head";

interface MyAppProps extends AppProps {
  Component: NextPageWithLayout;
}

export default function App({ Component, pageProps }: MyAppProps) {
  const getLayout = Component.getLayout || ((page: ReactElement) => page);

  return (
    <>
      <Head>
        <title>Sehal Sein</title>
        <meta name="description" content="Sehal Sein" />
      </Head>
      {getLayout(<Component {...pageProps} />)}
    </>
  );
}
