import { useState, useMemo } from "react";
import { listHouses, type HouseFilters } from "@/data/localHousing";
import { Map as MapIcon, Info, Search, Check, X, Building2, Filter } from "lucide-react";

import { LeafletMapEngine } from "@/components/map/LeafletMapEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

// ─── Color helpers ────────────────────────────────────────────────────────────

function klasterColor(v: string) {
  if (v === "K1") return "#22C55E";
  if (v === "K2") return "#F59E0B";
  if (v === "K3") return "#EF4444";
  return "#9CA3AF";
}

function dindingColor(v: string | null | undefined) {
  if (!v) return "#9CA3AF";
  const lv = v.toLowerCase();
  if (lv.includes("tembok")) return "#64748B";
  if (lv.includes("kayu")) return "#D97706";
  if (lv.includes("bambu")) return "#84CC16";
  if (lv.includes("seng")) return "#6B7280";
  return "#9CA3AF";
}

function lantaiColor(v: string | null | undefined) {
  if (!v) return "#9CA3AF";
  const lv = v.toLowerCase();
  if (lv === "keramik") return "#3B82F6";
  if (lv.includes("marmer") || lv.includes("granit")) return "#8B5CF6";
  if (lv === "semen") return "#F59E0B";
  return "#78716C";
}

// ─── Config ───────────────────────────────────────────────────────────────────

type Tampilan = "klaster" | "smartmap" | "tagging";

/** 4 jenis perubahan yang relevan untuk SMART MAP */
const SMART_JENIS: { key: string; label: string; color: string }[] = [
  { key: "perubahanPagar",        label: "Perubahan Pagar",        color: "#EF4444" },
  { key: "perubahanLuasBangunan", label: "Perubahan Luas Bangunan", color: "#F59E0B" },
  { key: "perubahanLuasLahan",    label: "Perubahan Luas Lahan",    color: "#8B5CF6" },
  { key: "perubahanJumlahLantai", label: "Perubahan Jumlah Lantai", color: "#06B6D4" },
];

const TAGGING_MODES: Record<string, {
  label: string;
  colorFn: (h: any) => string;
  legend: { label: string; color: string }[];
}> = {
  luasBangunan: {
    label: "Luas Bangunan",
    colorFn: (h) => {
      const v = h.luasBangunan;
      if (!v) return "#9CA3AF";
      if (v > 100) return "#EF4444";
      if (v >= 50) return "#F59E0B";
      return "#22C55E";
    },
    legend: [
      { label: "> 100 m²", color: "#EF4444" },
      { label: "50 – 100 m²", color: "#F59E0B" },
      { label: "< 50 m²", color: "#22C55E" },
    ],
  },
  luasLahan: {
    label: "Luas Lahan",
    colorFn: (h) => {
      const v = h.luasLahan;
      if (!v) return "#9CA3AF";
      if (v > 200) return "#EF4444";
      if (v >= 100) return "#F59E0B";
      return "#22C55E";
    },
    legend: [
      { label: "> 200 m²", color: "#EF4444" },
      { label: "100 – 200 m²", color: "#F59E0B" },
      { label: "< 100 m²", color: "#22C55E" },
    ],
  },
  jumlahLantai: {
    label: "Tingkatan Rumah",
    colorFn: (h) => {
      const v = h.jumlahLantai;
      if (!v) return "#9CA3AF";
      if (v === 1) return "#A78BFA";
      if (v === 2) return "#7C3AED";
      return "#4C1D95";
    },
    legend: [
      { label: "Lantai 1", color: "#A78BFA" },
      { label: "Lantai 2", color: "#7C3AED" },
      { label: "Lantai 3+", color: "#4C1D95" },
    ],
  },
  jenisDinding: {
    label: "Jenis Dinding",
    colorFn: (h) => dindingColor(h.jenisDinding),
    legend: [
      { label: "Tembok", color: "#64748B" },
      { label: "Kayu", color: "#D97706" },
      { label: "Bambu/Seng", color: "#84CC16" },
    ],
  },
  jenisPlafon: {
    label: "Jenis Plafon",
    colorFn: (h) => {
      const v: string = (h.jenisPlafon ?? "").toLowerCase();
      if (v.includes("triplek") || v.includes("asbes") || v.includes("bambu")) return "#3B82F6";
      if (v.includes("pvc")) return "#10B981";
      if (v.includes("beton") || v.includes("plat")) return "#6B7280";
      if (v.includes("kayu") || v.includes("akustik") || v.includes("gypsum") || v.includes("kalsibor")) return "#F59E0B";
      return "#9CA3AF";
    },
    legend: [
      { label: "Triplek/Asbes/Bambu", color: "#3B82F6" },
      { label: "PVC", color: "#10B981" },
      { label: "Beton/Plat", color: "#6B7280" },
      { label: "Kayu/Gypsum/Kalsibor", color: "#F59E0B" },
      { label: "Tidak Ada/Lainnya", color: "#9CA3AF" },
    ],
  },
  jeniLantai: {
    label: "Jenis Lantai",
    colorFn: (h) => lantaiColor(h.jeniLantai),
    legend: [
      { label: "Keramik", color: "#3B82F6" },
      { label: "Marmer/Granit", color: "#8B5CF6" },
      { label: "Semen", color: "#F59E0B" },
      { label: "Kayu/Papan", color: "#78716C" },
    ],
  },
};

