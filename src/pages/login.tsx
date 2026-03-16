import React from "react";
import Head from "next/head";
import { LoginPage } from "@/common/components/Login/LoginPage";

export default function Login() {
  return (
    <>
      <Head>
        <title>Sign in — WorkDash</title>
      </Head>
      <LoginPage />
    </>
  );
}
