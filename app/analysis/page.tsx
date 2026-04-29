"use client";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">

      {/* Navbar */}
      <div className="flex justify-between items-center px-10 py-5 bg-white shadow">
        <h1 className="text-xl font-bold">⚖️ Legal AI</h1>
        <button
          onClick={() => router.push("/upload")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Get Started
        </button>
      </div>

      {/* Hero */}
      <div className="text-center mt-20 px-6">
        <h1 className="text-4xl font-bold mb-4">
          Understand Legal Documents Instantly
        </h1>

        <p className="text-gray-600 max-w-xl mx-auto">
          Upload contracts and let AI simplify complex terms,
          detect risks, and give clear insights.
        </p>

        <button
          onClick={() => router.push("/upload")}
          className="mt-6 bg-green-600 text-white px-6 py-3 rounded-lg text-lg"
        >
          Start Analyzing 🚀
        </button>
      </div>

      {/* Features */}
      <div className="mt-20 px-10 grid md:grid-cols-3 gap-6">

        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="font-bold text-lg">📄 Upload Documents</h3>
          <p className="text-gray-600 text-sm mt-2">
            Supports PDF & DOCX files
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="font-bold text-lg">🤖 AI Analysis</h3>
          <p className="text-gray-600 text-sm mt-2">
            Converts legal language into simple terms
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="font-bold text-lg">⚠️ Risk Detection</h3>
          <p className="text-gray-600 text-sm mt-2">
            Identifies risky clauses instantly
          </p>
        </div>

      </div>

      {/* Footer */}
      <div className="mt-20 text-center text-gray-500 pb-6">
        © 2026 Legal AI Analyzer 🚀
      </div>
    </div>
  );
}