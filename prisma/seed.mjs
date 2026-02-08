import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const sampleWorks = [
  {
    title: "Coastal Dawn",
    artist_name: "Sarah Chen",
    work_type: "synograph",
    dimensions: { width: 24, height: 36 },
    orientation: "portrait",
    hero: ["coastal","sunrise","ocean","serene","blue","warm tones","horizon","water","peaceful","nature"],
    hidden: ["beach","dawn","morning light","seascape","pastel","calm","meditation","living room","bedroom","spa","tranquil","soft","golden hour","reflections","minimalist","contemporary","atmospheric","coastal decor","nautical","summer"],
    colors: [{"r":135,"g":186,"b":215},{"r":245,"g":198,"b":142},{"r":72,"g":120,"b":165},{"r":255,"g":235,"b":205},{"r":100,"g":150,"b":180}],
  },
  {
    title: "Blue Horizon",
    artist_name: "Mark Rivera",
    work_type: "work_on_canvas",
    dimensions: { width: 30, height: 40 },
    orientation: "portrait",
    retailer_exclusive: "RH",
    hero: ["abstract","blue","contemporary","bold","textured","deep blue","layered","expressive","modern","large scale"],
    hidden: ["indigo","navy","cobalt","gestural","impasto","acrylic","office","lobby","dramatic","moody","masculine","sophisticated","statement piece","color field","abstract expressionism","winter","depth","ocean inspired","jewel toned","luxury"],
    colors: [{"r":25,"g":55,"b":120},{"r":60,"g":95,"b":170},{"r":15,"g":35,"b":80},{"r":100,"g":140,"b":200},{"r":40,"g":70,"b":140}],
  },
  {
    title: "Summer Roses",
    artist_name: "Emma Liu",
    work_type: "work_on_paper",
    dimensions: { width: 18, height: 24 },
    orientation: "portrait",
    hero: ["floral","roses","botanical","pink","delicate","romantic","garden","watercolor","feminine","spring"],
    hidden: ["flowers","petals","still life","blush","pastel pink","soft","bedroom","nursery","powder room","traditional","cottage","english garden","impressionist","light","airy","fresh","elegant","graceful","wedding","gift"],
    colors: [{"r":230,"g":180,"b":190},{"r":200,"g":120,"b":140},{"r":245,"g":230,"b":235},{"r":80,"g":130,"b":80},{"r":255,"g":245,"b":245}],
  },
  {
    title: "Urban Grid No. 7",
    artist_name: "James Okafor",
    work_type: "synograph",
    dimensions: { width: 36, height: 36 },
    orientation: "square",
    hero: ["geometric","urban","grid","monochrome","architectural","structured","modern","minimal","graphic","black and white"],
    hidden: ["lines","pattern","city","industrial","concrete","brutalist","office","commercial","loft","mid-century","bauhaus","constructivist","graphic design","neutral","contemporary art","wall art","masculine","professional","clean","stark"],
    colors: [{"r":30,"g":30,"b":30},{"r":200,"g":200,"b":200},{"r":120,"g":120,"b":120},{"r":245,"g":245,"b":245},{"r":80,"g":80,"b":80}],
  },
  {
    title: "Meadow at Dusk",
    artist_name: "Sarah Chen",
    work_type: "synograph",
    dimensions: { width: 40, height: 30 },
    orientation: "landscape",
    hero: ["landscape","meadow","dusk","golden","pastoral","warm","grass","sunset","countryside","atmospheric"],
    hidden: ["field","wildflowers","evening","twilight","amber","honey","earth tones","living room","dining room","rustic","farmhouse","cozy","nostalgic","romantic","plein air","impressionist","warm palette","autumn","harvest","peaceful"],
    colors: [{"r":180,"g":150,"b":80},{"r":120,"g":140,"b":70},{"r":220,"g":180,"b":100},{"r":200,"g":120,"b":60},{"r":160,"g":170,"b":90}],
  },
  {
    title: "Fragments in Red",
    artist_name: "Mark Rivera",
    work_type: "work_on_canvas",
    dimensions: { width: 48, height: 36 },
    orientation: "landscape",
    hero: ["abstract","red","bold","energetic","contemporary","dynamic","large","expressive","vivid","passionate"],
    hidden: ["crimson","scarlet","vermillion","gestural","action painting","lobby","restaurant","hotel","statement","dramatic","power","intensity","fire","movement","abstract expressionism","de kooning","warm","aggressive","impact","luxury"],
    colors: [{"r":200,"g":40,"b":40},{"r":160,"g":30,"b":50},{"r":240,"g":80,"b":60},{"r":120,"g":20,"b":30},{"r":255,"g":120,"b":90}],
  },
  {
    title: "Eucalyptus Study",
    artist_name: "Lily Nakamura",
    work_type: "work_on_paper",
    dimensions: { width: 16, height: 20 },
    orientation: "portrait",
    hero: ["botanical","eucalyptus","green","minimal","natural","organic","delicate","fresh","plant","study"],
    hidden: ["leaves","branches","sage","mint","muted green","watercolor","bathroom","kitchen","spa","scandinavian","japandi","wabi sabi","botanical illustration","nature study","calm","zen","wellness","clean","simple","understated"],
    colors: [{"r":140,"g":170,"b":140},{"r":180,"g":200,"b":175},{"r":100,"g":135,"b":110},{"r":230,"g":235,"b":225},{"r":160,"g":185,"b":155}],
  },
  {
    title: "Night Harbor",
    artist_name: "James Okafor",
    work_type: "photography",
    dimensions: { width: 36, height: 24 },
    orientation: "landscape",
    hero: ["photography","harbor","night","reflections","moody","urban","water","lights","atmospheric","dark"],
    hidden: ["marina","boats","docks","cityscape","neon","long exposure","cinematic","film noir","office","man cave","den","bachelor pad","contemporary","dramatic","mysterious","evening","cool tones","deep blue","purple","street photography"],
    colors: [{"r":20,"g":25,"b":50},{"r":60,"g":50,"b":80},{"r":200,"g":180,"b":100},{"r":40,"g":40,"b":70},{"r":150,"g":130,"b":80}],
  },
  {
    title: "Terracotta Dreams",
    artist_name: "Amara Diallo",
    work_type: "synograph",
    dimensions: { width: 24, height: 30 },
    orientation: "portrait",
    retailer_exclusive: "CB2",
    hero: ["abstract","terracotta","warm","organic shapes","earth tones","contemporary","mid-century","desert","sculptural","muted"],
    hidden: ["burnt orange","clay","rust","sienna","adobe","southwest","bohemian","living room","entryway","matisse","organic","curved","neutral","earthy","natural","warm palette","autumn","cozy","textural","handmade feel"],
    colors: [{"r":195,"g":120,"b":80},{"r":220,"g":160,"b":120},{"r":170,"g":90,"b":60},{"r":240,"g":220,"b":200},{"r":150,"g":80,"b":50}],
  },
  {
    title: "Reductive Composition No. 3",
    artist_name: "Lily Nakamura",
    work_type: "reductive",
    dimensions: { width: 30, height: 30 },
    orientation: "square",
    hero: ["reductive","minimal","geometric","neutral","subtle","quiet","contemplative","texture","monochrome","refined"],
    hidden: ["beige","cream","white","off-white","linen","plaster","relief","bedroom","meditation room","gallery","museum quality","agnes martin","minimalism","zen","peaceful","sophisticated","luxury","collector","investment","timeless"],
    colors: [{"r":235,"g":230,"b":220},{"r":215,"g":210,"b":200},{"r":245,"g":242,"b":238},{"r":200,"g":195,"b":185},{"r":225,"g":220,"b":212}],
  },
  {
    title: "Verdant Abstraction",
    artist_name: "Amara Diallo",
    work_type: "work_on_canvas",
    dimensions: { width: 36, height: 48 },
    orientation: "portrait",
    hero: ["abstract","green","lush","organic","layered","tropical","vibrant","botanical","rich","depth"],
    hidden: ["emerald","forest","jungle","foliage","verdant","palm","monstera","living room","dining room","hotel lobby","biophilic","nature inspired","jewel toned","saturated","spring","growth","renewal","exotic","luxury","statement piece"],
    colors: [{"r":40,"g":120,"b":60},{"r":80,"g":160,"b":90},{"r":20,"g":80,"b":40},{"r":120,"g":180,"b":100},{"r":60,"g":140,"b":70}],
  },
  {
    title: "Concrete Poetry",
    artist_name: "James Okafor",
    work_type: "photography",
    dimensions: { width: 24, height: 36 },
    orientation: "portrait",
    hero: ["photography","architecture","concrete","brutalist","geometric","urban","shadows","monochrome","structural","imposing"],
    hidden: ["building","facade","modernist","angles","lines","gray","industrial","office","loft","studio","architect","le corbusier","stark","powerful","scale","perspective","black and white","contrast","dramatic","editorial"],
    colors: [{"r":150,"g":150,"b":150},{"r":100,"g":100,"b":100},{"r":200,"g":200,"b":200},{"r":60,"g":60,"b":60},{"r":180,"g":180,"b":180}],
  },
];

