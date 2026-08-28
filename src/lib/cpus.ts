/**
 * The CPU catalogue.
 *
 * A fixed list rather than free text, because the point of collecting this is
 * to aggregate it — "average install on a Ryzen 9" is unanswerable if everyone
 * types the model differently.
 *
 * Hand-maintained on purpose. Vendor catalogues are compiled databases with
 * their own terms; these are short factual model names, and the list only
 * needs to cover machines people actually install Omarchy on.
 *
 * Missing a chip? Add one line, keep the file sorted by id, and open a pull
 * request. `tests/cpus.test.ts` enforces the rules, so CI will reject a
 * malformed entry before a human reads it.
 *
 * Core counts are deliberately absent rather than guessed; add them per entry
 * if stats ever need them.
 */

export type CpuVendor = "AMD" | "Apple" | "Intel"

export type Cpu = {
  /** Stable slug: `<vendor>-<model>`, lowercase kebab-case. Never renamed. */
  id: string
  vendor: CpuVendor
  /** What stats group by, e.g. "Ryzen 9000", "Core Ultra 200S", "M4". */
  family: string
  /** As the vendor writes it, minus the vendor name itself. */
  name: string
}

export const CPUS: readonly Cpu[] = [
  { id: "amd-ryzen-3-1200", vendor: "AMD", family: "Ryzen 1000", name: "Ryzen 3 1200" },
  { id: "amd-ryzen-3-1300x", vendor: "AMD", family: "Ryzen 1000", name: "Ryzen 3 1300X" },
  { id: "amd-ryzen-3-2200g", vendor: "AMD", family: "Ryzen 1000", name: "Ryzen 3 2200G" },
  { id: "amd-ryzen-3-3100", vendor: "AMD", family: "Ryzen 3000", name: "Ryzen 3 3100" },
  { id: "amd-ryzen-3-3300x", vendor: "AMD", family: "Ryzen 3000", name: "Ryzen 3 3300X" },
  { id: "amd-ryzen-5-1400", vendor: "AMD", family: "Ryzen 1000", name: "Ryzen 5 1400" },
  { id: "amd-ryzen-5-1500x", vendor: "AMD", family: "Ryzen 1000", name: "Ryzen 5 1500X" },
  { id: "amd-ryzen-5-1600", vendor: "AMD", family: "Ryzen 1000", name: "Ryzen 5 1600" },
  { id: "amd-ryzen-5-1600x", vendor: "AMD", family: "Ryzen 1000", name: "Ryzen 5 1600X" },
  { id: "amd-ryzen-5-2400g", vendor: "AMD", family: "Ryzen 1000", name: "Ryzen 5 2400G" },
  { id: "amd-ryzen-5-2600", vendor: "AMD", family: "Ryzen 2000", name: "Ryzen 5 2600" },
  { id: "amd-ryzen-5-2600x", vendor: "AMD", family: "Ryzen 2000", name: "Ryzen 5 2600X" },
  { id: "amd-ryzen-5-3400g", vendor: "AMD", family: "Ryzen 3000", name: "Ryzen 5 3400G" },
  { id: "amd-ryzen-5-3600", vendor: "AMD", family: "Ryzen 3000", name: "Ryzen 5 3600" },
  { id: "amd-ryzen-5-3600x", vendor: "AMD", family: "Ryzen 3000", name: "Ryzen 5 3600X" },
  { id: "amd-ryzen-5-3600xt", vendor: "AMD", family: "Ryzen 3000", name: "Ryzen 5 3600XT" },
  {
    id: "amd-ryzen-5-4500u",
    vendor: "AMD",
    family: "Ryzen Mobile 4000",
    name: "Ryzen 5 4500U",
  },
  {
    id: "amd-ryzen-5-4600h",
    vendor: "AMD",
    family: "Ryzen Mobile 4000",
    name: "Ryzen 5 4600H",
  },
  {
    id: "amd-ryzen-5-4600u",
    vendor: "AMD",
    family: "Ryzen Mobile 4000",
    name: "Ryzen 5 4600U",
  },
  { id: "amd-ryzen-5-5500", vendor: "AMD", family: "Ryzen 5000", name: "Ryzen 5 5500" },
  { id: "amd-ryzen-5-5600", vendor: "AMD", family: "Ryzen 5000", name: "Ryzen 5 5600" },
  { id: "amd-ryzen-5-5600g", vendor: "AMD", family: "Ryzen 5000", name: "Ryzen 5 5600G" },
  {
    id: "amd-ryzen-5-5600h",
    vendor: "AMD",
    family: "Ryzen Mobile 5000",
    name: "Ryzen 5 5600H",
  },
  {
    id: "amd-ryzen-5-5600u",
    vendor: "AMD",
    family: "Ryzen Mobile 5000",
    name: "Ryzen 5 5600U",
  },
  { id: "amd-ryzen-5-5600x", vendor: "AMD", family: "Ryzen 5000", name: "Ryzen 5 5600X" },
  {
    id: "amd-ryzen-5-6600h",
    vendor: "AMD",
    family: "Ryzen Mobile 6000",
    name: "Ryzen 5 6600H",
  },
  {
    id: "amd-ryzen-5-6600u",
    vendor: "AMD",
    family: "Ryzen Mobile 6000",
    name: "Ryzen 5 6600U",
  },
  { id: "amd-ryzen-5-7600", vendor: "AMD", family: "Ryzen 7000", name: "Ryzen 5 7600" },
  { id: "amd-ryzen-5-7600x", vendor: "AMD", family: "Ryzen 7000", name: "Ryzen 5 7600X" },
  {
    id: "amd-ryzen-5-7640hs",
    vendor: "AMD",
    family: "Ryzen Mobile 7000",
    name: "Ryzen 5 7640HS",
  },
  {
    id: "amd-ryzen-5-7640u",
    vendor: "AMD",
    family: "Ryzen Mobile 7000",
    name: "Ryzen 5 7640U",
  },
  { id: "amd-ryzen-5-8500g", vendor: "AMD", family: "Ryzen 8000G", name: "Ryzen 5 8500G" },
  { id: "amd-ryzen-5-8600g", vendor: "AMD", family: "Ryzen 8000G", name: "Ryzen 5 8600G" },
  { id: "amd-ryzen-5-9600x", vendor: "AMD", family: "Ryzen 9000", name: "Ryzen 5 9600X" },
  { id: "amd-ryzen-7-1700", vendor: "AMD", family: "Ryzen 1000", name: "Ryzen 7 1700" },
  { id: "amd-ryzen-7-1700x", vendor: "AMD", family: "Ryzen 1000", name: "Ryzen 7 1700X" },
  { id: "amd-ryzen-7-1800x", vendor: "AMD", family: "Ryzen 1000", name: "Ryzen 7 1800X" },
  { id: "amd-ryzen-7-2700", vendor: "AMD", family: "Ryzen 2000", name: "Ryzen 7 2700" },
  { id: "amd-ryzen-7-2700e", vendor: "AMD", family: "Ryzen 2000", name: "Ryzen 7 2700E" },
  { id: "amd-ryzen-7-2700x", vendor: "AMD", family: "Ryzen 2000", name: "Ryzen 7 2700X" },
  { id: "amd-ryzen-7-3700x", vendor: "AMD", family: "Ryzen 3000", name: "Ryzen 7 3700X" },
  { id: "amd-ryzen-7-3800x", vendor: "AMD", family: "Ryzen 3000", name: "Ryzen 7 3800X" },
  { id: "amd-ryzen-7-3800xt", vendor: "AMD", family: "Ryzen 3000", name: "Ryzen 7 3800XT" },
  {
    id: "amd-ryzen-7-4800h",
    vendor: "AMD",
    family: "Ryzen Mobile 4000",
    name: "Ryzen 7 4800H",
  },
  {
    id: "amd-ryzen-7-4800u",
    vendor: "AMD",
    family: "Ryzen Mobile 4000",
    name: "Ryzen 7 4800U",
  },
  { id: "amd-ryzen-7-5700g", vendor: "AMD", family: "Ryzen 5000", name: "Ryzen 7 5700G" },
  { id: "amd-ryzen-7-5700x", vendor: "AMD", family: "Ryzen 5000", name: "Ryzen 7 5700X" },
  {
    id: "amd-ryzen-7-5700x3d",
    vendor: "AMD",
    family: "Ryzen 5000",
    name: "Ryzen 7 5700X3D",
  },
  {
    id: "amd-ryzen-7-5800h",
    vendor: "AMD",
    family: "Ryzen Mobile 5000",
    name: "Ryzen 7 5800H",
  },
  {
    id: "amd-ryzen-7-5800u",
    vendor: "AMD",
    family: "Ryzen Mobile 5000",
    name: "Ryzen 7 5800U",
  },
  { id: "amd-ryzen-7-5800x", vendor: "AMD", family: "Ryzen 5000", name: "Ryzen 7 5800X" },
  {
    id: "amd-ryzen-7-5800x3d",
    vendor: "AMD",
    family: "Ryzen 5000",
    name: "Ryzen 7 5800X3D",
  },
  {
    id: "amd-ryzen-7-6800h",
    vendor: "AMD",
    family: "Ryzen Mobile 6000",
    name: "Ryzen 7 6800H",
  },
  {
    id: "amd-ryzen-7-6800u",
    vendor: "AMD",
    family: "Ryzen Mobile 6000",
    name: "Ryzen 7 6800U",
  },
  { id: "amd-ryzen-7-7700", vendor: "AMD", family: "Ryzen 7000", name: "Ryzen 7 7700" },
  { id: "amd-ryzen-7-7700x", vendor: "AMD", family: "Ryzen 7000", name: "Ryzen 7 7700X" },
  {
    id: "amd-ryzen-7-7735hs",
    vendor: "AMD",
    family: "Ryzen Mobile 7000",
    name: "Ryzen 7 7735HS",
  },
  {
    id: "amd-ryzen-7-7735u",
    vendor: "AMD",
    family: "Ryzen Mobile 7000",
    name: "Ryzen 7 7735U",
  },
  {
    id: "amd-ryzen-7-7800x3d",
    vendor: "AMD",
    family: "Ryzen 7000",
    name: "Ryzen 7 7800X3D",
  },
  {
    id: "amd-ryzen-7-7840hs",
    vendor: "AMD",
    family: "Ryzen Mobile 7000",
    name: "Ryzen 7 7840HS",
  },
  {
    id: "amd-ryzen-7-7840u",
    vendor: "AMD",
    family: "Ryzen Mobile 7000",
    name: "Ryzen 7 7840U",
  },
  { id: "amd-ryzen-7-8700g", vendor: "AMD", family: "Ryzen 8000G", name: "Ryzen 7 8700G" },
  {
    id: "amd-ryzen-7-8840hs",
    vendor: "AMD",
    family: "Ryzen Mobile 8000",
    name: "Ryzen 7 8840HS",
  },
  {
    id: "amd-ryzen-7-8840u",
    vendor: "AMD",
    family: "Ryzen Mobile 8000",
    name: "Ryzen 7 8840U",
  },
  {
    id: "amd-ryzen-7-8845hs",
    vendor: "AMD",
    family: "Ryzen Mobile 8000",
    name: "Ryzen 7 8845HS",
  },
  { id: "amd-ryzen-7-9700x", vendor: "AMD", family: "Ryzen 9000", name: "Ryzen 7 9700X" },
  {
    id: "amd-ryzen-7-9800x3d",
    vendor: "AMD",
    family: "Ryzen 9000",
    name: "Ryzen 7 9800X3D",
  },
  { id: "amd-ryzen-9-3900x", vendor: "AMD", family: "Ryzen 3000", name: "Ryzen 9 3900X" },
  { id: "amd-ryzen-9-3900xt", vendor: "AMD", family: "Ryzen 3000", name: "Ryzen 9 3900XT" },
  { id: "amd-ryzen-9-3950x", vendor: "AMD", family: "Ryzen 3000", name: "Ryzen 9 3950X" },
  {
    id: "amd-ryzen-9-4900h",
    vendor: "AMD",
    family: "Ryzen Mobile 4000",
    name: "Ryzen 9 4900H",
  },
  {
    id: "amd-ryzen-9-5900hx",
    vendor: "AMD",
    family: "Ryzen Mobile 5000",
    name: "Ryzen 9 5900HX",
  },
  { id: "amd-ryzen-9-5900x", vendor: "AMD", family: "Ryzen 5000", name: "Ryzen 9 5900X" },
  { id: "amd-ryzen-9-5950x", vendor: "AMD", family: "Ryzen 5000", name: "Ryzen 9 5950X" },
  {
    id: "amd-ryzen-9-5980hs",
    vendor: "AMD",
    family: "Ryzen Mobile 5000",
    name: "Ryzen 9 5980HS",
  },
  {
    id: "amd-ryzen-9-5980hx",
    vendor: "AMD",
    family: "Ryzen Mobile 5000",
    name: "Ryzen 9 5980HX",
  },
  {
    id: "amd-ryzen-9-6900hs",
    vendor: "AMD",
    family: "Ryzen Mobile 6000",
    name: "Ryzen 9 6900HS",
  },
  {
    id: "amd-ryzen-9-6900hx",
    vendor: "AMD",
    family: "Ryzen Mobile 6000",
    name: "Ryzen 9 6900HX",
  },
  { id: "amd-ryzen-9-7900", vendor: "AMD", family: "Ryzen 7000", name: "Ryzen 9 7900" },
  { id: "amd-ryzen-9-7900x", vendor: "AMD", family: "Ryzen 7000", name: "Ryzen 9 7900X" },
  {
    id: "amd-ryzen-9-7900x3d",
    vendor: "AMD",
    family: "Ryzen 7000",
    name: "Ryzen 9 7900X3D",
  },
  {
    id: "amd-ryzen-9-7940hs",
    vendor: "AMD",
    family: "Ryzen Mobile 7000",
    name: "Ryzen 9 7940HS",
  },
  {
    id: "amd-ryzen-9-7945hx",
    vendor: "AMD",
    family: "Ryzen Mobile 7000",
    name: "Ryzen 9 7945HX",
  },
  { id: "amd-ryzen-9-7950x", vendor: "AMD", family: "Ryzen 7000", name: "Ryzen 9 7950X" },
  {
    id: "amd-ryzen-9-7950x3d",
    vendor: "AMD",
    family: "Ryzen 7000",
    name: "Ryzen 9 7950X3D",
  },
  {
    id: "amd-ryzen-9-8945hs",
    vendor: "AMD",
    family: "Ryzen Mobile 8000",
    name: "Ryzen 9 8945HS",
  },
  { id: "amd-ryzen-9-9900x", vendor: "AMD", family: "Ryzen 9000", name: "Ryzen 9 9900X" },
  {
    id: "amd-ryzen-9-9900x3d",
    vendor: "AMD",
    family: "Ryzen 9000",
    name: "Ryzen 9 9900X3D",
  },
  { id: "amd-ryzen-9-9950x", vendor: "AMD", family: "Ryzen 9000", name: "Ryzen 9 9950X" },
  {
    id: "amd-ryzen-9-9950x3d",
    vendor: "AMD",
    family: "Ryzen 9000",
    name: "Ryzen 9 9950X3D",
  },
  {
    id: "amd-ryzen-ai-5-340",
    vendor: "AMD",
    family: "Ryzen AI 300",
    name: "Ryzen AI 5 340",
  },
  {
    id: "amd-ryzen-ai-7-350",
    vendor: "AMD",
    family: "Ryzen AI 300",
    name: "Ryzen AI 7 350",
  },
  {
    id: "amd-ryzen-ai-9-365",
    vendor: "AMD",
    family: "Ryzen AI 300",
    name: "Ryzen AI 9 365",
  },
  {
    id: "amd-ryzen-ai-9-hx-370",
    vendor: "AMD",
    family: "Ryzen AI 300",
    name: "Ryzen AI 9 HX 370",
  },
  {
    id: "amd-ryzen-ai-9-hx-375",
    vendor: "AMD",
    family: "Ryzen AI 300",
    name: "Ryzen AI 9 HX 375",
  },
  {
    id: "amd-ryzen-ai-max-385",
    vendor: "AMD",
    family: "Ryzen AI Max",
    name: "Ryzen AI Max 385",
  },
  {
    id: "amd-ryzen-ai-max-390",
    vendor: "AMD",
    family: "Ryzen AI Max",
    name: "Ryzen AI Max 390",
  },
  {
    id: "amd-ryzen-ai-max-plus-395",
    vendor: "AMD",
    family: "Ryzen AI Max",
    name: "Ryzen AI Max+ 395",
  },
  {
    id: "amd-threadripper-1900x",
    vendor: "AMD",
    family: "Threadripper 1000/2000",
    name: "Threadripper 1900X",
  },
  {
    id: "amd-threadripper-1920x",
    vendor: "AMD",
    family: "Threadripper 1000/2000",
    name: "Threadripper 1920X",
  },
  {
    id: "amd-threadripper-1950x",
    vendor: "AMD",
    family: "Threadripper 1000/2000",
    name: "Threadripper 1950X",
  },
  {
    id: "amd-threadripper-2920x",
    vendor: "AMD",
    family: "Threadripper 1000/2000",
    name: "Threadripper 2920X",
  },
  {
    id: "amd-threadripper-2950x",
    vendor: "AMD",
    family: "Threadripper 1000/2000",
    name: "Threadripper 2950X",
  },
  {
    id: "amd-threadripper-2970wx",
    vendor: "AMD",
    family: "Threadripper 1000/2000",
    name: "Threadripper 2970WX",
  },
  {
    id: "amd-threadripper-2990wx",
    vendor: "AMD",
    family: "Threadripper 1000/2000",
    name: "Threadripper 2990WX",
  },
  {
    id: "amd-threadripper-3960x",
    vendor: "AMD",
    family: "Threadripper 3000",
    name: "Threadripper 3960X",
  },
  {
    id: "amd-threadripper-3970x",
    vendor: "AMD",
    family: "Threadripper 3000",
    name: "Threadripper 3970X",
  },
  {
    id: "amd-threadripper-3990x",
    vendor: "AMD",
    family: "Threadripper 3000",
    name: "Threadripper 3990X",
  },
  {
    id: "amd-threadripper-7960x",
    vendor: "AMD",
    family: "Threadripper 7000",
    name: "Threadripper 7960X",
  },
  {
    id: "amd-threadripper-7970x",
    vendor: "AMD",
    family: "Threadripper 7000",
    name: "Threadripper 7970X",
  },
  {
    id: "amd-threadripper-7980x",
    vendor: "AMD",
    family: "Threadripper 7000",
    name: "Threadripper 7980X",
  },
  {
    id: "amd-threadripper-9960x",
    vendor: "AMD",
    family: "Threadripper 9000",
    name: "Threadripper 9960X",
  },
  {
    id: "amd-threadripper-9970x",
    vendor: "AMD",
    family: "Threadripper 9000",
    name: "Threadripper 9970X",
  },
  {
    id: "amd-threadripper-9980x",
    vendor: "AMD",
    family: "Threadripper 9000",
    name: "Threadripper 9980X",
  },
  {
    id: "amd-threadripper-pro-5945wx",
    vendor: "AMD",
    family: "Threadripper PRO 5000",
    name: "Threadripper PRO 5945WX",
  },
  {
    id: "amd-threadripper-pro-5955wx",
    vendor: "AMD",
    family: "Threadripper PRO 5000",
    name: "Threadripper PRO 5955WX",
  },
  {
    id: "amd-threadripper-pro-5965wx",
    vendor: "AMD",
    family: "Threadripper PRO 5000",
    name: "Threadripper PRO 5965WX",
  },
  {
    id: "amd-threadripper-pro-5975wx",
    vendor: "AMD",
    family: "Threadripper PRO 5000",
    name: "Threadripper PRO 5975WX",
  },
  {
    id: "amd-threadripper-pro-5995wx",
    vendor: "AMD",
    family: "Threadripper PRO 5000",
    name: "Threadripper PRO 5995WX",
  },
  {
    id: "amd-threadripper-pro-7965wx",
    vendor: "AMD",
    family: "Threadripper PRO 7000",
    name: "Threadripper PRO 7965WX",
  },
  {
    id: "amd-threadripper-pro-7975wx",
    vendor: "AMD",
    family: "Threadripper PRO 7000",
    name: "Threadripper PRO 7975WX",
  },
  {
    id: "amd-threadripper-pro-7985wx",
    vendor: "AMD",
    family: "Threadripper PRO 7000",
    name: "Threadripper PRO 7985WX",
  },
  {
    id: "amd-threadripper-pro-7995wx",
    vendor: "AMD",
    family: "Threadripper PRO 7000",
    name: "Threadripper PRO 7995WX",
  },
  { id: "apple-m1", vendor: "Apple", family: "M1", name: "M1" },
  { id: "apple-m1-max", vendor: "Apple", family: "M1", name: "M1 Max" },
  { id: "apple-m1-pro", vendor: "Apple", family: "M1", name: "M1 Pro" },
  { id: "apple-m1-ultra", vendor: "Apple", family: "M1", name: "M1 Ultra" },
  { id: "apple-m2", vendor: "Apple", family: "M2", name: "M2" },
  { id: "apple-m2-max", vendor: "Apple", family: "M2", name: "M2 Max" },
  { id: "apple-m2-pro", vendor: "Apple", family: "M2", name: "M2 Pro" },
  { id: "apple-m2-ultra", vendor: "Apple", family: "M2", name: "M2 Ultra" },
  { id: "apple-m3", vendor: "Apple", family: "M3", name: "M3" },
  { id: "apple-m3-max", vendor: "Apple", family: "M3", name: "M3 Max" },
  { id: "apple-m3-pro", vendor: "Apple", family: "M3", name: "M3 Pro" },
  { id: "apple-m3-ultra", vendor: "Apple", family: "M3", name: "M3 Ultra" },
  { id: "apple-m4", vendor: "Apple", family: "M4", name: "M4" },
  { id: "apple-m4-max", vendor: "Apple", family: "M4", name: "M4 Max" },
  { id: "apple-m4-pro", vendor: "Apple", family: "M4", name: "M4 Pro" },
  {
    id: "intel-core-i3-10100",
    vendor: "Intel",
    family: "Core 10th gen",
    name: "Core i3-10100",
  },
  {
    id: "intel-core-i3-12100",
    vendor: "Intel",
    family: "Core 12th gen",
    name: "Core i3-12100",
  },
  {
    id: "intel-core-i3-13100",
    vendor: "Intel",
    family: "Core 13th gen",
    name: "Core i3-13100",
  },
  {
    id: "intel-core-i3-8100",
    vendor: "Intel",
    family: "Core 8th gen",
    name: "Core i3-8100",
  },
  {
    id: "intel-core-i3-8350k",
    vendor: "Intel",
    family: "Core 8th gen",
    name: "Core i3-8350K",
  },
  {
    id: "intel-core-i3-9100f",
    vendor: "Intel",
    family: "Core 9th gen",
    name: "Core i3-9100F",
  },
  {
    id: "intel-core-i5-10400",
    vendor: "Intel",
    family: "Core 10th gen",
    name: "Core i5-10400",
  },
  {
    id: "intel-core-i5-10600k",
    vendor: "Intel",
    family: "Core 10th gen",
    name: "Core i5-10600K",
  },
  {
    id: "intel-core-i5-1135g7",
    vendor: "Intel",
    family: "Core Mobile 11th/12th",
    name: "Core i5-1135G7",
  },
  {
    id: "intel-core-i5-11400",
    vendor: "Intel",
    family: "Core 11th gen",
    name: "Core i5-11400",
  },
  {
    id: "intel-core-i5-11600k",
    vendor: "Intel",
    family: "Core 11th gen",
    name: "Core i5-11600K",
  },
  {
    id: "intel-core-i5-12400",
    vendor: "Intel",
    family: "Core 12th gen",
    name: "Core i5-12400",
  },
  {
    id: "intel-core-i5-1240p",
    vendor: "Intel",
    family: "Core Mobile 11th/12th",
    name: "Core i5-1240P",
  },
  {
    id: "intel-core-i5-12600k",
    vendor: "Intel",
    family: "Core 12th gen",
    name: "Core i5-12600K",
  },
  {
    id: "intel-core-i5-13400",
    vendor: "Intel",
    family: "Core 13th gen",
    name: "Core i5-13400",
  },
  {
    id: "intel-core-i5-1340p",
    vendor: "Intel",
    family: "Core Mobile 13th",
    name: "Core i5-1340P",
  },
  {
    id: "intel-core-i5-13500",
    vendor: "Intel",
    family: "Core 13th gen",
    name: "Core i5-13500",
  },
  {
    id: "intel-core-i5-13600k",
    vendor: "Intel",
    family: "Core 13th gen",
    name: "Core i5-13600K",
  },
  {
    id: "intel-core-i5-14400",
    vendor: "Intel",
    family: "Core 14th gen",
    name: "Core i5-14400",
  },
  {
    id: "intel-core-i5-14500",
    vendor: "Intel",
    family: "Core 14th gen",
    name: "Core i5-14500",
  },
  {
    id: "intel-core-i5-14600k",
    vendor: "Intel",
    family: "Core 14th gen",
    name: "Core i5-14600K",
  },
  {
    id: "intel-core-i5-8400",
    vendor: "Intel",
    family: "Core 8th gen",
    name: "Core i5-8400",
  },
  {
    id: "intel-core-i5-8500",
    vendor: "Intel",
    family: "Core 8th gen",
    name: "Core i5-8500",
  },
  {
    id: "intel-core-i5-8600k",
    vendor: "Intel",
    family: "Core 8th gen",
    name: "Core i5-8600K",
  },
  {
    id: "intel-core-i5-9400f",
    vendor: "Intel",
    family: "Core 9th gen",
    name: "Core i5-9400F",
  },
  {
    id: "intel-core-i5-9600k",
    vendor: "Intel",
    family: "Core 9th gen",
    name: "Core i5-9600K",
  },
  {
    id: "intel-core-i7-10700k",
    vendor: "Intel",
    family: "Core 10th gen",
    name: "Core i7-10700K",
  },
  {
    id: "intel-core-i7-1165g7",
    vendor: "Intel",
    family: "Core Mobile 11th/12th",
    name: "Core i7-1165G7",
  },
  {
    id: "intel-core-i7-11700k",
    vendor: "Intel",
    family: "Core 11th gen",
    name: "Core i7-11700K",
  },
  {
    id: "intel-core-i7-1185g7",
    vendor: "Intel",
    family: "Core Mobile 11th/12th",
    name: "Core i7-1185G7",
  },
  {
    id: "intel-core-i7-1260p",
    vendor: "Intel",
    family: "Core Mobile 11th/12th",
    name: "Core i7-1260P",
  },
  {
    id: "intel-core-i7-12700",
    vendor: "Intel",
    family: "Core 12th gen",
    name: "Core i7-12700",
  },
  {
    id: "intel-core-i7-12700k",
    vendor: "Intel",
    family: "Core 12th gen",
    name: "Core i7-12700K",
  },
  {
    id: "intel-core-i7-1280p",
    vendor: "Intel",
    family: "Core Mobile 11th/12th",
    name: "Core i7-1280P",
  },
  {
    id: "intel-core-i7-1360p",
    vendor: "Intel",
    family: "Core Mobile 13th",
    name: "Core i7-1360P",
  },
  {
    id: "intel-core-i7-13700",
    vendor: "Intel",
    family: "Core 13th gen",
    name: "Core i7-13700",
  },
  {
    id: "intel-core-i7-13700k",
    vendor: "Intel",
    family: "Core 13th gen",
    name: "Core i7-13700K",
  },
  {
    id: "intel-core-i7-1370p",
    vendor: "Intel",
    family: "Core Mobile 13th",
    name: "Core i7-1370P",
  },
  {
    id: "intel-core-i7-14650hx",
    vendor: "Intel",
    family: "Core Mobile 14th",
    name: "Core i7-14650HX",
  },
  {
    id: "intel-core-i7-14700k",
    vendor: "Intel",
    family: "Core 14th gen",
    name: "Core i7-14700K",
  },
  {
    id: "intel-core-i7-8086k",
    vendor: "Intel",
    family: "Core 8th gen",
    name: "Core i7-8086K",
  },
  {
    id: "intel-core-i7-8700",
    vendor: "Intel",
    family: "Core 8th gen",
    name: "Core i7-8700",
  },
  {
    id: "intel-core-i7-8700k",
    vendor: "Intel",
    family: "Core 8th gen",
    name: "Core i7-8700K",
  },
  {
    id: "intel-core-i7-9700k",
    vendor: "Intel",
    family: "Core 9th gen",
    name: "Core i7-9700K",
  },
  {
    id: "intel-core-i9-10850k",
    vendor: "Intel",
    family: "Core 10th gen",
    name: "Core i9-10850K",
  },
  {
    id: "intel-core-i9-10900k",
    vendor: "Intel",
    family: "Core 10th gen",
    name: "Core i9-10900K",
  },
  {
    id: "intel-core-i9-11900k",
    vendor: "Intel",
    family: "Core 11th gen",
    name: "Core i9-11900K",
  },
  {
    id: "intel-core-i9-12900k",
    vendor: "Intel",
    family: "Core 12th gen",
    name: "Core i9-12900K",
  },
  {
    id: "intel-core-i9-12900ks",
    vendor: "Intel",
    family: "Core 12th gen",
    name: "Core i9-12900KS",
  },
  {
    id: "intel-core-i9-13900h",
    vendor: "Intel",
    family: "Core Mobile 13th",
    name: "Core i9-13900H",
  },
  {
    id: "intel-core-i9-13900k",
    vendor: "Intel",
    family: "Core 13th gen",
    name: "Core i9-13900K",
  },
  {
    id: "intel-core-i9-13900ks",
    vendor: "Intel",
    family: "Core 13th gen",
    name: "Core i9-13900KS",
  },
  {
    id: "intel-core-i9-13980hx",
    vendor: "Intel",
    family: "Core Mobile 13th",
    name: "Core i9-13980HX",
  },
  {
    id: "intel-core-i9-14900hx",
    vendor: "Intel",
    family: "Core Mobile 14th",
    name: "Core i9-14900HX",
  },
  {
    id: "intel-core-i9-14900k",
    vendor: "Intel",
    family: "Core 14th gen",
    name: "Core i9-14900K",
  },
  {
    id: "intel-core-i9-14900ks",
    vendor: "Intel",
    family: "Core 14th gen",
    name: "Core i9-14900KS",
  },
  {
    id: "intel-core-i9-9900k",
    vendor: "Intel",
    family: "Core 9th gen",
    name: "Core i9-9900K",
  },
  {
    id: "intel-core-i9-9900ks",
    vendor: "Intel",
    family: "Core 9th gen",
    name: "Core i9-9900KS",
  },
  {
    id: "intel-core-ultra-5-125h",
    vendor: "Intel",
    family: "Core Ultra 100H",
    name: "Core Ultra 5 125H",
  },
  {
    id: "intel-core-ultra-5-125u",
    vendor: "Intel",
    family: "Core Ultra 100U",
    name: "Core Ultra 5 125U",
  },
  {
    id: "intel-core-ultra-5-135h",
    vendor: "Intel",
    family: "Core Ultra 100H",
    name: "Core Ultra 5 135H",
  },
  {
    id: "intel-core-ultra-5-225",
    vendor: "Intel",
    family: "Core Ultra 200S",
    name: "Core Ultra 5 225",
  },
  {
    id: "intel-core-ultra-5-225h",
    vendor: "Intel",
    family: "Core Ultra 200H",
    name: "Core Ultra 5 225H",
  },
  {
    id: "intel-core-ultra-5-226v",
    vendor: "Intel",
    family: "Core Ultra 200V",
    name: "Core Ultra 5 226V",
  },
  {
    id: "intel-core-ultra-5-228v",
    vendor: "Intel",
    family: "Core Ultra 200V",
    name: "Core Ultra 5 228V",
  },
  {
    id: "intel-core-ultra-5-235h",
    vendor: "Intel",
    family: "Core Ultra 200H",
    name: "Core Ultra 5 235H",
  },
  {
    id: "intel-core-ultra-5-236v",
    vendor: "Intel",
    family: "Core Ultra 200V",
    name: "Core Ultra 5 236V",
  },
  {
    id: "intel-core-ultra-5-245k",
    vendor: "Intel",
    family: "Core Ultra 200S",
    name: "Core Ultra 5 245K",
  },
  {
    id: "intel-core-ultra-7-155h",
    vendor: "Intel",
    family: "Core Ultra 100H",
    name: "Core Ultra 7 155H",
  },
  {
    id: "intel-core-ultra-7-155u",
    vendor: "Intel",
    family: "Core Ultra 100U",
    name: "Core Ultra 7 155U",
  },
  {
    id: "intel-core-ultra-7-165h",
    vendor: "Intel",
    family: "Core Ultra 100H",
    name: "Core Ultra 7 165H",
  },
  {
    id: "intel-core-ultra-7-165u",
    vendor: "Intel",
    family: "Core Ultra 100U",
    name: "Core Ultra 7 165U",
  },
  {
    id: "intel-core-ultra-7-255h",
    vendor: "Intel",
    family: "Core Ultra 200H",
    name: "Core Ultra 7 255H",
  },
  {
    id: "intel-core-ultra-7-256v",
    vendor: "Intel",
    family: "Core Ultra 200V",
    name: "Core Ultra 7 256V",
  },
  {
    id: "intel-core-ultra-7-258v",
    vendor: "Intel",
    family: "Core Ultra 200V",
    name: "Core Ultra 7 258V",
  },
  {
    id: "intel-core-ultra-7-265k",
    vendor: "Intel",
    family: "Core Ultra 200S",
    name: "Core Ultra 7 265K",
  },
  {
    id: "intel-core-ultra-7-268v",
    vendor: "Intel",
    family: "Core Ultra 200V",
    name: "Core Ultra 7 268V",
  },
  {
    id: "intel-core-ultra-9-185h",
    vendor: "Intel",
    family: "Core Ultra 100H",
    name: "Core Ultra 9 185H",
  },
  {
    id: "intel-core-ultra-9-285h",
    vendor: "Intel",
    family: "Core Ultra 200H",
    name: "Core Ultra 9 285H",
  },
  {
    id: "intel-core-ultra-9-285k",
    vendor: "Intel",
    family: "Core Ultra 200S",
    name: "Core Ultra 9 285K",
  },
  {
    id: "intel-core-ultra-9-288v",
    vendor: "Intel",
    family: "Core Ultra 200V",
    name: "Core Ultra 9 288V",
  },
  {
    id: "intel-xeon-w3-2423",
    vendor: "Intel",
    family: "Xeon W-2400",
    name: "Xeon w3-2423",
  },
  {
    id: "intel-xeon-w5-2445",
    vendor: "Intel",
    family: "Xeon W-2400",
    name: "Xeon w5-2445",
  },
  {
    id: "intel-xeon-w5-2465x",
    vendor: "Intel",
    family: "Xeon W-2400",
    name: "Xeon w5-2465X",
  },
  {
    id: "intel-xeon-w5-3425",
    vendor: "Intel",
    family: "Xeon W-3400",
    name: "Xeon w5-3425",
  },
  {
    id: "intel-xeon-w7-2495x",
    vendor: "Intel",
    family: "Xeon W-2400",
    name: "Xeon w7-2495X",
  },
  {
    id: "intel-xeon-w7-3455",
    vendor: "Intel",
    family: "Xeon W-3400",
    name: "Xeon w7-3455",
  },
  {
    id: "intel-xeon-w9-3475x",
    vendor: "Intel",
    family: "Xeon W-3400",
    name: "Xeon w9-3475X",
  },
  {
    id: "intel-xeon-w9-3495x",
    vendor: "Intel",
    family: "Xeon W-3400",
    name: "Xeon w9-3495X",
  },
]

