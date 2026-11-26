/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export default function App() {
  return (
    <main className="min-h-screen bg-[#060d1a] text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-xl text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">MIYONI</h1>
        <p className="text-slate-300">We build functionality and quality.</p>
        <p className="text-sm text-slate-400">
          Public pages are server-rendered by the MIYONI Worker entry point (worker.js / server.ts).
        </p>
      </div>
    </main>
  );
}