async function main() {
  const client = await pool.connect();
  console.log("Connected to database. Seeding sample works...\n");

  const year = new Date().getFullYear();
  let counter = 1;

  for (const work of sampleWorks) {
    const sku = `GP${year}${String(counter).padStart(4, "0")}`;
    counter++;

    await client.query(
      `INSERT INTO works (
        gp_sku, title, artist_name, work_type, dimensions_inches, orientation,
        retailer_exclusive, ai_tags_hero, ai_tags_hidden, dominant_colors,
        status, source_type, image_url_thumbnail, image_url_preview, image_url_source,
        updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, NOW())`,
      [
        sku,
        work.title,
        work.artist_name,
        work.work_type,
        JSON.stringify(work.dimensions),
        work.orientation,
        work.retailer_exclusive || null,
        work.hero,
        work.hidden,
        JSON.stringify(work.colors),
        "active",
        "gp_original",
        `https://placehold.co/300x400/f5f5f5/999?text=${encodeURIComponent(work.title)}`,
        `https://placehold.co/1200x1600/f5f5f5/999?text=${encodeURIComponent(work.title)}`,
        `https://placehold.co/1200x1600/f5f5f5/999?text=${encodeURIComponent(work.title)}`,
      ]
    );

    console.log(`  ${sku} - ${work.title} by ${work.artist_name}${work.retailer_exclusive ? ` [${work.retailer_exclusive} Exclusive]` : ""}`);
  }

  console.log(`\nSeeded ${sampleWorks.length} works successfully.`);
  client.release();
  await pool.end();
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