// Real RT/RW values from survey data
const RT_OPTIONS = ["1", "2", "3", "4", "5"];
const RW_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8"];

// ─── Component ───────────────────────────────────────────────────────────────

export default function SmartMap() {
  const [tampilan, setTampilan] = useState<Tampilan>("smartmap");

  // SMART MAP: multi-select — array of selected jenis keys
  const [smartJenisList, setSmartJenisList] = useState<string[]>(["perubahanPagar"]);
  // Klaster filter
  const [klasterFilter, setKlasterFilter] = useState<string>("all");
  // Tagging mode
  const [taggingMode, setTaggingMode] = useState<string>("luasBangunan");

  // Global filters
  const [filterRT, setFilterRT] = useState<string>("all");
  const [filterRW, setFilterRW] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Toggle a jenis key in/out of smartJenisList
  function toggleJenis(key: string) {
    setSmartJenisList((prev) => {
      if (prev.includes(key)) {
        // Don't allow deselecting all — keep at least 1
        if (prev.length === 1) return prev;
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  }

  // Build local filter params. The dataset is fixed, so no API request is needed.
  const queryParams: HouseFilters = useMemo(() => {
    const p: HouseFilters = {};
    if (filterRT !== "all") p.rt = filterRT;
    if (filterRW !== "all") p.rw = filterRW;
    if (tampilan === "klaster" && klasterFilter !== "all") p.klaster = klasterFilter;
    return p;
  }, [filterRT, filterRW, tampilan, klasterFilter]);

  const houses = useMemo(() => listHouses(queryParams), [queryParams]);
  const isHousesLoading = false;

  // Client-side text search
  const filteredHouses = useMemo(() => {
    if (!houses) return [];
    if (!search) return houses;
    const lower = search.toLowerCase();
    return houses.filter(
      (h) =>
        h.namaKepalaKeluarga?.toLowerCase().includes(lower) ||
        h.id.toLowerCase().includes(lower),
    );
  }, [houses, search]);

  // ── Color logic per tampilan ─────────────────────────────────────────────

  const { colorFn, colorByField, legend } = useMemo(() => {
    if (tampilan === "klaster") {
      return {
        colorByField: "klaster" as string | undefined,
        colorFn: (v: string) => klasterColor(v),
        legend: [
          { label: "K1 — Tidak ada perubahan", color: "#22C55E" },
          { label: "K2 — Perubahan sedang (1–2)", color: "#F59E0B" },
          { label: "K3 — Perubahan signifikan (≥3)", color: "#EF4444" },
        ],
      };
    }

    if (tampilan === "smartmap") {
      // Multi-select: house is red if ANY selected jenis is true
      const selectedConfigs = SMART_JENIS.filter((j) => smartJenisList.includes(j.key));
      const singleColor = selectedConfigs.length === 1 ? selectedConfigs[0].color : "#EF4444";

      return {
        colorByField: undefined as string | undefined,
        colorFn: (h: any) => {
          const matches = smartJenisList.some((k) => h[k] === true);
          return matches ? singleColor : "#9CA3AF";
        },
        legend: [
          ...selectedConfigs.map((c) => ({ label: c.label, color: singleColor })),
          { label: "Tidak Ada Perubahan", color: "#9CA3AF" },
        ].filter((item, idx, arr) =>
          // dedup label
          arr.findIndex((x) => x.label === item.label) === idx
        ),
      };
    }

    // tagging
    const mode = TAGGING_MODES[taggingMode];
    return {
      colorByField: undefined as string | undefined,
      colorFn: (h: any) => mode?.colorFn(h) ?? "#9CA3AF",
      legend: mode?.legend ?? [],
    };
  }, [tampilan, klasterFilter, smartJenisList, taggingMode]);

  // ── Dynamic Insight (client-side) ────────────────────────────────────────

  const insight = useMemo(() => {
    const total = filteredHouses.length;
    if (total === 0) return null;

    const rtLabel = filterRT !== "all" ? `RT ${filterRT}` : null;
    const rwLabel = filterRW !== "all" ? `RW ${filterRW}` : null;
    const lokasiLabel = rtLabel ?? rwLabel ?? "seluruh Kelurahan lagaligo";

    if (tampilan === "klaster") {
      const k1 = filteredHouses.filter((h) => h.klaster === "K1").length;
      const k2 = filteredHouses.filter((h) => h.klaster === "K2").length;
      const k3 = filteredHouses.filter((h) => h.klaster === "K3").length;
      const berubah = filteredHouses.filter((h) => h.statusPerubahan === "berubah").length;
      const persen = total > 0 ? Math.round((berubah / total) * 100) : 0;
      return {
        ringkasan: `Di ${lokasiLabel}, terdapat ${total} rumah terdata. ${berubah} rumah (${persen}%) mengalami perubahan.`,
        poin: [
          `K1 (tidak ada perubahan): ${k1} rumah (${Math.round((k1/total)*100)}%).`,
          `K2 (perubahan sedang, 1–2 jenis): ${k2} rumah (${Math.round((k2/total)*100)}%).`,
          `K3 (perubahan signifikan, ≥3 jenis): ${k3} rumah${k3 > 0 ? " — perlu perhatian khusus" : ""}.`,
        ],
      };
    }

    if (tampilan === "smartmap") {
      const selectedConfigs = SMART_JENIS.filter((j) => smartJenisList.includes(j.key));
      const matchAny = filteredHouses.filter((h) => smartJenisList.some((k) => (h as any)[k] === true)).length;
      const persen = total > 0 ? Math.round((matchAny / total) * 100) : 0;

      const selectedLabels = selectedConfigs.map((c) => c.label).join(", ");
      const poin: string[] = [];

      // Per-type breakdown
      selectedConfigs.forEach((c) => {
        const n = filteredHouses.filter((h) => (h as any)[c.key] === true).length;
        const p = total > 0 ? Math.round((n / total) * 100) : 0;
        poin.push(`${c.label}: ${n} rumah (${p}%) dari ${total} rumah terdata.`);
      });

      // RT breakdown jika tidak difilter RT
      if (filterRT === "all" && selectedConfigs.length === 1) {
        const key = selectedConfigs[0].key;
        const rwMap: Record<string, { n: number; total: number }> = {};
        filteredHouses.forEach((h) => {
          const rw = `RW ${h.rw}`;
          if (!rwMap[rw]) rwMap[rw] = { n: 0, total: 0 };
          rwMap[rw].total++;
          if ((h as any)[key]) rwMap[rw].n++;
        });
        const topRw = Object.entries(rwMap)
          .filter(([, v]) => v.n > 0)
          .sort(([, a], [, b]) => b.n - a.n)[0];
        if (topRw) {
          poin.push(`${topRw[0]} memiliki kasus ${selectedConfigs[0].label.toLowerCase()} terbanyak (${topRw[1].n} kasus).`);
        }
      }

      if (selectedConfigs.length > 1) {
        poin.push(`Total rumah dengan minimal satu perubahan yang dipilih: ${matchAny} rumah (${persen}%).`);
      }

      return {
        ringkasan: selectedConfigs.length === 1
          ? `Di ${lokasiLabel}, ${matchAny} dari ${total} rumah (${persen}%) mengalami ${selectedConfigs[0].label.toLowerCase()}.`
          : `Di ${lokasiLabel}, ${matchAny} dari ${total} rumah (${persen}%) mengalami salah satu dari: ${selectedLabels}.`,
        poin,
      };
    }

    // tagging
    const berubah = filteredHouses.filter((h) => h.statusPerubahan === "berubah").length;
    const persen = total > 0 ? Math.round((berubah / total) * 100) : 0;
    const mode = TAGGING_MODES[taggingMode];

    // Breakdown jumlah dan persentase mengikuti kategori legenda pada tagging mode aktif.
    const getTaggingCategory = (h: any): string => {
      switch (taggingMode) {
        case "luasBangunan": {
          const v = Number(h.luasBangunan);
          if (!v) return "Tidak Ada/Lainnya";
          if (v > 100) return "> 100 m²";
          if (v >= 50) return "50 – 100 m²";
          return "< 50 m²";
        }

        case "luasLahan": {
          const v = Number(h.luasLahan);
          if (!v) return "Tidak Ada/Lainnya";
          if (v > 200) return "> 200 m²";
          if (v >= 100) return "100 – 200 m²";
          return "< 100 m²";
        }

        case "jumlahLantai": {
          const v = Number(h.jumlahLantai);
          if (!v) return "Tidak Ada/Lainnya";
          if (v === 1) return "Lantai 1";
          if (v === 2) return "Lantai 2";
          return "Lantai 3+";
        }

        case "jenisDinding": {
          const v = String(h.jenisDinding ?? "").toLowerCase();
          if (v.includes("tembok")) return "Tembok";
          if (v.includes("kayu")) return "Kayu";
          if (v.includes("bambu") || v.includes("seng")) return "Bambu/Seng";
          return "Tidak Ada/Lainnya";
        }

        case "jenisPlafon": {
          const v = String(h.jenisPlafon ?? "").toLowerCase();
          if (v.includes("triplek") || v.includes("asbes") || v.includes("bambu")) {
            return "Triplek/Asbes/Bambu";
          }
          if (v.includes("pvc")) return "PVC";
          if (v.includes("beton") || v.includes("plat")) return "Beton/Plat";
          if (
            v.includes("kayu") ||
            v.includes("akustik") ||
            v.includes("gypsum") ||
            v.includes("kalsibor")
          ) {
            return "Kayu/Gypsum/Kalsibor";
          }
          return "Tidak Ada/Lainnya";
        }

        case "jeniLantai": {
          const v = String(h.jeniLantai ?? "").toLowerCase();
          if (v === "keramik") return "Keramik";
          if (v.includes("marmer") || v.includes("granit")) return "Marmer/Granit";
          if (v === "semen") return "Semen";
          if (v.includes("kayu") || v.includes("papan")) return "Kayu/Papan";
          return "Tidak Ada/Lainnya";
        }

        default:
          return "Tidak Ada/Lainnya";
      }
    };

    const categoryCounts: Record<string, number> = {};
    filteredHouses.forEach((h) => {
      const category = getTaggingCategory(h);
      categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
    });

    const breakdown = (mode?.legend ?? []).map((item) => {
      const n = categoryCounts[item.label] ?? 0;
      const p = total > 0 ? ((n / total) * 100).toFixed(1) : "0.0";
      return `${item.label}: ${n} rumah (${p}%).`;
    });

    return {
      ringkasan: `Di ${lokasiLabel}, ${total} rumah ditampilkan berdasarkan ${mode?.label ?? taggingMode}.`,
      poin: [
        ...breakdown,
        `${berubah} rumah (${persen}%) dari ${total} yang ditampilkan pernah mengalami perubahan.`,
      ],
    };
  }, [filteredHouses, tampilan, smartJenisList, filterRT, filterRW, taggingMode]);

  const tampilanLabel =
    tampilan === "klaster" ? "Peta Klasterisasi"
    : tampilan === "smartmap" ? "SMART MAP"
    : "Peta Tagging Location";

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <MapIcon className="w-8 h-8 text-primary" /> Smart Map
        </h1>
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">
          Analisis Spasial Interaktif — {tampilanLabel}
        </p>
      </div>

      {/* Controls Bar */}
      <Card className="shadow-sm border-border">
        <CardContent className="p-4 space-y-4">

          {/* Row 1: RT / RW / Search / Switch Tampilan */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* RT */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Filter RT</label>
              <Select value={filterRT} onValueChange={setFilterRT}>
                <SelectTrigger><SelectValue placeholder="Semua RT" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua RT</SelectItem>
                  {RT_OPTIONS.map((rt) => (
                    <SelectItem key={rt} value={rt}>RT {rt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* RW */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Filter RW</label>
              <Select value={filterRW} onValueChange={setFilterRW}>
                <SelectTrigger><SelectValue placeholder="Semua RW" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua RW</SelectItem>
                  {RW_OPTIONS.map((rw) => (
                    <SelectItem key={rw} value={rw}>RW {rw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pencarian */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Pencarian</label>
              <div className="relative">
                <Input
                  placeholder="Cari Nama KK..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              </div>
            </div>

            {/* Switch Tampilan */}
            <div className="space-y-1.5 border-l pl-4">
              <label className="text-xs font-semibold uppercase text-primary">Switch Tampilan</label>
              <Select value={tampilan} onValueChange={(v) => setTampilan(v as Tampilan)}>
                <SelectTrigger className="border-primary/50 bg-primary/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="klaster">Peta Klasterisasi</SelectItem>
                  <SelectItem value="smartmap">SMART MAP</SelectItem>
                  <SelectItem value="tagging">Peta Tagging Location</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Sub-filter per tampilan */}
          {tampilan === "klaster" && (
            <div className="space-y-1.5 border-t pt-3">
              <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                <Filter className="w-3 h-3" /> Filter Klaster
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "all", label: "Semua" },
                  { value: "K1", label: "K1 — Tidak ada perubahan" },
                  { value: "K2", label: "K2 — Perubahan sedang" },
                  { value: "K3", label: "K3 — Perubahan signifikan" },
                ].map((opt) => (
                  <Button
                    key={opt.value}
                    size="sm"
                    variant={klasterFilter === opt.value ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => setKlasterFilter(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {tampilan === "smartmap" && (
            <div className="space-y-1.5 border-t pt-3">
              <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                <Filter className="w-3 h-3" /> Filter Jenis Perubahan
                <span className="text-[10px] font-normal normal-case text-muted-foreground/70 ml-1">(pilih satu atau lebih)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SMART_JENIS.map((j) => {
                  const isActive = smartJenisList.includes(j.key);
                  return (
                    <button
                      key={j.key}
                      onClick={() => toggleJenis(j.key)}
                      className={`
                        inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all
                        ${isActive
                          ? "text-white border-transparent shadow-sm"
                          : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
                        }
                      `}
                      style={isActive ? { backgroundColor: j.color, borderColor: j.color } : {}}
                    >
                      {isActive ? (
                        <Check className="w-3 h-3 shrink-0" />
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-current opacity-40 shrink-0" />
                      )}
                      {j.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tampilan === "tagging" && (
            <div className="space-y-1.5 border-t pt-3">
              <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                <Filter className="w-3 h-3" /> Warna Marker Berdasarkan
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(TAGGING_MODES).map(([key, mode]) => (
                  <Button
                    key={key}
                    size="sm"
                    variant={taggingMode === key ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => setTaggingMode(key)}
                  >
                    {mode.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Map */}
        <div className="lg:col-span-2 relative min-h-[500px] h-[calc(100vh-360px)] border rounded-md shadow-sm overflow-hidden bg-card">
          {isHousesLoading ? (
            <Skeleton className="w-full h-full rounded-md" />
          ) : (
            <LeafletMapEngine
              data={filteredHouses}
              height="100%"
              colorByField={colorByField}
              colorMap={colorFn as any}
              legend={legend}
              popupContent={(h) => (
                <div className="space-y-3 w-[260px]">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-sm leading-tight text-foreground">{h.namaKepalaKeluarga}</div>
                      <div className="text-xs text-muted-foreground font-mono">RT {h.rt} / RW {h.rw}</div>
                    </div>
                    <Badge
                      variant={h.statusPerubahan === "berubah" ? "destructive" : "outline"}
                      className="text-[10px] uppercase"
                    >
                      {h.statusPerubahan.replace("_", " ")}
                    </Badge>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
                    <div className="text-muted-foreground">Luas Bgn:</div>
                    <div className="font-medium text-right">{h.luasBangunan ? `${h.luasBangunan} m²` : "—"}</div>
                    <div className="text-muted-foreground">Luas Lahan:</div>
                    <div className="font-medium text-right">{h.luasLahan ? `${h.luasLahan} m²` : "—"}</div>
                    <div className="text-muted-foreground">Lantai:</div>
                    <div className="font-medium text-right">{h.jeniLantai || "—"} ({h.jumlahLantai || "—"} Lt)</div>
                    <div className="text-muted-foreground">Dinding:</div>
                    <div className="font-medium text-right">{h.jenisDinding || "—"}</div>
                    <div className="text-muted-foreground">Pagar:</div>
                    <div className="font-medium text-right">{h.pagar || "—"}</div>
                  </div>

                  <Separator />

                  <a
                    href={`https://www.google.com/maps?q=${h.lat},${h.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                  >
                    📍 Buka di Google Maps
                  </a>

                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                      Status Perubahan
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {[
                        { label: "Pagar", changed: h.perubahanPagar },
                        { label: "Luas Bangunan", changed: h.perubahanLuasBangunan },
                        { label: "Luas Lahan", changed: h.perubahanLuasLahan },
                        { label: "Jumlah Lantai", changed: h.perubahanJumlahLantai },
                      ].map((ind) => (
                        <div key={ind.label} className="flex items-center justify-between text-xs">
                          <span className={ind.changed ? "text-destructive font-medium" : "text-muted-foreground"}>
                            {ind.label}
                          </span>
                          {ind.changed ? (
                            <Check className="w-3.5 h-3.5 text-destructive" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-muted-foreground/50" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            />
          )}
        </div>

        {/* Sidebar: Insight */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-primary text-primary-foreground border-none shadow-md overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Info className="w-4 h-4" /> Insight — {tampilanLabel}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Count badge */}
              <div className="flex items-center gap-3 bg-primary-foreground/10 rounded-md p-3">
                <Building2 className="w-8 h-8 text-primary-foreground/80" />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/70">
                    Menampilkan
                  </div>
                  <div className="text-2xl font-bold font-mono">
                    {isHousesLoading ? "..." : filteredHouses.length}
                    <span className="text-sm font-sans font-normal text-primary-foreground/80 ml-1">rumah</span>
                  </div>
                  {(filterRT !== "all" || filterRW !== "all") && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {filterRT !== "all" && (
                        <span className="text-[10px] bg-primary-foreground/20 px-1.5 py-0.5 rounded font-mono">RT {filterRT}</span>
                      )}
                      {filterRW !== "all" && (
                        <span className="text-[10px] bg-primary-foreground/20 px-1.5 py-0.5 rounded font-mono">RW {filterRW}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Legend */}
              {legend.length > 0 && (
                <>
                  <Separator className="bg-primary-foreground/20" />
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/70">Legenda</p>
                    {legend.map((item) => (
                      <div key={item.label} className="flex items-center gap-2 text-xs text-primary-foreground/90">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.label}
                      </div>
                    ))}
                  </div>
                </>
              )}

              <Separator className="bg-primary-foreground/20" />

              {/* Dynamic insight */}
              {isHousesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full bg-primary-foreground/20" />
                  <Skeleton className="h-4 w-5/6 bg-primary-foreground/20" />
                  <Skeleton className="h-4 w-4/6 bg-primary-foreground/20" />
                </div>
              ) : insight ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium leading-relaxed">{insight.ringkasan}</p>
                  <ul className="space-y-2">
                    {insight.poin.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-primary-foreground/90">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-sm text-primary-foreground/70">Tidak ada data.</div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
