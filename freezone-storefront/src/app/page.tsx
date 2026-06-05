const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";

type Catalog = { total?: number; products?: { id: number; name: string; price: number }[] };

export default async function HomePage() {
  let catalog: Catalog = {};
  try {
    const res = await fetch(`${API}/api/ssr/catalog/products?locale=ar`, {
      next: { revalidate: 60 },
    });
    if (res.ok) catalog = await res.json();
  } catch {
    catalog = { products: [] };
  }
  const products = catalog.products ?? [];
  const total = catalog.total ?? products.length;

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Freezone — واجهة Next.js (المرحلة 2)</h1>
      <p>منتجات من API: {total}</p>
      <ul>
        {products.slice(0, 12).map((p) => (
          <li key={p.id}>
            <a href={`/product/${p.id}`}>{p.name}</a> — {p.price.toLocaleString("ar-IQ")} IQD
          </li>
        ))}
      </ul>
    </main>
  );
}