export const CPU_IDS: readonly string[] = CPUS.map((cpu) => cpu.id)

/**
 * Chosen when a chip is not in the catalogue.
 *
 * The list can never be complete, and the CPU field is required — without an
 * escape hatch, anyone with an unlisted chip could not rank at all. Stats
 * exclude this bucket rather than pretending it is a model.
 */
export const OTHER_CPU_ID = "other"

const BY_ID = new Map(CPUS.map((cpu) => [cpu.id, cpu]))

export function cpuById(id: string): Cpu | null {
  return BY_ID.get(id) ?? null
}

/** How a chip reads in the UI. */
export function cpuLabel(cpu: Cpu): string {
  return `${cpu.vendor} ${cpu.name}`
}

export type CpuGroup = {
  vendor: CpuVendor
  cpus: Cpu[]
}

/** Grouped for a picker, vendors alphabetical so the order never shifts. */
export function cpusByVendor(cpus: readonly Cpu[] = CPUS): CpuGroup[] {
  const groups = new Map<CpuVendor, Cpu[]>()
  for (const cpu of cpus) {
    const bucket = groups.get(cpu.vendor)
    if (bucket) bucket.push(cpu)
    else groups.set(cpu.vendor, [cpu])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([vendor, cpus]) => ({ vendor, cpus }))
}

/**
 * What the picker shows before anyone types.
 *
 * The current desktop generation from each vendor. Slicing the catalogue
 * instead returns whatever sorts first by id — which is all AMD, and the
 * eight-year-old parts at that, reading as though the other vendors are
 * missing. Update these as generations ship; it is one line.
 */
const OPENING_FAMILIES: readonly string[] = ["Ryzen 9000", "M4", "Core Ultra 200S"]

/**
 * Substring match over vendor, family and model.
 *
 * Lives here rather than in the component so the server can run it: the
 * catalogue is only needed by people who open the specs picker, and shipping
 * all of it to every visitor would be waste.
 */
export function searchCpus(query: string, limit = 40): Cpu[] {
  const needle = query.trim().toLowerCase()
  if (!needle) {
    return CPUS.filter((cpu) => OPENING_FAMILIES.includes(cpu.family)).slice(0, limit)
  }

  const terms = needle.split(/\s+/)
  return CPUS.filter((cpu) => {
    const haystack = `${cpu.vendor} ${cpu.family} ${cpu.name}`.toLowerCase()
    return terms.every((term) => haystack.includes(term))
  }).slice(0, limit)
}
