import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-yolk px-5 text-crust">
      <div className="max-w-lg">
        <p className="sticker size-28 -rotate-12 bg-ketchup text-4xl text-white shadow-box">404</p>
        <h1 className="mt-8 text-title">This page isn’t on the menu</h1>
        <p className="mt-4 text-xl font-medium">The page you asked for doesn’t exist, or isn’t published yet.</p>
        <Link href="/" className="btn-submit mt-10 inline-flex min-h-12 items-center rounded-control px-7 text-lg font-bold">
          Choose your state
        </Link>
      </div>
    </main>
  );
}
