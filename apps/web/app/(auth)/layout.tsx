export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://kauth.kakao.com" />
      <link rel="preconnect" href="https://accounts.google.com" />
      {children}
    </>
  );
}
