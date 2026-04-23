export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-forest-dense">
      <h1 className="text-white text-2xl font-bold mb-8">우리 동네 픽셀 숲</h1>
      <div className="flex flex-col gap-4 w-72">
        {/* OAuth 버튼은 NextAuth 연동 후 구현 */}
        <button className="bg-white text-gray-800 rounded px-6 py-3 font-medium hover:bg-gray-100 transition-colors">
          Google로 시작하기
        </button>
        <button className="bg-yellow-400 text-gray-800 rounded px-6 py-3 font-medium hover:bg-yellow-300 transition-colors">
          카카오로 시작하기
        </button>
      </div>
    </main>
  );
}
