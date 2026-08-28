/**
 * The CPU catalogue.
 *
 * A fixed list rather than free text, because the point of collecting this is
 * to aggregate it — "average install on a Ryzen 9" is unanswerable if everyone
 * types the model differently.
 *
 * Missing a chip? Add one line, keep the file sorted by id, and open a pull
 * request. `tests/cpus.test.ts` enforces the rules, so CI will tell you if the
 * entry is malformed before a human reads it.
 *
 * Core counts are deliberately absent rather than guessed; add them per entry
 * if stats ever need them.
 */

export type CpuVendor = "AMD" | "Apple" | "Intel"

export type Cpu = {
  /** Stable slug: `<vendor>-<model>`, lowercase kebab-case. Never renamed. */
  id: string
  vendor: CpuVendor
  /** What stats group by, e.g. "Ryzen 9", "Core Ultra", "M4". */
  family: string
  /** As the vendor writes it, minus the vendor name itself. */
  name: string
}

export const CPUS: readonly Cpu[] = [
  { id: "amd-ryzen-5-5600", vendor: "AMD", family: "Ryzen 5", name: "Ryzen 5 5600" },
  { id: "amd-ryzen-5-5600x", vendor: "AMD", family: "Ryzen 5", name: "Ryzen 5 5600X" },
  { id: "amd-ryzen-5-7600", vendor: "AMD", family: "Ryzen 5", name: "Ryzen 5 7600" },
  { id: "amd-ryzen-5-7600x", vendor: "AMD", family: "Ryzen 5", name: "Ryzen 5 7600X" },
  { id: "amd-ryzen-5-9600x", vendor: "AMD", family: "Ryzen 5", name: "Ryzen 5 9600X" },
  { id: "amd-ryzen-7-5700x", vendor: "AMD", family: "Ryzen 7", name: "Ryzen 7 5700X" },
  { id: "amd-ryzen-7-5800x", vendor: "AMD", family: "Ryzen 7", name: "Ryzen 7 5800X" },
  { id: "amd-ryzen-7-5800x3d", vendor: "AMD", family: "Ryzen 7", name: "Ryzen 7 5800X3D" },
  { id: "amd-ryzen-7-7700", vendor: "AMD", family: "Ryzen 7", name: "Ryzen 7 7700" },
  { id: "amd-ryzen-7-7700x", vendor: "AMD", family: "Ryzen 7", name: "Ryzen 7 7700X" },
  { id: "amd-ryzen-7-7800x3d", vendor: "AMD", family: "Ryzen 7", name: "Ryzen 7 7800X3D" },
  { id: "amd-ryzen-7-7840u", vendor: "AMD", family: "Ryzen Mobile", name: "Ryzen 7 7840U" },
  { id: "amd-ryzen-7-8840u", vendor: "AMD", family: "Ryzen Mobile", name: "Ryzen 7 8840U" },
  { id: "amd-ryzen-7-9700x", vendor: "AMD", family: "Ryzen 7", name: "Ryzen 7 9700X" },
  { id: "amd-ryzen-7-9800x3d", vendor: "AMD", family: "Ryzen 7", name: "Ryzen 7 9800X3D" },
  { id: "amd-ryzen-9-5900x", vendor: "AMD", family: "Ryzen 9", name: "Ryzen 9 5900X" },
  { id: "amd-ryzen-9-5950x", vendor: "AMD", family: "Ryzen 9", name: "Ryzen 9 5950X" },
  { id: "amd-ryzen-9-7900", vendor: "AMD", family: "Ryzen 9", name: "Ryzen 9 7900" },
  { id: "amd-ryzen-9-7900x", vendor: "AMD", family: "Ryzen 9", name: "Ryzen 9 7900X" },
  {
    id: "amd-ryzen-9-7940hs",
    vendor: "AMD",
    family: "Ryzen Mobile",
    name: "Ryzen 9 7940HS",
  },
  { id: "amd-ryzen-9-7950x", vendor: "AMD", family: "Ryzen 9", name: "Ryzen 9 7950X" },
  { id: "amd-ryzen-9-7950x3d", vendor: "AMD", family: "Ryzen 9", name: "Ryzen 9 7950X3D" },
  { id: "amd-ryzen-9-9900x", vendor: "AMD", family: "Ryzen 9", name: "Ryzen 9 9900X" },
  { id: "amd-ryzen-9-9950x", vendor: "AMD", family: "Ryzen 9", name: "Ryzen 9 9950X" },
  { id: "amd-ryzen-9-9950x3d", vendor: "AMD", family: "Ryzen 9", name: "Ryzen 9 9950X3D" },
  {
    id: "amd-ryzen-ai-9-hx-370",
    vendor: "AMD",
    family: "Ryzen AI",
    name: "Ryzen AI 9 HX 370",
  },
  {
    id: "amd-ryzen-ai-max-plus-395",
    vendor: "AMD",
    family: "Ryzen AI",
    name: "Ryzen AI Max+ 395",
  },
  {
    id: "amd-threadripper-3970x",
    vendor: "AMD",
    family: "Threadripper",
    name: "Threadripper 3970X",
  },
  {
    id: "amd-threadripper-7970x",
    vendor: "AMD",
    family: "Threadripper",
    name: "Threadripper 7970X",
  },
  {
    id: "amd-threadripper-7980x",
    vendor: "AMD",
    family: "Threadripper",
    name: "Threadripper 7980X",
  },
  {
    id: "amd-threadripper-pro-5975wx",
    vendor: "AMD",
    family: "Threadripper",
    name: "Threadripper PRO 5975WX",
  },
  {
    id: "amd-threadripper-pro-7995wx",
    vendor: "AMD",
    family: "Threadripper",
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
  { id: "apple-m4", vendor: "Apple", family: "M4", name: "M4" },
  { id: "apple-m4-max", vendor: "Apple", family: "M4", name: "M4 Max" },
  { id: "apple-m4-pro", vendor: "Apple", family: "M4", name: "M4 Pro" },
  {
    id: "intel-core-i5-12600k",
    vendor: "Intel",
    family: "Core i5",
    name: "Core i5-12600K",
  },
  {
    id: "intel-core-i5-13600k",
    vendor: "Intel",
    family: "Core i5",
    name: "Core i5-13600K",
  },
  {
    id: "intel-core-i5-14600k",
    vendor: "Intel",
    family: "Core i5",
    name: "Core i5-14600K",
  },
  {
    id: "intel-core-i7-1260p",
    vendor: "Intel",
    family: "Core Mobile",
    name: "Core i7-1260P",
  },
  {
    id: "intel-core-i7-12700k",
    vendor: "Intel",
    family: "Core i7",
    name: "Core i7-12700K",
  },
  {
    id: "intel-core-i7-1360p",
    vendor: "Intel",
    family: "Core Mobile",
    name: "Core i7-1360P",
  },
  {
    id: "intel-core-i7-13700k",
    vendor: "Intel",
    family: "Core i7",
    name: "Core i7-13700K",
  },
  {
    id: "intel-core-i7-14700k",
    vendor: "Intel",
    family: "Core i7",
    name: "Core i7-14700K",
  },
  {
    id: "intel-core-i9-12900k",
    vendor: "Intel",
    family: "Core i9",
    name: "Core i9-12900K",
  },
  {
    id: "intel-core-i9-13900k",
    vendor: "Intel",
    family: "Core i9",
    name: "Core i9-13900K",
  },
  {
    id: "intel-core-i9-14900k",
    vendor: "Intel",
    family: "Core i9",
    name: "Core i9-14900K",
  },
  {
    id: "intel-core-ultra-5-245k",
    vendor: "Intel",
    family: "Core Ultra",
    name: "Core Ultra 5 245K",
  },
  {
    id: "intel-core-ultra-7-155h",
    vendor: "Intel",
    family: "Core Ultra Mobile",
    name: "Core Ultra 7 155H",
  },
  {
    id: "intel-core-ultra-7-165h",
    vendor: "Intel",
    family: "Core Ultra Mobile",
    name: "Core Ultra 7 165H",
  },
  {
    id: "intel-core-ultra-7-265k",
    vendor: "Intel",
    family: "Core Ultra",
    name: "Core Ultra 7 265K",
  },
  {
    id: "intel-core-ultra-9-185h",
    vendor: "Intel",
    family: "Core Ultra Mobile",
    name: "Core Ultra 9 185H",
  },
  {
    id: "intel-core-ultra-9-285k",
    vendor: "Intel",
    family: "Core Ultra",
    name: "Core Ultra 9 285K",
  },
]

export const CPU_IDS: readonly string[] = CPUS.map((cpu) => cpu.id)

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
export function cpusByVendor(): CpuGroup[] {
  const groups = new Map<CpuVendor, Cpu[]>()
  for (const cpu of CPUS) {
    const bucket = groups.get(cpu.vendor)
    if (bucket) bucket.push(cpu)
    else groups.set(cpu.vendor, [cpu])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([vendor, cpus]) => ({ vendor, cpus }))
}
