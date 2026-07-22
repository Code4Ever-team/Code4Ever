"use client";

import { useRouter } from "next/navigation";

export function JubbioLoginButton({ authUrl }: { authUrl: string }) {
  const router = useRouter();

  const handleLogin = () => {
    router.push(authUrl);
  };

  return (
    <button
      onClick={handleLogin}
      className="flex items-center justify-center w-full px-4 py-2 text-black bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
    >
      <svg
        className="w-5 h-5 mr-2"
        fill="currentColor"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          d="M10 0C4.477 0 0 4.477 0 10c0 4.418 3.582 8.05 8.207 8.207a.5.5 0 00.583-.583A8.006 8.006 0 0110 2a8.006 8.006 0 018.207 6.207.5.5 0 00.583.583A10.001 10.001 0 0010 0zm0 4a6 6 0 100 12 6 6 0 000-12z"
          clipRule="evenodd"
        />
      </svg>
      <span>Login with Jubbio</span>
    </button>
  );
}
