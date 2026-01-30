import { fetchCatalog } from "./db";
import { qs, qsa } from "./utils";
import { mountCartDrawer } from "./cart";

type MaterialFilter = "all" | "fresh" | "artificial";

function renderGrid(list: any[]){
  const grid = qs<HTMLDivElement>("#productsGrid");
  if (!grid) return;
  grid.innerHTML = list.map(p => `
    <div class="product-card" data-product-id="${p.id}">
      <div class="product-image">
        <img loading="lazy" src="${p.images[0] || ""}" alt="${p.name}">
      </div>
      <div class="product-info">
        <h3 class="product-title">${p.name}</h3>
        <p class="product-description">${p.description}</p>
        <div class="product-footer">
          <span class="product-price">From $${(Math.min(...p.variants.map((v:any)=>v.priceCents))/100).toFixed(2)}</span>
          <a href="product-details.html?id=${p.id}" class="view-details-btn">View Details</a>
        </div>
      </div>
    </div>
  `).join("");
}

async function main(){
  const all = await fetchCatalog();

  const categorySel = qs<HTMLSelectElement>("#categorySelect");
  if (categorySel){
    const cats = Array.from(new Set(all.flatMap((p:any)=>p.categories))).filter(Boolean).sort();
    categorySel.innerHTML = `<option value="all">All categories</option>` + cats.map(c=>`<option value="${c}">${c}</option>`).join("");
  }

  let material: MaterialFilter = "all";
  let category = "all";
  let q = "";

  const apply = () => {
    const list = all.filter((p:any) => {
      const okMaterial = material==="all" ? true : p.material===material;
      const okCat = category==="all" ? true : p.categories.includes(category);
      const okQ = q ? p.name.toLowerCase().includes(q) : true;
      return okMaterial && okCat && okQ;
    });
    renderGrid(list);
  };

  qsa<HTMLButtonElement>(".material-pill").forEach(btn => btn.addEventListener("click", () => {
    material = (btn.dataset.material as MaterialFilter) || "all";
    qsa<HTMLButtonElement>(".material-pill").forEach(b => b.classList.toggle("active", b===btn));
    apply();
  }));
  categorySel?.addEventListener("change", () => { category = categorySel.value || "all"; apply(); });
  qs<HTMLInputElement>("#searchInput")?.addEventListener("input", (e) => {
    q = (e.currentTarget as HTMLInputElement).value.trim().toLowerCase();
    apply();
  });

  apply();
  mountCartDrawer();
}

main().catch(console.error);
